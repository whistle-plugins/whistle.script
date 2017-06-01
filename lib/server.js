const Koa = require('koa');
const co = require('co');
const onerror = require('koa-onerror');
const qs = require('querystring');
const iconv = require('iconv-lite');
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
      const { search } = ctx.reqOptions;
      ctx.query = search ? qs.parse(search.slice(1)) : {};
      let body;
      const getReqBody = () => {
        body = body || util.getStreamBuffer(ctx.req);
        return body;
      };
      const getReqText = () => {
        return getReqBody().then((buf) => {
          return buf ? iconv.decode(buf, util.getCharset(ctx)) : '';
        });
      };
      ctx.getReqBody = getReqBody;
      ctx.getReqText = getReqText;
      ctx.getReqForm = () => {
        if (!/application\/x-www-form-urlencoded/i.test(ctx.get('content-type'))) {
          return Promise.resolve({});
        }
        return getReqText().then((text) => {
          return qs.parse(text);
        });
      };

      yield co.wrap(handleRequest)(ctx, next);
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
