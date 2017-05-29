const Koa = require('koa');
const co = require('co');
const util = require('./util');
const scripts = require('./scripts');

module.exports = function (server, options) {
  const app = new Koa();
  app.use(function* () {
    this.options = options;
    const { handleWebSocket, handleWebsocket, handleRequestRules }
      = scripts.getHandler(this) || {};
    const fullUrl = util.getValueFromHeaders(this, options.FULL_URL_HEADER);
    this.fullUrl = fullUrl;
    this.curRule = util.getValueFromHeaders(this, options.FULL_URL_HEADER);
    this.curHost = util.getValueFromHeaders(this, options.FULL_URL_HEADER);
    this.curProxy = util.getValueFromHeaders(this, options.FULL_URL_HEADER);
    let reqRulesHandler;
    if (/^ws/.test(fullUrl)) {
      if (util.isFunction(handleWebSocket)) {
        reqRulesHandler = handleWebSocket;
      } else if (util.isFunction(handleWebsocket)) {
        reqRulesHandler = handleWebsocket;
      }
    } else if (util.isFunction(handleRequestRules)) {
      reqRulesHandler = handleRequestRules;
    }
    if (reqRulesHandler) {
      yield co.wrap(reqRulesHandler)(this);
      if (!this.body && (this.rules || this.values)) {
        this.body = {
          rules: Array.isArray(this.rules) ? this.rules.join('\n') : `${this.rules}`,
          values: this.values,
        };
      }
    }
  });
  server.on('request', app.callback());
};
