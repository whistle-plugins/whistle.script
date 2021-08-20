const Koa = require('koa');
const util = require('./util');
const scripts = require('./scripts');

module.exports = (server, options) => {
  const app = new Koa();
  app.use(async (ctx) => {
    const { req } = ctx;
    if (util.isRemote(req)) {
      const rulesUrl = util.getRemoteUrl(req, util.REQ_RULES_URL);
      if (rulesUrl) {
        ctx.body = await util.request(rulesUrl, req.headers);
      }
      return;
    }
    util.setupContext(ctx, options);
    const { handleTunnelRules } = scripts.getHandler(ctx);
    if (util.isFunction(handleTunnelRules)) {
      await handleTunnelRules(ctx);
      util.responseRules(ctx);
    }
  });
  server.on('request', app.callback());
};
