const logger = require('./logger');
// TODO: 加上proxy的功能，hosts > proxy
// TODO: 支持通过第三方扩展内置函数的功能，比如koa-whistle里面的第三方模块可以让whistle.script直接使用
const LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

/* eslint-disable no-console */
console.log = (...args) => {
  logger.log(args, 'log');
};

LEVELS.forEach((level) => {
  console[level] = (...args) => {
    logger.log(args, level);
  };
});
/* eslint-enable no-console */
exports.uiServer = require('./uiServer');
exports.rulesServer = require('./rulesServer');
exports.resRulesServer = require('./resRulesServer');
exports.tunnelRulesServer = require('./tunnelRulesServer');
exports.server = require('./server');
exports.tunnelServer = require('./tunnelServer');
