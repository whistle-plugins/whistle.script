const Koa = require('koa');
const util = require('./util');
const scripts = require('./scripts');

module.exports = (server, options) => {
  const app = new Koa();
  app.use(async (ctx) => {
    util.setupContext(ctx, options);
    const { handleTunnelRules } = scripts.getHandler(ctx);
    if (util.isFunction(handleTunnelRules)) {
      await handleTunnelRules(ctx);
      util.responseRules(ctx);
    }
  });
  server.on('request', app.callback());
};
