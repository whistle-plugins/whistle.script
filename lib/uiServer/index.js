const Koa = require('koa');
const onerror = require('koa-onerror');
const bodyParser = require('koa-bodyparser');
const serve = require('koa-static');
const path = require('path');
const router = require('koa-router')();
const setupRouter = require('./router');
const logger = require('../logger');
const scripts = require('../scripts');
const dataSource = require('../dataSource');

module.exports = function (server, options) {
  scripts.load(options.storage);
  const app = new Koa();
  onerror(app);
  app.use(async (ctx, next) => {
    ctx.storage = options.storage;
    ctx.getLogs = logger.getLogs;
    ctx.scripts = scripts;
    ctx.dataSource = dataSource;
    await next();
  });
  app.use(bodyParser());
  setupRouter(router);
  app.use(router.routes());
  app.use(router.allowedMethods());
  app.use(serve(path.join(__dirname, '../../public')));
  server.on('request', app.callback());
};
