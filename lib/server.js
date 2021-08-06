const Koa = require('koa');
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
    result = util.getStreamBuffer(stream);
    stream[body] = result;
  }
  return result;
};
const getText = (stream) => {
  if (!util.isText(stream.headers)) {
    return Promise.resolve(null);
  }
  let result = stream[text];
  if (!result) {
    result = getBody(stream).then((buf) => {
      return buf ? iconv.decode(buf, util.getCharset(stream.headers)) : '';
    });
    stream[text] = result;
  }
  return result;
};

const request = (req, options) => {
  return new Promise((resolve, reject) => {
    const client = req.request(options, resolve);
    client.on('error', reject);
    req.pipe(client);
  });
};

module.exports = (server, options) => {
  const app = new Koa();
  onerror(app);
  app.use(async (ctx) => {
    util.setupContext(ctx, options);
    const { req } = ctx;
    const { dataSource, clearup } = util.getDataSource();
    ctx.dataSource = dataSource;
    const { handleRequest } = scripts.getHandler(ctx);
    if (!util.isFunction(handleRequest)) {
      const svrRes = await request(req);
      ctx.status = svrRes.statusCode;
      ctx.set(svrRes.headers);
      ctx.body = svrRes;
      return;
    }
    let resPromise;
    const next = (opts) => {
      if (!resPromise) {
        opts = util.parseOptions(opts);
        const getReqBody = () => {
          if (!req[body]) {
            return Promise.resolve();
          }
          return ctx.getReqBody();
        };
        resPromise = getReqBody().then((reqBody) => {
          if (reqBody && req.body === undefined) {
            req.body = reqBody;
          }
          return util.request(ctx, opts).then((svrRes) => {
            ctx.status = svrRes.statusCode;
            Object.keys(svrRes.headers).forEach((name) => {
              if (!ctx.res.getHeader(name)) {
                ctx.set(name, svrRes.headers[name]);
              }
            });
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
    try {
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
      await handleRequest(ctx, next);
      if (resPromise && ctx.body === undefined) {
        const res = await next();
        if (res[body]) {
          ctx.body = await ctx.getResBody();
          ctx.remove('content-encoding');
        } else {
          ctx.body = res;
        }
      } else {
        ctx.remove('content-encoding');
      }
      ctx.remove('content-length');
    } finally {
      clearup();
    }
  });
  server.on('request', app.callback());
  setupWsServer(server, options);
};
