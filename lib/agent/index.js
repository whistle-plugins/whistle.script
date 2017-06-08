const http = require('http');
const Agent = require('./agent');

const httpsAgents = {};
const httpAgents = {};
const idleTimeout = 60000;
const freeSocketErrorListener = () => {
  const socket = this;
  socket.destroy();
  socket.emit('agentRemove');
  socket.removeListener('error', freeSocketErrorListener);
};
const preventThrowOutError = (socket) => {
  socket.removeListener('error', freeSocketErrorListener);
  socket.on('error', freeSocketErrorListener);
};

const getCacheKey = (options) => {
  const protocol = options.isHttps ? 'https' : 'http';
  const auth = options.auth || options.proxyAuth || '';
  return [protocol, options.host, options.port, auth].join(':');
};
const getAgent = (options, cache, type) => {
  const key = getCacheKey(options);
  let agent = cache[key];
  if (!agent) {
    options.proxyAuth = options.auth;
    options = {
      proxy: options,
      rejectUnauthorized: false,
    };
    agent = cache[key] = new Agent[type || 'httpsOverHttp'](options);
    agent.on('free', preventThrowOutError);
    const createSocket = agent.createSocket;
    agent.createSocket = function (opts, cb) {
      createSocket.call(this, opts, (socket) => {
        socket.setTimeout(idleTimeout, () => socket.destroy());
        cb(socket);
      });
    };
  }

  return agent;
};

const toBuffer = (buf) => {
  if (buf == null || buf instanceof Buffer) {
    return buf;
  }
  buf += '';
  return new Buffer(buf);
};
const noop = () => {};
const connect = (options, cb) => {
  const proxyOptions = {
    method: 'CONNECT',
    agent: false,
    path: `${options.host}:${options.port}`,
    host: options.proxyHost,
    port: options.proxyPort,
    headers: options.headers || {},
  };
  proxyOptions.headers.host = proxyOptions.path;
  if (options.proxyAuth) {
    proxyOptions.headers['proxy-authorization'] = `Basic ${toBuffer(options.proxyAuth).toString('base64')}`;
  }
  const req = http.request(proxyOptions);
  const timer = setTimeout(() => {
    req.emit('error', new Error('Timeout'));
    req.abort();
  }, 16000);
  req.on('connect', (res, socket) => {
    clearTimeout(timer);
    socket.on('error', noop);
    cb(socket);
    if (res.statusCode !== 200) {
      process.nextTick(() => {
        req.emit('error', new Error(`Tunneling socket could not be established, statusCode=${res.statusCode}`));
      });
    }
  }).end();
  return req;
};

exports.getHttpsAgent = (options) => {
  return getAgent(options, httpsAgents, 'httpsOverHttp');
};
exports.getHttpAgent = (options) => {
  return getAgent(options, httpAgents, 'httpOverHttp');
};
exports.connect = connect;
