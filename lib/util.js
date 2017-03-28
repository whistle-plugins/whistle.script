const vm = require('vm');
const request = require('request');
const iconv = require('iconv-lite');
const ws = require('ws');

const TIMEOUT = 600;
exports.getScript = (code, name) => {
  code = code && code.trim();
  if (!code) {
    return;
  }
  try {
    return new vm.Script(code, { filename: name, timeout: TIMEOUT });
  } catch (err) {}
};

exports.execScript = (script) => {
  if (!script) {
    return;
  }
  const ctx = Object.create(global);
  ctx.require = require;
  ctx.request = request;
  ctx.iconv = iconv;
  ctx.ws = ws;
  ctx.module = {};
  ctx.exports = ctx.module.exports = {};
  try {
    script.runInNewContext(ctx);
  } catch (err) {
    return;
  }
  return ctx.module.exports;
};
