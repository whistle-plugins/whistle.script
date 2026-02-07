const vm = require('vm');
const iconv = require('iconv-lite');

const GLOBAL_VARS = [
  'process',
  'Buffer',
  'clearImmediate',
  'clearInterval',
  'clearTimeout',
  'setImmediate',
  'setInterval',
  'setTimeout',
  'console',
  'module',
  'require',
];
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

const execScript = (script, value) => {
  if (!script) {
    return {};
  }
  GLOBAL_VARS.forEach((key) => {
    CONTEXT[key] = global[key];
  });
  CONTEXT.require = require;
  CONTEXT.iconv = iconv;
  CONTEXT.process = {
    args: value ? value.split(',') : [],
  };
  CONTEXT.exports = {};
  CONTEXT.module = { exports: CONTEXT.exports };
  try {
    script.runInContext(CONTEXT, VM_OPTIONS);
    return CONTEXT.module.exports || {};
  } catch (err) {
    console.error(err);
  } finally {
    Object.keys(CONTEXT).forEach((key) => {
      if (GLOBAL_VARS.indexOf(key) === -1) {
        delete CONTEXT[key];
      }
    });
  }
  return {};
};

const parseRuleValue = (ctx) => {
  const { ruleValue } = ctx.req.originalReq;
  if (!RULE_VALUE_RE.test(ruleValue)) {
    ctx.scriptValue = '';
    return '';
  }
  const value = RegExp.$2;
  ctx.scriptValue = value;
  return {
    name: RegExp.$1,
    value,
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
