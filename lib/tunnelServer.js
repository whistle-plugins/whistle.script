const net = require('net');
const co = require('co');
const util = require('./util');
const scripts = require('./scripts');

module.exports = (server, options) => {
  const HOST_RE = /^([^:/]+\.[^:/]+):(\d+)$/;
  server.on('connect', (req, socket) => {
    const { url, headers } = req;
    req = socket;
    req.url = url;
    req.headers = headers;
    req.options = options;
    const reqOptions = req.reqOptions = {};
    if (HOST_RE.test(url) || HOST_RE.test(headers.host)) {
      reqOptions.host = RegExp.$1;
      reqOptions.port = parseInt(RegExp.$2, 10);
    } else {
      reqOptions.host = '127.0.0.1';
      reqOptions.port = 80;
    }
    let res;
    let hasError = true;
    req.on('error', (err) => {
      req.destroy();
      if (!hasError && req.autoClose !== false && res) {
        hasError = true;
        res.on('error', err);
      }
    });
    req.on('close', () => {
      if (req.autoClose !== false && res) {
        setTimeout(() => res.close(), 3000);
      }
    });
    const connect = () => {
      return new Promise((resolve, reject) => {
        res = net.connect(reqOptions, () => resolve(res));
        res.on('error', (err) => {
          res.destroy();
          if (!hasError && req.autoClose !== false) {
            hasError = true;
            req.on('error', err);
          }
          res.on('close', () => {
            if (req.autoClose !== false) {
              setTimeout(() => req.close(), 3000);
            }
          });
          reject(err);
        });
      });
    };
    const { handleTunnel } = scripts.getHandler(req);
    co(function* () {
      req.write('HTTP/1.1 200 Connection Established\r\nProxy-Agent: whistle.script\r\n\r\n');
      if (util.isFunction(handleTunnel)) {
        try {
          yield handleTunnel(req, connect);
        } catch (err) {
          req.emit('error', err);
        }
      } else {
        try {
          res = yield connect();
          req.pipe(res).pipe(req);
        } catch (err) {
          req.emit('error', err);
        }
      }
    });
  });
};
