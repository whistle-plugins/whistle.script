const WebSocket = require('ws');
const co = require('co');
const util = require('./util');
const scripts = require('./scripts');

const transform = (req, res) => {
  req.on('message', (data) => {
    res.send(data, util.noop);
  });
  res.on('message', (data) => {
    req.send(data, util.noop);
  });
  const close = () => {
    req.close();
    res.close();
  };
  req.on('error', close);
  req.on('close', close);
  res.on('error', close);
  res.on('close', close);
};

module.exports = (server, options) => {
  const wss = new WebSocket.Server({ server });
  wss.on('connection', (ws, req) => {
    const { url, headers } = req;
    req = ws;
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
    req.on('error', () => {
      req.close();
    });
    const connect = () => {
      return new Promise((resolve, reject) => {
        delete headers['sec-websocket-key'];
        res = new WebSocket(req.fullUrl, {
          headers,
          rejectUnauthorized: false,
        });
        res.on('error', (err) => {
          res.close();
          reject(err);
        });
        res.on('open', () => resolve(res));
      });
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
          yield connect();
          transform(req, res);
        } catch (err) {
          req.emit('error', err);
        }
      }
    });
  });
};
