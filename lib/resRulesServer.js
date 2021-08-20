const Koa = require('koa');
const util = require('./util');
const scripts = require('./scripts');

module.exports = (server, options) => {
  const app = new Koa();
  app.use(async (ctx) => {
    const { req } = ctx;
    const rulesUrl = util.getRemoteUrl(req, util.RES_RULES_URL);
    if (rulesUrl) {
      ctx.body = await util.request(rulesUrl, req.headers);
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
