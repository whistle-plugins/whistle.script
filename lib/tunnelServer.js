const util = require('./util');
const agent = require('./agent');
const scripts = require('./scripts');
/* eslint-disable no-empty */

const autoClose = (req, res) => {
  if (req.autoClose === false) {
    return;
  }
  const closeAll = () => {
    try {
      setTimeout(() => {
        req.destroy();
        res.destroy();
      }, 1000);
    } catch (err) {}
  };
  req.on('error', closeAll);
  req.on('close', closeAll);
  res.on('error', closeAll);
  res.on('close', closeAll);
};

module.exports = (server, options) => {
  const HOST_RE = /^([^:/]+\.[^:/]+):(\d+)$/;
  server.on('connect', async (req, socket) => {
    const { url, headers } = req;
    const { dataSource, clearup } = util.getDataSource();
    socket.req = req;
    socket.dataSource = dataSource;
    socket.url = url;
    socket.headers = headers;
    socket.options = options;
    const reqOptions = {};
    socket.reqOptions = reqOptions;
    if (HOST_RE.test(url) || HOST_RE.test(headers.host)) {
      reqOptions.host = RegExp.$1;
      reqOptions.port = parseInt(RegExp.$2, 10);
    } else {
      reqOptions.host = '127.0.0.1';
      reqOptions.port = 80;
    }
    const { handleTunnel } = scripts.getHandler(socket);
    socket.on('error', clearup);
    socket.on('close', clearup);
    if (!util.isFunction(handleTunnel)) {
      return req.passThrough();
    }
    let res;
    const { write } = socket;
    socket.write = (...args) => {
      write.apply(socket, args);
    };
    let reqPromise;
    const connect = (opts) => {
      if (!reqPromise) {
        opts = util.parseOptions(opts);
        Object.assign(reqOptions, opts);
        reqPromise = (async () => {
          res = await agent.connect(reqOptions);
          autoClose(socket, res);
          return res;
        })();
      }
      return reqPromise;
    };
    try {
      await handleTunnel(socket, connect);
    } catch (err) {
      socket.emit('error', err);
    }
  });
};
