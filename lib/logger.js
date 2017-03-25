const util = require('util');

const MAX_COUNT = 666;
const MIN_COUNT = 600;
let logs = [];

function log(args, level) {
  logs.push({
    level,
    msg: util.format.apply(null, args),
  });
  const len = logs.length;
  if (logs.length > MAX_COUNT) {
    logs = logs.slice(0, len - MIN_COUNT);
  }
}

exports.log = log;
exports.getLogs = function () {
  return logs;
};

