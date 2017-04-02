const Koa = require('koa');
const co = require('co');
const onerror = require('koa-onerror');
const url = require('url');
const Stream = require('stream');
const scripts = require('./scripts');
const util = require('./util');

const reqPromise = Symbol('reqPromise');

module.exports = function (server, options) {
  const app = new Koa();
  onerror(app);
  app.use(function* (next) {
    const req = this.req;
    const { name, value } = util.parseRuleValue(req, options);
    const { HttpRequest } = util.execScript(scripts.get(name), value) || {};
    this.fullUrl = util.getFullUrl(req, options);
    req.body = req;
    this.customHost = util.getHost(req, options);
    util.clearCustomHeaders(req, options);
    if (typeof HttpRequest !== 'function') {
      return yield next;
    }
    const handler = this.handler = new HttpRequest();
    if (typeof handler.request !== 'function') {
      return yield next;
    }
    this.getBodyBuffer = () => {
      if (!this[reqPromise]) {
        this[reqPromise] = util.getStreamBuffer(req);
      }
      return this[reqPromise];
    };
    yield co.wrap(handler.request).call(handler, this);
    delete this.getBodyBuffer;
    if (!this.response._explicitStatus) {
      yield next;
    }
  });
  app.use(function* () {
    const reqOptions = url.parse(this.fullUrl);
    const hostOptions = util.parseHost(this.customHost);
    reqOptions.headers = this.headrs || {};
    delete reqOptions.hostname;
    reqOptions.method = this.method;
    reqOptions.headrs.host = reqOptions.host;
    if (hostOptions) {
      reqOptions.host = hostOptions.host;
      if (hostOptions.port) {
        reqOptions.port = hostOptions.port;
      }
    }
    const req = this.req;
    let body = req.body;
    if (body !== req) {
      yield util.getStreamBuffer(req);
      req.removeHeader('transfer-encoding');
      req.removeHeader('content-encoding');
      req.removeHeader('content-length');
      if (body && !(body instanceof Stream) && !Buffer.isBuffer(body)) {
        body = JSON.stringify(body);
      }
    } else if (this[reqPromise]) {
      body = yield this[reqPromise];
    }
    const res = yield util.request(body, reqOptions);
    this.status = res.statusCode;
    this.set(res.headers);
    this.res.headers = res.headers;
    this.body = res;
    const { response } = this.handler || {};
    if (typeof response === 'function') {
      let resPromise;
      this.getBodyBuffer = () => {
        if (!resPromise) {
          resPromise = util.getStreamBuffer(res);
        }
        return resPromise;
      };
      yield co.wrap(response).call(this.handler, this);
      if (this.body !== res) {
        this.res.removeHeader('content-encoding');
        this.res.removeHeader('transfer-encoding');
        yield this.getBodyBuffer();
      } else if (resPromise) {
        this.body = yield resPromise;
      }
    }
  });
  server.on('request', app.callback());
};
