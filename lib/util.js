const parseurl = require('parseurl');
const zlib = require('zlib');
const request = require('request');
const { PassThrough } = require('stream');

exports.isFunction = fn => typeof fn === 'function';

const getCharset = (headers) => {
  if (/charset=([^\s]+)/.test(headers['content-type'])) {
    return RegExp.$1;
  }
  return 'utf8';
};
exports.getCharset = getCharset;
exports.isText = (headers) => {
  const type = headers['content-type'];
  return !type || /(javascript|css|html|json|xml)|text\//i.test(type);
};

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

exports.request = (ctx) => {
  const req = ctx.req;
  const options = parseurl(req);
  options.followRedirect = req.followRedirect || false;
  options.headers = req.headers || {};
  options.method = req.method;
  options.body = req;
  delete options.protocol;
  options.uri = ctx.fullUrl;
  if ('body' in req) {
    delete req.headers['content-encoding'];
    options.body = req.body;
  } else {
    options.body = req;
  }
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
      transform.statusCode = statusCode;
      transform.headers = headers;
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

exports.setupContext = (ctx, options) => {
  ctx.options = options;
  ctx.reqOptions = parseurl(ctx.req);
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

