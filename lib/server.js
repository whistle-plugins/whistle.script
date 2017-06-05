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
  if (!util.isText(stream.headers)) {
    return Promise.resolve(null);
  }
  let result = stream[text];
  if (!result) {
    result = stream[text] = getBody(stream).then((buf) => {
      return buf ? iconv.decode(buf, util.getCharset(stream.headers)) : '';
    });
  }
  return result;
};

module.exports = (server, options) => {
  const app = new Koa();
  onerror(app);
  app.use(function* () {
    const ctx = this;
    util.setupContext(ctx, options);
    let resPromise;
    const next = (...args) => {
      if (!resPromise) {
        let opts = util.parseArguments(args);
        opts = Object.assign(util.getCustomHost(ctx.headers, options), opts);
        const req = ctx.req;
        const getReqBody = () => {
          if (!req[body]) {
            return Promise.resolve();
          }
          return ctx.getReqBody();
        };
        resPromise = getReqBody().then((reqBody) => {
          if (reqBody && req.body !== undefined) {
            req.body = reqBody;
          }
          return util.request(ctx, opts).then((svrRes) => {
            ctx.status = svrRes.statusCode;
            ctx.set(svrRes.headers);
            const getResBody = () => {
              return getBody(svrRes);
            };
            const getResText = () => {
              return getText(svrRes);
            };
            ctx.getResBody = getResBody;
            ctx.getResText = getResText;
            return svrRes;
          });
        });
      }
      return resPromise;
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
      if (resPromise && ctx.body === undefined) {
        const res = yield next();
        if (res[body]) {
          ctx.body = yield ctx.getResBody();
          ctx.remove('content-encoding');
        } else {
          ctx.body = res;
        }
      } else {
        ctx.remove('content-encoding');
      }
      ctx.remove('content-length');
    } else {
      ctx.body = yield next();
    }
  });
  server.on('request', app.callback());
  setupWsServer(server, options);
};
