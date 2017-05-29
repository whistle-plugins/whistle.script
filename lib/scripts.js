const vm = require('vm');
const util = require('./util');
const r = require('request');
const iconv = require('iconv-lite');
const ws = require('ws');

/* eslint-disable no-console */
const TIMEOUT = 600;
const RULE_VALUE_RE = /^([\w\-.]+)(?:\((.+)\))?.*$/;
const scripts = {};

const getScript = (code, name) => {
  code = code && code.trim();
  if (!code) {
    return;
  }
  code = `const d = require('domain').create();
          d.on('error', console.error);
          d.run(() => {
            ${code}
          });`;
  try {
    return new vm.Script(code, { filename: name, timeout: TIMEOUT });
  } catch (err) {
    console.error(err);
  }
};

const execScript = (script, value) => {
  if (!script) {
    return;
  }
  const ctx = Object.create(global);
  ctx.require = require;
  ctx.request = r;
  ctx.iconv = iconv;
  ctx.ws = ws;
  ctx.args = value ? value.split(',') : [];
  ctx.module = {};
  ctx.exports = ctx.module.exports = {};
  try {
    script.runInNewContext(ctx);
  } catch (err) {
    return console.error(err);
  }
  return ctx.module.exports;
};

const parseRuleValue = (ctx) => {
  const rule = util.getRuleValue(ctx, ctx.options);
  if (!RULE_VALUE_RE.test(rule)) {
    return;
  }
  return {
    name: RegExp.$1,
    value: RegExp.$2,
  };
};

exports.get = (name) => {
  return scripts[name];
};

exports.getHandler = (ctx) => {
  const { name, value } = parseRuleValue(ctx);
  return execScript(scripts[name], value) || {};
};

const set = (name, text) => {
  scripts[name] = typeof text === 'string' ? getScript(text) : text;
};
exports.set = set;

exports.remove = (name) => {
  delete scripts[name];
};

exports.load = (storage) => {
  storage.getFileList().forEach(({ name, data }) => {
    set(name, data);
  });
};
