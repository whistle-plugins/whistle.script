const parseurl = require('parseurl');
const zlib = require('zlib');
const request = require('request');
const { PassThrough } = require('stream');

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

exports.request = (ctx) => {
  const req = ctx.req;
  const options = parseurl(req);
  options.followRedirect = req.followRedirect || false;
  options.headers = req.headers || {};
  options.method = req.method;
  options.body = req;
  delete options.protocol;
  options.uri = ctx.fullUrl;
  options.body = 'body' in req ? req.body : req;
  options.encoding = null;
  const transform = new PassThrough();
  return new Promise((resolve, reject) => {
    delete options.headers['content-length'];
    delete options.headers['transfer-encoding'];
    const res = request(options);
    res.pipe(transform);
    res.on('error', reject);
    res.on('response', ({ statusCode, headers }) => {
      res.on('error', err => transform.emit('error', err));
      ctx.status = statusCode;
      ctx.set(headers);
      ctx.body = transform;
      resolve(transform);
    });
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
};

exports.responseRules = (ctx) => {
  if (!ctx.body && (ctx.rules || ctx.values)) {
    ctx.body = {
      rules: Array.isArray(ctx.rules) ? ctx.rules.join('\n') : `${ctx.rules}`,
      values: ctx.values,
    };
  }
};
