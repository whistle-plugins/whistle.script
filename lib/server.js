const Koa = require('koa');
const co = require('co');
const onerror = require('koa-onerror');
const scripts = require('./scripts');
const util = require('./util');

module.exports = function (server, options) {
  const app = new Koa();
  onerror(app);
  app.use(function* (next) {
    const { name, value } = util.parseRuleValue(this.request, options);
    const { HttpRequest } = util.execScript(scripts.get(name), value) || {};
    const fullUrl = util.getValueFromHeaders(this.request, options.FULL_URL_HEADER);
    if (typeof HttpRequest !== 'function') {
      return yield next;
    }
    const handler = this.handler = new HttpRequest(fullUrl);
    if (typeof handler.request !== 'function') {
      return yield next;
    }
    const req = this.request;
    this.getBodyBuffer = () => {
      if (!this.reqPromise) {
        this.reqPromise = new Promise((resolve, reject) => {
          resolve('test');
        });
      }
      return this.reqPromise;
    };
    yield co.wrap(handler.request).call(handler, this);
    delete this.getBodyBuffer;
    if (this.res.statusCode) {
      return;
    }
    yield next;
  });
  app.use(function* () {
    
    const { response } = this.handler || {};
    if (typeof response !== 'function') {
      return;
    }

  });
  server.on('request', app.callback());
};
