const Koa = require('koa');
const util = require('./util');
const scripts = require('./scripts');

module.exports = (server, options) => {
  const app = new Koa();
  app.use(async (ctx) => {
    util.setupContext(ctx, options);
    const { handleResponseRules } = scripts.getHandler(ctx);
    if (util.isFunction(handleResponseRules)) {
      await handleResponseRules(ctx);
      util.responseRules(ctx);
    }
  });
  server.on('request', app.callback());
};
