const Koa = require('koa');
const co = require('co');
const onerror = require('koa-onerror');
const scripts = require('./scripts');
const setupWsServer = require('./wsServer');
const util = require('./util');

module.exports = (server, options) => {
  setupWsServer(server, options);
  const app = new Koa();
  onerror(app);
  app.use(function* () {
    const ctx = this;
    util.setupContext(ctx, options);
    let res;
    const next = () => {
      return util.request(ctx).then((svrRes) => {
        res = svrRes;
        return svrRes;
      });
    };
    const { handleRequest } = scripts.getHandler(ctx);
    if (util.isFunction(handleRequest)) {
      yield co.wrap(handleRequest)(ctx, next);
      ctx.remove('content-length');
      ctx.remove('transfer-encoding');
      if (res && ctx.body !== res) {
        ctx.remove('content-encoding');
      }
    } else {
      yield next();
    }
  });
  server.on('request', app.callback());
};
