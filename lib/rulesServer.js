const Koa = require('koa');
const util = require('./util');
const scripts = require('./scripts');

module.exports = (server, options) => {
  const app = new Koa();
  app.use(async (ctx) => {
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
