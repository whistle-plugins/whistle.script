const WebSocket = require('ws');
const co = require('co');
const util = require('./util');
const scripts = require('./scripts');


module.exports = (server, options) => {
  const wss = new WebSocket.Server({ server });
  wss.on('connection', (ws, req) => {
    const ctx = ws;
    ctx.url = req.url;
    ctx.fullUrl = decodeURIComponent(req.headers[options.FULL_URL_HEADER]);
    ctx.headers = req.headers;
    ctx.options = options;
    let handleRequest;
    const { handleWebsocket, handleWebSocket } = scripts.getHandler(ctx);
    if (util.isFunction(handleWebSocket)) {
      handleRequest = handleWebSocket;
    } else if (util.isFunction(handleWebsocket)) {
      handleRequest = handleWebsocket;
    }
    let res;
    const next = () => {

    };
    co(function* () {
      if (handleRequest) {
        yield handleRequest(ctx, next);
      } else {
        yield next();
      }
    });
  });
};
