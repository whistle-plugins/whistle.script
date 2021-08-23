const Koa = require('koa');
const router = require('koa-router')();
const setupRouter = require('./router');
/* eslint-disable no-console */
const app = new Koa();
setupRouter(router);
app.use(router.routes());
app.listen(7788, () => {
  console.log('server is listening on 7788.');
});
