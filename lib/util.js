const vm = require('vm');
const request = require('request');
const iconv = require('iconv-lite');
const ws = require('ws');
const http = require('http');
const https = require('https');
/* eslint-disable no-console */
const TIMEOUT = 600;
exports.getScript = (code, name) => {
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

exports.execScript = (script, value) => {
  if (!script) {
    return;
  }
  const ctx = Object.create(global);
  ctx.require = require;
  ctx.request = request;
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

const RULE_VALUE_RE = /^([\w\-.]+)(?:\((.+)\))?.*$/;
const getRuleValue = (req, options) => {
  const value = req.headers[options.RULE_VALUE_HEADER];
  if (!value) {
    return;
  }
  return decodeURIComponent(value);
};

exports.parseRuleValue = (req, options) => {
  const rule = getRuleValue(req, options);
  if (!RULE_VALUE_RE.test(rule)) {
    return;
  }
  return {
    name: RegExp.$1,
    value: RegExp.$2,
  };
};

exports.getRuleValue = getRuleValue;
const getValueFromHeaders = (req, name) => {
  name = req.headers[name];
  return name ? decodeURIComponent(name) : '';
};
exports.getValueFromHeaders = getValueFromHeaders;

exports.getHost = (req, options) => {
  return getValueFromHeaders(req, options.CUR_HOST_HEADER);
};

exports.getFullUrl = (req, options) => {
  return getValueFromHeaders(req, options.FULL_URL_HEADER);
};

exports.request = (req, options) => {
  const request = options.protocol === 'https:' ? https.request : http.request;
  return new Promise((resolve, reject) => {
    const client = request(options, resolve);
    client.on('error', reject);
    req.pipe(client);
  });
};
