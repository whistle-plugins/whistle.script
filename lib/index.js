const logger = require('./logger');

const LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

/* eslint-disable no-console, prefer-rest-params */
console.log = function () {
  logger.log(arguments, 'log');
};

LEVELS.forEach((level) => {
  console[level] = function () {
    logger.log(arguments, level);
  };
});
/* eslint-enable no-console, prefer-rest-params */

exports.uiServer = require('./uiServer');
exports.server = require('./server');
