const zlib = require('zlib');
const { EventEmitter } = require('events');
const dataSource = require('./dataSource');

const AUTH_URL = 'x-whistle.script-auth-url';
const REQ_RULES_URL = 'x-whistle.script-req-rules-url';
const RES_RULES_URL = 'x-whistle.script-res-rules-url';
const STATS_URL = 'x-whistle.script-stats-url';
const DATA_URL = 'x-whistle.script-data-url';

const isFunction = fn => typeof fn === 'function';

exports.isFunction = isFunction;
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
  return !type || /javascript|css|html|json|xml|application\/x-www-form-urlencoded|text\//i.test(type);
};

const unzipBody = (headers, body, callback) => {
  let unzip;
  let encoding = headers['content-encoding'];
  if (body && typeof encoding === 'string') {
    encoding = encoding.trim().toLowerCase();
    if (encoding === 'gzip') {
      unzip = zlib.gunzip.bind(zlib);
    } else if (encoding === 'deflate') {
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
  ctx.fullUrl = ctx.req.originalReq.url;
};

exports.responseRules = (ctx) => {
  if (!ctx.body && (ctx.rules || ctx.values)) {
    ctx.body = {
      rules: Array.isArray(ctx.rules) ? ctx.rules.join('\n') : `${ctx.rules}`,
      values: ctx.values,
    };
  }
};

exports.getDataSource = () => {
  const ds = new EventEmitter();
  const handleData = (type, args) => {
    ds.emit(type, ...args);
  };
  dataSource.on('data', handleData);
  return {
    dataSource: ds,
    clearup: () => {
      dataSource.removeListener('data', handleData);
      ds.removeAllListeners();
    },
  };
};

exports.getContext = (req, res) => {
  const fullUrl = req.originalReq.url;
  return {
    req,
    res,
    fullUrl,
    url: fullUrl,
    headers: req.headers,
    method: req.method,
  };
};

exports.getFn = (f1, f2) => {
  if (isFunction(f1)) {
    return f1;
  } if (isFunction(f2)) {
    return f2;
  }
};
