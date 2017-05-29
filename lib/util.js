const http = require('http');
const https = require('https');
const zlib = require('zlib');
const Stream = require('stream');

exports.isFunction = fn => typeof fn === 'function';

const getRuleValue = (ctx, options) => {
  const value = ctx.get(options.RULE_VALUE_HEADER);
  if (!value) {
    return;
  }
  return decodeURIComponent(value);
};

exports.getRuleValue = getRuleValue;
const getValueFromHeaders = (ctx, name) => {
  name = ctx.get(name);
  return name ? decodeURIComponent(name) : '';
};
exports.getValueFromHeaders = getValueFromHeaders;

exports.getHost = (ctx) => {
  return getValueFromHeaders(ctx, ctx.options.LOCAL_HOST_HEADER);
};

exports.getFullUrl = (ctx) => {
  return getValueFromHeaders(ctx, ctx.options.FULL_URL_HEADER);
};

exports.request = (stream, options) => {
  const request = options.protocol === 'https:' ? https.request : http.request;
  return new Promise((resolve, reject) => {
    const client = request(options, resolve);
    client.on('error', reject);
    if (stream instanceof Stream) {
      stream.pipe(client);
    } else {
      client.end(stream);
    }
  });
};

exports.clearCustomHeaders = (ctx) => {
  Object.keys(ctx.options).forEach((name) => {
    delete ctx.get(name);
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

exports.setupContext = (ctx, options) => {
  ctx.options = options;
  const fullUrl = getValueFromHeaders(ctx, options.FULL_URL_HEADER);
  ctx.fullUrl = fullUrl;
  //TODO: xxx
  ctx.curRule = getValueFromHeaders(ctx, options.FULL_URL_HEADER);
  ctx.curHost = getValueFromHeaders(ctx, options.FULL_URL_HEADER);
  ctx.curProxy = getValueFromHeaders(ctx, options.FULL_URL_HEADER);
};

exports.responseRules = (ctx) => {
  if (!ctx.body && (ctx.rules || ctx.values)) {
    ctx.body = {
      rules: Array.isArray(ctx.rules) ? ctx.rules.join('\n') : `${ctx.rules}`,
      values: ctx.values,
    };
  }
};
