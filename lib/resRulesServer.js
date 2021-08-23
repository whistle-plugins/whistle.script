const Koa = require('koa');
const util = require('./util');
const scripts = require('./scripts');

module.exports = (server, options) => {
  const app = new Koa();
  app.use(async (ctx) => {
    const { req } = ctx;
    const rulesUrl = req.sessionStorage.get(util.RES_RULES_URL);
    if (rulesUrl != null) {
      req.sessionStorage.del(util.RES_RULES_URL);
      if (rulesUrl) {
        const result = await util.request(rulesUrl, req.headers);
        ctx.body = util.formateRules(result);
      }
      return;
    }
    util.setupContext(ctx, options);
    const { handleResponseRules } = scripts.getHandler(ctx);
    if (util.isFunction(handleResponseRules)) {
      await handleResponseRules(ctx);
      util.responseRules(ctx);
    }
  });
  server.on('request', app.callback());
};
