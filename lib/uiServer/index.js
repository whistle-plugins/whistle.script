const Koa = require('koa');
const serve = require('koa-static');
const path = require('path');
const router = require('koa-router')();
const setupRouter = require('./router');

module.exports = function (server) {
  const app = new Koa();
  app.use(function* (next) {
    this.storage = { abc: 123 };
    yield next;
  });
  setupRouter(router);
  app.use(router.routes());
  app.use(router.allowedMethods());
  app.use(serve(path.join(__dirname, '../../public')));
  server.on('request', app.callback());
};
