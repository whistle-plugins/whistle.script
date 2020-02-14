const co = require('co');
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
  server.on('connect', (req, socket) => {
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
    let res;
    const { write } = socket;
    socket.write = (...args) => {
      write.apply(socket, args);
    };
    socket.on('error', clearup);
    socket.on('close', clearup);
    let reqPromise;
    const connect = (opts) => {
      if (!reqPromise) {
        opts = util.parseOptions(opts);
        Object.assign(reqOptions, opts);
        reqPromise = co(function* () {
          res = yield agent.connect(reqOptions);
          autoClose(socket, res);
          return res;
        });
      }
      return reqPromise;
    };
    const { handleTunnel } = scripts.getHandler(socket);
    co(function* () {
      if (util.isFunction(handleTunnel)) {
        try {
          yield handleTunnel(socket, connect);
        } catch (err) {
          socket.emit('error', err);
        }
      } else {
        try {
          res = yield connect();
          socket.pipe(res).pipe(socket);
          autoClose(socket, res);
        } catch (err) {
          socket.emit('error', err);
        }
      }
    });
  });
};
