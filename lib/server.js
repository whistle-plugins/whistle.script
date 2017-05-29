const Koa = require('koa');
const co = require('co');
const onerror = require('koa-onerror');
const url = require('url');
const Stream = require('stream');
const scripts = require('./scripts');
const setupWsServer = require('./wsServer');
const util = require('./util');

const reqPromise = Symbol('reqPromise');
const httpRequest = Symbol('httpRequest');

module.exports = (server, options) => {
  setupWsServer(server, options);
  const app = new Koa();
  onerror(app);
  app.use(function* () {
    const req = this.req;
    const { name, value } = util.parseRuleValue(req, options);
    const { HttpRequest } = util.execScript(scripts.get(name), value) || {};
    this.fullUrl = util.getFullUrl(req, options);
    req.body = req;
    this.customHost = util.getHost(req, options);
    const next = () => {
      const reqOptions = url.parse(this.fullUrl);
      const hostOptions = util.parseHost(this.customHost);
      reqOptions.headers = this.headrs || {};
      delete reqOptions.hostname;
      reqOptions.method = this.method;
      reqOptions.headers.host = reqOptions.host;
      if (hostOptions) {
        reqOptions.host = hostOptions.host;
        if (hostOptions.port) {
          reqOptions.port = hostOptions.port;
        }
      }
      return co(function* () {
        let body = req.body;
        if (body !== req) {
          yield util.getStreamBuffer(req);
          delete req.headers['transfer-encoding'];
          delete req.headers['content-encoding'];
          delete req.headers['content-length'];
          if (body && !(body instanceof Stream) && !Buffer.isBuffer(body)) {
            body = JSON.stringify(body);
          }
        } else if (this[reqPromise]) {
          body = yield this[reqPromise];
        }
        util.clearCustomHeaders(req, options);
        const res = yield util.request(body, reqOptions);
        const { response } = this[httpRequest] || {};
        this.status = res.statusCode;
        this.set(res.headers);
        this.body = res;
        this.res.headers = res.headers;
        if (util.isFunction(response)) {
          let resPromise;
          this.getBodyBuffer = () => {
            if (!resPromise) {
              resPromise = util.getStreamBuffer(res);
            }
            return resPromise;
          };
          yield co.wrap(response).call(this[httpRequest], this);
          if (this.body !== res) {
            this.res.removeHeader('content-encoding');
            this.res.removeHeader('transfer-encoding');
            yield this.getBodyBuffer();
          } else if (resPromise) {
            this.body = yield resPromise;
          }
        }
      });
    };
    if (typeof HttpRequest !== 'function') {
      return yield next();
    }
    const handler = this[httpRequest] = new HttpRequest();
    if (typeof handler.request !== 'function') {
      return yield next();
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
      yield next();
    }
  });
  server.on('request', app.callback());
};
