const net = require('net');
const co = require('co');
const util = require('./util');
const scripts = require('./scripts');

module.exports = (server, options) => {
  const HOST_RE = /^([^:/]+\.[^:/]+):(\d+)$/;
  server.on('connect', (req, socket) => {
    const ctx = req;
    ctx.options = options;
    let socketError;
    socket.on('error', err => socketError = err);
    const reqOptions = ctx.reqOptions = {};
    if (HOST_RE.test(req.url) || HOST_RE.test(req.headers.host)) {
      reqOptions.host = RegExp.$1;
      reqOptions.port = parseInt(RegExp.$2, 10);
    } else {
      reqOptions.host = '127.0.0.1';
      reqOptions.port = 80;
    }
    let res;
    socket.on('error', (err) => {
      if (res) {
        res.emit('error', err);
      }
    });
    const next = () => {
      if (socketError) {
        return Promise.resolve(socketError);
      }
      return new Promise((resolve, reject) => {
        res = net.connect(reqOptions, () => resolve(res));
        res.on('error', reject);
      });
    };
    const { handleTunnel } = scripts.getHandler(ctx);
    co(function* () {
      socket.write('HTTP/1.1 200 Connection Established\r\nProxy-Agent: whistle.script\r\n\r\n');
      if (util.isFunction(handleTunnel)) {
        yield handleTunnel(ctx, next);
      } else {
        res = yield next();
        socket.pipe(res).pipe(socket);
      }
    });
  });
};
