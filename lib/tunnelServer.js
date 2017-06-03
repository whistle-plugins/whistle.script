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
    req.on('error', (err) => {
      req.destroy();
      if (req.autoClose !== false && res) {
        res.on('error', err);
      }
    });
    req.on('close', () => {
      if (req.autoClose !== false && res) {
        res.close();
      }
    });
    const connect = () => {
      return new Promise((resolve, reject) => {
        res = net.connect(reqOptions, () => resolve(res));
        res.on('error', (err) => {
          res.destroy();
          if (req.autoClose !== false) {
            req.on('error', err);
          }
          res.on('close', () => {
            if (req.autoClose !== false) {
              req.close();
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
          yield connect();
          req.pipe(res).pipe(req);
        } catch (err) {
          req.emit('error', err);
        }
      }
    });
  });
};
