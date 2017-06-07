const net = require('net');
const co = require('co');
const util = require('./util');
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
  res.on('error', closeAll);
};

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
    let done;
    const write = req.write;
    const sendEstablished = (err) => {
      if (done) {
        return;
      }
      done = true;
      const msg = err ? 'Bad Gateway' : 'Connection Established';
      const body = String((err && err.stack) || '');
      const status = `HTTP/1.1 ${err ? 502 : 200} ${msg}`;
      const length = Buffer.byteLength(body);
      write.call(req, `${status}\r\nContent-length: ${length}\r\nProxy-Agent: whistle.script\r\n\r\n${body}`);
    };
    req.write = (...args) => {
      sendEstablished();
      write.apply(req, args);
    };
    req.on('error', sendEstablished);
    let reqPromise;
    const connect = (...args) => {
      if (!reqPromise) {
        let opts = util.parseArguments(args);
        opts = Object.assign(util.getCustomHost(req.headers, options), opts);
        reqPromise = new Promise((resolve) => {
          Object.assign(reqOptions, opts);
          res = net.connect(reqOptions, () => {
            sendEstablished();
            autoClose(req, res);
            resolve(res);
          });
          res.on('error', sendEstablished);
        });
      }
      return reqPromise;
    };
    const { handleTunnel } = scripts.getHandler(req);
    co(function* () {
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
          req.pipe(res).pipe(req);
          autoClose(req, res);
        } catch (err) {
          req.emit('error', err);
        }
      }
    });
  });
};
