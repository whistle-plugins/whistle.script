const Koa = require('koa');
const util = require('./util');
const scripts = require('./scripts');

module.exports = (server, options) => {
  const app = new Koa();
  app.use(async (ctx) => {
    const { req } = ctx;
    if (util.isRemote(req)) {
      const rulesUrl = util.getRemoteUrl(req, util.REQ_RULES_URL);
      const resRulesUrl = util.getRemoteUrl(req, util.RES_RULES_URL);
      req.sessionStorage.set(util.RES_RULES_URL, resRulesUrl || '');
      if (rulesUrl) {
        const result = await util.request(rulesUrl, req.headers);
        ctx.body = util.formateRules(result);
      }
      return;
    }
    util.setupContext(ctx, options);
    const {
      handleWebSocketRules,
      handleWebsocketRules,
      handleRequestRules,
    } = scripts.getHandler(ctx);
    let handleReqRules;
    if (/^ws/.test(ctx.fullUrl)) {
      if (util.isFunction(handleWebSocketRules)) {
        handleReqRules = handleWebSocketRules;
      } else if (util.isFunction(handleWebsocketRules)) {
        handleReqRules = handleWebsocketRules;
      }
    } else if (util.isFunction(handleRequestRules)) {
      handleReqRules = handleRequestRules;
    }
    if (handleReqRules) {
      await handleReqRules(ctx);
      util.responseRules(ctx);
    }
  });
  server.on('request', app.callback());
};
