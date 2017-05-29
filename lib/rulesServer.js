const Koa = require('koa');
const co = require('co');
const util = require('./util');
const scripts = require('./scripts');

module.exports = (server, options) => {
  const app = new Koa();
  app.use(function* () {
    util.setupContext(this, options);
    const { handleWebSocket, handleWebsocket, handleRequestRules }
      = scripts.getHandler(this);
    let handleReqRules;
    if (/^ws/.test(this.fullUrl)) {
      if (util.isFunction(handleWebSocket)) {
        handleReqRules = handleWebSocket;
      } else if (util.isFunction(handleWebsocket)) {
        handleReqRules = handleWebsocket;
      }
    } else if (util.isFunction(handleRequestRules)) {
      handleReqRules = handleRequestRules;
    }
    if (handleReqRules) {
      yield co.wrap(handleReqRules)(this);
      util.responseRules(this);
    }
  });
  server.on('request', app.callback());
};
