const Koa = require('koa');
const co = require('co');
const onerror = require('koa-onerror');
const qs = require('querystring');
const iconv = require('iconv-lite');
const scripts = require('./scripts');
const setupWsServer = require('./wsServer');
const util = require('./util');

const body = Symbol('body');
const text = Symbol('text');
const getBody = (stream) => {
  let result = stream[body];
  if (!result) {
    result = stream[body] = util.getStreamBuffer(stream);
  }
  return result;
};
const getText = (stream) => {
  let result = stream[text];
  if (!result) {
    result = stream[text] = getBody(stream).then((buf) => {
      return buf ? iconv.decode(buf, util.getCharset(stream.headers)) : '';
    });
  }
  return result;
};

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
        const getResBody = () => {
          return getBody(res);
        };
        const getResText = () => {
          return getText(res);
        };
        ctx.getResBody = getResBody;
        ctx.getResText = getResText;
        return svrRes;
      });
    };
    const { handleRequest } = scripts.getHandler(ctx);
    if (util.isFunction(handleRequest)) {
      const { search } = ctx.reqOptions;
      ctx.query = search ? qs.parse(search.slice(1)) : {};
      const getReqBody = () => {
        return getBody(ctx.req);
      };
      const getReqText = () => {
        return getText(ctx.req);
      };
      ctx.getReqBody = getReqBody;
      ctx.getReqText = getReqText;
      ctx.getReqForm = () => {
        if (!/application\/x-www-form-urlencoded/i.test(ctx.get('content-type'))) {
          return Promise.resolve({});
        }
        return getReqText().then(qs.parse);
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
