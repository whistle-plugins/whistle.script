const vm = require('vm');
const util = require('./util');
const r = require('request');
const iconv = require('iconv-lite');
const ws = require('ws');

/* eslint-disable no-console */
const TIMEOUT = 600;
const RULE_VALUE_RE = /^([\w\-.]+)(?:\((.+)\))?.*$/;
const scripts = {};
const VM_OPTIONS = {
  displayErrors: false,
  timeout: TIMEOUT,
};
let CONTEXT = vm.createContext();

setInterval(() => {
  CONTEXT = vm.createContext();
}, 30000);

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
    return new vm.Script(`(function(){\n${code}\n})()`, { filename: name, timeout: TIMEOUT });
  } catch (err) {
    console.error(err);
  }
};

let globalVars;
const execScript = (script, value) => {
  if (!script) {
    return {};
  }
  Object.keys(global).forEach((key) => {
    CONTEXT[key] = global[key];
  });
  CONTEXT.require = require;
  CONTEXT.request = r;
  CONTEXT.iconv = iconv;
  CONTEXT.ws = ws;
  CONTEXT.process = {
    args: value ? value.split(',') : [],
  };
  CONTEXT.console = console;
  if (!globalVars) {
    globalVars = Object.keys(CONTEXT);
  }
  CONTEXT.exports = {};
  CONTEXT.module = { exports: CONTEXT.exports };
  try {
    script.runInContext(CONTEXT, VM_OPTIONS);
    return CONTEXT.module.exports || {};
  } catch (err) {
    console.error(err);
  } finally {
    Object.keys(CONTEXT).forEach((key) => {
      if (globalVars.indexOf(key) === -1) {
        delete CONTEXT[key];
      }
    });
  }
  return {};
};

const parseRuleValue = (ctx) => {
  const rule = util.getRuleValue(ctx.headers, ctx.options);
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
  return execScript(scripts[name], value);
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
