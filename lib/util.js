const vm = require('vm');
const r = require('request');
const iconv = require('iconv-lite');
const ws = require('ws');
const http = require('http');
const https = require('https');
const zlib = require('zlib');
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

exports.clearCustomHeaders = (req, options) => {
  Object.keys(options).forEach((name) => {
    delete req.headers[name];
  });
};

const unzipBody = (headers, body, callback) => {
  let unzip;
  let encoding = headers['content-encoding'];
  if (body && typeof encoding === 'string') {
    encoding = encoding.trim().toLowerCase();
    if (encoding === 'gzip') {
      unzip = zlib.gunzip.bind(zlib);
    } else if (encoding === 'gzip') {
      unzip = zlib.inflate.bind(zlib);
    }
  }
  if (!unzip) {
    return callback(null, body);
  }
  unzip(body, (err, data) => {
    if (err) {
      return zlib.inflateRaw(body, callback);
    }
    callback(null, data);
  });
};

exports.getStreamBuffer = (stream) => {
  return new Promise((resolve, reject) => {
    let buffer;
    stream.on('data', (data) => {
      buffer = buffer ? Buffer.concat([buffer, data]) : data;
    });
    stream.on('end', () => {
      unzipBody(stream.headers, buffer, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
    stream.on('error', reject);
  });
};

const HOST_RE = /^([^:]+):(\d{1,5})?$/;
exports.parseHost = (host) => {
  if (!HOST_RE.test(host)) {
    return;
  }
  return {
    host: RegExp.$1,
    port: RegExp.$2,
  };
};
