const logger = require('./logger');

const LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

/* eslint-disable no-console */
console.log = function (...args) {
  logger.log(args, 'info');
};

LEVELS.forEach((level) => {
  console[level] = function (...args) {
    logger.log(args, level);
  };
});
/* eslint-enable no-console */

exports.uiServer = require('./uiServer');
exports.server = require('./server');
