const Koa = require('koa');
const util = require('./util');

module.exports = function (server, options) {
  const app = new Koa();
  app.use(function* (next) {
    const { name, value } = util.parseRuleValue(this.request, options);
    this.body = `${name}(${value})`;
  });
  server.on('request', app.callback());
};
