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
    let reqPromise;
    const connect = (...args) => {
      if (!reqPromise) {
        let opts = util.parseArguments(args);
        opts = Object.assign(util.getCustomHost(req.headers, options), opts);
        reqPromise = new Promise((resolve, reject) => {
          Object.assign(reqOptions, opts);
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
      }
      return reqPromise;
    };
    const { handleTunnel } = scripts.getHandler(req);
    co(function* () {
      let done;
      const sendEstablished = (code, msg, body) => {
        if (!done) {
          done = true;
          msg = msg || 'Connection Established';
          body = body || '';
          const status = `HTTP/1.1 ${code || 200} ${msg}`;
          req.write(`${status}\r\nProxy-Agent: whistle.script\r\n\r\n${body}`);
        }
      };
      req.on('error', err => sendEstablished(502, 'Bad Gateway', err.stack));
      if (util.isFunction(handleTunnel)) {
        try {
          yield handleTunnel(req, connect);
          sendEstablished();
        } catch (err) {
          req.emit('error', err);
        }
      } else {
        try {
          res = yield connect();
          sendEstablished();
          req.pipe(res).pipe(req);
        } catch (err) {
          req.emit('error', err);
        }
      }
    });
  });
};
