const WebSocket = require('ws');
const co = require('co');
const urlParse = require('url').parse;
const util = require('./util');
const scripts = require('./scripts');

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

module.exports = (server, options) => {
  const wss = new WebSocket.Server({ server });
  wss.on('connection', (ws, req) => {
    const { url, headers } = req;
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
    let hasError;
    req.on('error', (err) => {
      req.close();
      if (!hasError && req.autoClose !== false && res) {
        hasError = true;
        res.emit('error', err);
      }
    });
    req.on('close', () => {
      if (req.autoClose !== false && res) {
        setTimeout(() => res.close(), 3000);
      }
    });
    let reqPromise;
    const connect = (...args) => {
      if (!reqPromise) {
        let opts = util.parseArguments(args);
        opts = Object.assign(util.getCustomHost(req.headers, options), opts);
        reqPromise = new Promise((resolve, reject) => {
          delete headers['sec-websocket-key'];
          res = new WebSocket(setHost(req.fullUrl, opts), {
            headers: util.clearWhistleHeaders(headers, options),
            rejectUnauthorized: false,
          });
          wrap(res);
          res.on('error', (err) => {
            res.close();
            if (!hasError && req.autoClose !== false) {
              hasError = true;
              req.emit('error', err);
            }
            reject(err);
          });
          res.on('close', () => {
            if (req.autoClose !== false) {
              setTimeout(() => res.close(), 3000);
            }
          });
          res.on('open', () => resolve(res));
        });
      }
      return reqPromise;
    };
    co(function* () {
      if (handleRequest) {
        try {
          yield handleRequest(req, connect);
        } catch (err) {
          req.emit('error', err);
        }
      } else {
        try {
          let cache = [];
          req.on('message', data => cache.push(data));
          yield connect();
          cache.forEach(data => res.send(data));
          cache = null;
          req.pipe(res).pipe(req);
        } catch (err) {
          req.emit('error', err);
        }
      }
    });
  });
};
