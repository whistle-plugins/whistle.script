const zlib = require('zlib');
const { EventEmitter } = require('events');
const { parse: parseUrl } = require('url');
const http = require('http');
const https = require('https');
const dataSource = require('./dataSource');

exports.AUTH_URL = 'x-whistle-.script-auth-url';
exports.SNI_URL = 'x-whistle-.script-sni-url';
exports.REQ_RULES_URL = 'x-whistle-.script-req-rules-url';
exports.RES_RULES_URL = 'x-whistle-.script-res-rules-url';
exports.STATS_URL = 'x-whistle-.script-stats-url';
exports.DATA_URL = 'x-whistle-.script-data-url';
exports.noop = () => {};

const PREFIX_LEN = 'x-whistle-.script-'.length;
const POLICY = 'x-whistle-.script-policy';
const isFunction = fn => typeof fn === 'function';
const URL_RE = /^https?:(?:\/\/|%3A%2F%2F)[\w.-]/;

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

const formateRules = (ctx) => {
  if (ctx.rules || ctx.values) {
    return {
      rules: Array.isArray(ctx.rules) ? ctx.rules.join('\n') : `${ctx.rules}`,
      values: ctx.values,
    };
  }
};

exports.formateRules = formateRules;

exports.responseRules = (ctx) => {
  if (!ctx.body) {
    ctx.body = formateRules(ctx);
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


const request = (url, headers, data) => {
  if (!url) {
    return;
  }
  const options = parseUrl(url);
  options.headers = Object.assign({}, headers);
  delete options.headers.host;
  if (data) {
    data = Buffer.from(JSON.stringify(data));
    options.method = 'POST';
    options.headers['content-type'] = 'application/json';
  }
  return new Promise((resolve, reject) => {
    const httpModule = options.protocol === 'https:' ? https : http;
    options.rejectUnauthorized = false;
    const client = httpModule.request(options, (res) => {
      res.on('error', handleError);  // eslint-disable-line
      let body;
      res.on('data', (chunk) => {
        body = body ? Buffer.concat([body, chunk]) : chunk;
      });
      res.on('end', () => {
        clearTimeout(timer); // eslint-disable-line
        if (body) {
          try {
            return resolve(JSON.parse(body.toString()) || '');
          } catch (e) {}
        }
        resolve('');
      });
    });
    const handleError = (err) => {
      clearTimeout(timer);  // eslint-disable-line
      client.destroy();
      reject(err);
    };
    const timer = setTimeout(() => handleError(new Error('Timeout')), 12000);
    client.on('error', handleError);
    client.end(data);
  });
};

exports.request = async (url, headers, data) => {
  try {
    return await request(url, headers, data);
  } catch (e) {
    if (!data) {
      return request(url, headers, data);
    }
  }
};

const hasPolicy = ({ headers, originalReq: { ruleValue } }, name) => {
  const policy = headers[POLICY];
  if (typeof policy === 'string') {
    return policy.toLowerCase().indexOf(name) !== -1;
  }
  return ruleValue === `policy=${name}`;
};

const isRemote = (req) => {
  return hasPolicy(req, 'remote');
};

exports.isRemote = isRemote;

exports.isSni = (req) => {
  return hasPolicy(req, 'sni');
};

const getValue = ({ originalReq: req }, name) => {
  const { pluginVars, globalPluginVars } = req;
  const vars = globalPluginVars ? pluginVars.concat(globalPluginVars) : pluginVars;
  const len = vars && vars.length;
  if (!len) {
    return;
  }
  for (let i = 0; i < len; i++) {
    const item = vars[i];
    const index = item.indexOf('=');
    if (index !== -1 && item.substring(0, index) === name) {
      return item.substring(index + 1);
    }
  }
};

const getVarName = (name) => name.substring(PREFIX_LEN).replace(/-(.)/g, (_, ch) => ch.toUpperCase());

exports.getRemoteUrl = (req, name) => {
  let url = req.headers[name];
  if (url && typeof url === 'string') {
    url = decodeURIComponent(url);
  } else {
    url = getValue(req, getVarName(name));
  }
  if (URL_RE.test(url)) {
    return url;
  }
};
