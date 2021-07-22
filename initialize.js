

module.exports = ({ debugMode }) => {
  const logger = require('./lib/logger');
  const LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

  /* eslint-disable no-console */
  const originalLog = console.log;
  console.log = (...args) => {
    logger.log(args, 'log');
    if (debugMode) {
      originalLog.apply(console, args);
    }
  };

  LEVELS.forEach((level) => {
    const originalFn = console[level];
    console[level] = (...args) => {
      logger.log(args, level);
      if (debugMode) {
        originalFn.apply(console, args);
      }
    };
  });

};
