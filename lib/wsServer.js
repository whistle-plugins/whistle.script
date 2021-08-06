const crypto = require('crypto');
const {
  getRawHeaderNames,
  formatHeaders,
  getRawHeaders,
} = require('hparser');
const util = require('./util');
const scripts = require('./scripts');

const { getDataSource } = util;
const restoreHeaders = (req) => {
  const rawHeaders = req.rawHeaders && getRawHeaderNames(req.rawHeaders);
  return formatHeaders(req.headers, rawHeaders);
};

const getFn = (f1, f2) => {
  if (util.isFunction(f1)) {
    return f1;
  } if (util.isFunction(f2)) {
    return f2;
  }
};

const handleError = (socket, err) => {
  const body = String(err.stack || '');
  const length = Buffer.byteLength(body);
  socket.write(`HTTP/1.1 502 Bad Gateway\r\nServer: whistle.script\r\nContent-length: ${length}\r\n\r\n${body}`);
};

module.exports = (server, options) => {
  server.on('upgrade', async (req, socket) => {
    req.options = options;
    const {
      handleWebsocket,
      handleWebSocket,
    } = scripts.getHandler(req);
    const handleRequest = getFn(handleWebSocket, handleWebsocket);
    if (handleRequest) {
      const { dataSource, clearup } = getDataSource();
      const { headers } = req;
      const ctx = {
        req,
        dataSource,
        headers,
        options,
        url: req.originalReq.url,
        fullUrl: req.originalReq.url,
      };
      let replied;
      req.on('error', clearup);
      req.dataSource = dataSource;
      const reply = (res) => {
        if (replied) {
          return;
        }
        replied = true;
        let data;
        let key = `${headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`;
        key = crypto.createHash('sha1').update(key, 'binary').digest('base64');
        if (res) {
          res.headers['sec-websocket-accept'] = key;
          data = [
            `HTTP/1.1 ${res.statusCode} ${res.statusMessage}`,
            getRawHeaders(restoreHeaders(res)),
            '\r\n',
          ];
        } else {
          const protocol = (headers['sec-websocket-protocol'] || '').split(/, */)[0];
          data = ['HTTP/1.1 101 Switching Protocols'];
          if (protocol) {
            data.push(`Sec-WebSocket-Protocol: ${protocol}`);
          }
          data.push(`Sec-WebSocket-Accept: ${key}`);
          data.push('Upgrade: websocket');
          data.push('Connection: Upgrade');
          data.push('\r\n');
        }
        socket.write(data.join('\r\n'));
      };
      const connect = opts => new Promise((resolve, reject) => {
        const client = req.request(opts, (svrRes) => {
          reply(svrRes);
          resolve(svrRes);
        }) || req;
        client.on('error', reject);
      });
      try {
        await handleRequest(ctx, connect);
        reply();
      } catch (err) {
        clearup();
        handleError(socket, err);
      }
    }
  });
};
