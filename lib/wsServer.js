const WebSocket = require('./WebSocket');
const WebSocketServer = require('./WebSocketServer');
const co = require('co');
const urlParse = require('url').parse;
const util = require('./util');
const agent = require('./agent');
const scripts = require('./scripts');
const pkg = require('../package');

const { resHeaders, resRawHeaders } = util;
/* eslint-disable no-empty */
const wrap = (ws) => {
  const send = ws.send;
  ws.send = function (...args) {
    try {
      return send.apply(this, args);
    } catch (err) {}
  };
  ws.pipe = (dest) => {
    ws.on('message', data => dest.send(data));
    return dest;
  };
  return ws;
};
const setHost = (fullUrl, opts) => {
  let host = opts.host;
  if (host || opts.port > 0) {
    const urlOpts = urlParse(fullUrl);
    host = host || urlOpts.hostname;
    const port = opts.port || urlOpts.port;
    if (port) {
      host = `${host}:${opts.port}`;
    }
    fullUrl = fullUrl.replace(/\/\/[^/]+/, `//${host}`);
  }
  return fullUrl;
};

const autoClose = (req, res) => {
  if (req.autoClose === false) {
    return;
  }
  const closeAll = () => {
    try {
      setTimeout(() => {
        req.close();
        res.close();
      }, 1000);
    } catch (err) {}
  };
  req.on('error', closeAll);
  req.on('close', closeAll);
  res.on('error', closeAll);
  res.on('error', closeAll);
};

module.exports = (server, options) => {
  const wss = new WebSocketServer({ server });
  wss.on('connection', (ws, req) => {
    const origReq = req;
    const { url, headers, response } = req;
    const send = req.send;
    req.send = (...args) => {
      response();
      send.apply(req, args);
    };
    req = wrap(ws);
    req.url = url;
    req.headers = headers;
    req.fullUrl = decodeURIComponent(headers[options.FULL_URL_HEADER]);
    req.options = options;
    let handleRequest;
    const { handleWebsocket, handleWebSocket } = scripts.getHandler(req);
    if (util.isFunction(handleWebSocket)) {
      handleRequest = handleWebSocket;
    } else if (util.isFunction(handleWebsocket)) {
      handleRequest = handleWebsocket;
    }
    let res;
    req.on('error', response);
    let reqPromise;
    const connect = (opts) => {
      if (!reqPromise) {
        opts = util.parseOptions(opts);
        opts = Object.assign(util.getCustomRules(req.headers, options), opts);
        reqPromise = new Promise((resolve) => {
          delete headers['sec-websocket-key'];
          let wsAgent;
          if (opts.proxyUrl) {
            const isHttps = /^wss:/.test(req.fullUrl);
            opts.headers = {
              'proxy-connection': 'keep-alive',
              'user-agent': headers['user-agent'] || `whistle.script/${pkg.version}`,
            };
            wsAgent = isHttps ? agent.getHttpsAgent(opts) : agent.getHttpAgent(opts);
          }
          res = new WebSocket(setHost(req.fullUrl, opts), {
            headers: util.clearWhistleHeaders(headers, options),
            rejectUnauthorized: false,
            agent: wsAgent,
          });
          res.headers = {};
          res.on('headers', (h, r) => {
            res.headers = h;
            origReq[resHeaders] = h;
            const { rawHeaders } = r || {};
            origReq[resRawHeaders] = {};
            if (Array.isArray(rawHeaders)) {
              for (let i = 0; i < rawHeaders.length; i += 2) {
                const name = rawHeaders[i];
                if (typeof name === 'string') {
                  origReq[resRawHeaders][name.toLowerCase()] = name;
                }
              }
            }
          });
          wrap(res);
          res.on('error', response);
          res.on('open', () => {
            response();
            autoClose(req, res);
            resolve(res);
          });
        });
      }
      return reqPromise;
    };
    co(function* () {
      if (handleRequest) {
        try {
          yield handleRequest(req, connect);
          response();
        } catch (err) {
          req.emit('error', err);
        }
      } else {
        try {
          yield connect();
          req.pipe(res).pipe(req);
        } catch (err) {
          req.emit('error', err);
        }
      }
    });
  });
};
