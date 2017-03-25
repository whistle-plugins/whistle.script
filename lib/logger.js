'use strict';

const util = require('util');

const MAX_COUNT = 666;
const MIN_COUNT = 600;
const COUNT = 60;
let logs = [];
let index = 0;

function leftPad(num) {
  if (num > 99) {
    return num;
  }
  if (num > 9) {
    return `0${num}`;
  }
  return `00${num}`;
}

function getId() {
  if (index > 999) {
    index = 0;
  }
  return `${Date.now()}-${leftPad(index++)}`;
}

function log(args, level) {
  logs.push({
    level,
    id: getId(),
    msg: util.format.apply(null, args),
  });
  const len = logs.length;
  if (logs.length > MAX_COUNT) {
    logs = logs.slice(0, len - MIN_COUNT);
  }
}

exports.log = log;
exports.getLogs = function (id) {
  id = id || String(Date.now() - 1500);
  for (let i = 0, len = logs.length; i < len; i++) {
    if (logs[i].id > id) {
      return logs.slice(i, i + COUNT);
    }
  }
  return [];
};

