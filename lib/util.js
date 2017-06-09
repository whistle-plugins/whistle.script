const parseurl = require('parseurl');
const zlib = require('zlib');
const request = require('request');
const urlParse = require('url').parse;
const { PassThrough } = require('stream');

exports.isFunction = fn => typeof fn === 'function';
exports.noop = () => {};
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

const HOST_RE = /^([^:]+):(\d+)$/;
const parseHost = (host) => {
  if (HOST_RE.test(host)) {
    return {
      host: RegExp.$1,
      port: RegExp.$2,
    };
  }
};
const parseArguments = (options) => {
  if (!options) {
    return {};
  }
  if (HOST_RE.test(options)) {
    return {
      host: RegExp.$1,
      port: RegExp.$2,
    };
  }
  if (typeof options === 'string') {
    return parseHost(options);
  }
  if (!(options.port > 0)) {
    delete options.port;
    Object.assign(options, parseHost(options.host));
  }
  if (typeof options.host !== 'string') {
    delete options.host;
  }
  let { proxyUrl } = options;
  if (!proxyUrl || typeof proxyUrl !== 'string') {
    delete options.proxyUrl;
  } else {
    proxyUrl = proxyUrl.replace(/^[^/]*:\/\/|\s+|\/.*$/g, '');
    options.proxyUrl = proxyUrl && `http://${proxyUrl}`;
  }
  return options;
};
exports.parseArguments = parseArguments;

const getValueFromHeaders = (headers, name) => {
  name = headers[name];
  return name ? decodeURIComponent(name) : '';
};
exports.getValueFromHeaders = getValueFromHeaders;

exports.getCustomHost = (headers, options) => {
  const host = getValueFromHeaders(headers, options.LOCAL_HOST_HEADER);
  return parseArguments(host);
};

const getRuleValue = (headers, options) => {
  const value = headers[options.RULE_VALUE_HEADER];
  if (!value) {
    return;
  }
  return decodeURIComponent(value);
};

exports.getRuleValue = getRuleValue;
const clearWhistleHeaders = (headers, options) => {
  const result = {};
  if (!headers) {
    return result;
  }
  if (!options) {
    return Object.assign({}, headers);
  }
  const removeHeaders = {};
  Object.keys(options).forEach(key => removeHeaders[options[key]] = 1);
  Object.keys(headers).forEach((name) => {
    if (!removeHeaders[name]) {
      result[name] = headers[name];
    }
  });
  return result;
};
exports.clearWhistleHeaders = clearWhistleHeaders;

exports.request = (ctx, opts) => {
  opts = opts || {};
  const req = ctx.req;
  const options = parseurl(req);
  options.followRedirect = req.followRedirect || false;
  options.headers = clearWhistleHeaders(req.headers, ctx.options);
  options.method = req.method;
  options.body = req;
  delete options.protocol;
  options.uri = ctx.fullUrl;
  let r = request;
  if (opts.proxyUrl) {
    r = request.defaults({ proxy: opts.proxyUrl });
  } else if (opts.host || options.port > 0) {
    const uri = options.uri = urlParse(ctx.fullUrl);
    if (opts.host) {
      uri.hostname = opts.host;
      delete opts.hostname;
    }
    if (opts.port > 0) {
      uri.port = opts.port;
    }
  }

  if (req.body !== undefined) {
    delete req.headers['content-encoding'];
    options.body = req.body;
  }
  options.encoding = null;
  const transform = new PassThrough();
  return new Promise((resolve, reject) => {
    delete options.headers['content-length'];
    delete options.headers['transfer-encoding'];
    const res = r(options);
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
          resolve(data || null);
        }
      });
    });
    stream.on('error', reject);
  });
};

exports.setupContext = (ctx, options) => {
  ctx.options = options;
  ctx.reqOptions = parseurl(ctx.req);
  const fullUrl = getValueFromHeaders(ctx.headers, options.FULL_URL_HEADER);
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

