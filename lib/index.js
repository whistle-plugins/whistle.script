const logger = require('./logger');

const LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

/* eslint-disable no-console */
console.log = function () {
  logger.log(arguments, 'info');
};

LEVELS.forEach((level) => {
  console[level] = function () {
    logger.log(arguments, level);
  };
});
/* eslint-enable no-console */

exports.uiServer = require('./uiServer');
exports.server = require('./server');
