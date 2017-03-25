const Koa = require('koa');
const onerror = require('koa-onerror');
const bodyParser = require('koa-bodyparser');
const serve = require('koa-static');
const path = require('path');
const router = require('koa-router')();
const setupRouter = require('./router');
const logger = require('../logger');

module.exports = function (server, options) {
  const app = new Koa();
  onerror(app);
  app.use(function* (next) {
    this.storage = options.storage;
    this.getLogs = logger.getLogs;
    yield next;
  });
  app.use(bodyParser());
  setupRouter(router);
  app.use(router.routes());
  app.use(router.allowedMethods());
  app.use(serve(path.join(__dirname, '../../public')));
  server.on('request', app.callback());
};
