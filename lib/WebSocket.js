const Socket = require('ws');
const http = require('http');
const https = require('https');

class WebSocket extends Socket {
  constructor(...args) {
    const httpGet = http.get;
    const httpsGet = https.get;
    let headers;
    const getHeaders = opts => opts && opts.headers;
    http.get = function (...opts) {
      headers = getHeaders(opts[0]);
      return httpGet.apply(this, opts);
    };
    https.get = function (...opts) {
      headers = getHeaders(opts[0]);
      return httpsGet.apply(this, opts);
    };
    super(...args);
    http.get = httpGet;
    https.get = httpsGet;
    this.reqHeaders = headers || {};
    this.on('unexpected-response', (req, res) => {
      const err = new Error(`unexpected server response (${res.statusCode})`);
      err.statusCode = res.statusCode;
      err.statusMessage = res.statusMessage || 'unexpected server response';
      this.emit('error', err);
    });
  }
}

module.exports = WebSocket;
