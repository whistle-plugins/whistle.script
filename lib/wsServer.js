const urlParse = require('url').parse;
const crypto = require('crypto');
const {
  getRawHeaderNames,
  formatHeaders,
  getRawHeaders,
} = require('hparser');
const WebSocket = require('./WebSocket');
const WebSocketServer = require('./WebSocketServer');
const util = require('./util');
const agent = require('./agent');
const scripts = require('./scripts');
const pkg = require('../package.json');

const {
  resHeaders,
  resRawHeaders,
  getDataSource,
} = util;

const restoreHeaders = (req) => {
  const rawHeaders = req.rawHeaders && getRawHeaderNames(req.rawHeaders);
  return formatHeaders(req.headers, rawHeaders);
};

/* eslint-disable no-empty */
const wrap = (ws) => {
  const { send } = ws;
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
  let { host } = opts;
  if (host || opts.port > 0) {
    const urlOpts = urlParse(fullUrl);
    host = host || urlOpts.hostname;
    const port = opts.port || urlOpts.port;
    if (port) {
      host = `${host}:${port}`;
    }
    fullUrl = fullUrl.replace(/\/\/[^/]+/, `//${host}`);
  }
  return fullUrl.replace(/^ws/, 'http');
};

const autoClose = (req, res) => {
  if (req.autoClose === false) {
    return;
  }
  const closeAll = () => {
    setTimeout(() => {
      req.close();
      res.close();
    }, 1000);
  };
  req.on('error', closeAll);
  req.on('close', closeAll);
  res.on('error', closeAll);
  res.on('close', closeAll);
};

const getFn = (f1, f2) => {
  if (util.isFunction(f1)) {
    return f1;
  } if (util.isFunction(f2)) {
    return f2;
  }
};

const handleError = (socket, err) => {
  const body = String(err.stack || '');
  const length = Buffer.byteLength(body);
  socket.write(`HTTP/1.1 502 Bad Gateway\r\nServer: whistle.script\r\nContent-length: ${length}\r\n\r\n${body}`);
};

module.exports = (server, options) => {
  const wss = new WebSocketServer({ noServer: true });
  server.on('upgrade', async (req, socket, head) => {
    req.options = options;
    let handleRequest;
    const {
      handleWebsocketRaw,
      handleWebSocketRaw,
      handleWebsocket,
      handleWebSocket,
    } = scripts.getHandler(req);
    handleRequest = getFn(handleWebSocketRaw, handleWebsocketRaw);
    if (handleRequest) {
      const { dataSource, clearup } = getDataSource();
      let replied;
      req.on('error', clearup);
      req.dataSource = dataSource;
      req.connect = opts => new Promise((resolve, reject) => {
        const client = req.request(opts, resolve) || req;
        client.on('error', reject);
      });
      req.reply = (res) => {
        if (replied) {
          return;
        }
        replied = true;
        let data;
        if (res) {
          data = [
            `HTTP/1.1 ${res.statusCode} ${res.statusMessage}`,
            getRawHeaders(restoreHeaders(res)),
            '\r\n',
          ];
        } else {
          const { headers } = req;
          const protocol = (headers['sec-websocket-protocol'] || '').split(/, */)[0];
          data = ['HTTP/1.1 101 Switching Protocols'];
          if (protocol) {
            data.push(`Sec-WebSocket-Protocol: ${protocol}`);
          }
          let key = `${headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`;
          key = crypto.createHash('sha1').update(key, 'binary').digest('base64');
          data.push(`Sec-WebSocket-Accept: ${key}`);
          data.push('Upgrade: websocket');
          data.push('Connection: Upgrade');
          data.push('\r\n');
        }
        socket.write(data.join('\r\n'));
      };
      try {
        await handleRequest(req, socket, options);
        req.reply();
      } catch (err) {
        clearup();
        handleError(socket, err);
      }
      return;
    }
    handleRequest = getFn(handleWebSocket, handleWebsocket);
    if (!handleRequest) {
      return req.passThrough();
    }
    req.handleRequest = handleRequest;
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });
  wss.on('connection', async (ws, req) => {
    const origReq = req;
    const { url, headers, response, send, handleRequest } = req;
    const { dataSource, clearup } = getDataSource();
    req.send = (...args) => {
      response();
      send.apply(req, args);
    };
    ws = wrap(ws);
    ws.req = req;
    ws.dataSource = dataSource;
    ws.url = url;
    ws.headers = headers;
    ws.fullUrl = decodeURIComponent(headers[options.FULL_URL_HEADER]);
    ws.options = options;
    let res;
    ws.on('error', clearup);
    ws.on('close', clearup);
    ws.on('error', response);
    let reqPromise;
    const connect = (opts) => {
      if (!reqPromise) {
        opts = util.parseOptions(opts);
        reqPromise = new Promise((resolve, reject) => {
          delete headers['sec-websocket-key'];
          let wsAgent;
          if (opts.proxyUrl) {
            const isHttps = /^wss:/.test(ws.fullUrl);
            opts.headers = {
              'proxy-connection': 'keep-alive',
              'user-agent': headers['user-agent'] || `whistle.script/${pkg.version}`,
            };
            wsAgent = isHttps ? agent.getHttpsAgent(opts) : agent.getHttpAgent(opts);
          }
          const protocols = [headers['sec-websocket-protocol'] || ''];
          res = new WebSocket(setHost(ws.fullUrl, opts), protocols, {
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
          res.on('error', reject);
          res.on('error', response);
          res.on('open', () => {
            response();
            autoClose(ws, res);
            resolve(res);
          });
        });
      }
      return reqPromise;
    };
    try {
      await handleRequest(ws, connect);
      response();
    } catch (err) {
      ws.emit('error', err);
    }
  });
};
