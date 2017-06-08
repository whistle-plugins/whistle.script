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


exports.getHttpsAgent = (options) => {
  return getAgent(options, httpsAgents, 'httpsOverHttp');
};
exports.getHttpAgent = (options) => {
  return getAgent(options, httpAgents, 'httpOverHttp');
};
