const Server = require('ws').Server;

const getHeadersRaw = (headers) => {
  const result = [];
  if (headers) {
    Object.keys(headers).forEach((name) => {
      const value = headers[name];
      if (!Array.isArray(value)) {
        result.push(`${name}: ${value}`);
        return;
      }
      value.forEach((val) => {
        result.push(`${name}: ${val}`);
      });
    });
  }
  return result.join('\r\n') || 'Content-Type: text/plain';
};

class WebSocketServer extends Server {
  completeUpgrade(protocol, version, req, socket, head, cb) {
    const write = socket.write;
    let cache = [];
    req.response = (err) => {
      if (!cache) {
        return;
      }
      if (err) {
        const status = err.statusCode || 502;
        const msg = err.statusMessage || 'Bad Gateway';
        const headers = getHeadersRaw(err.headers);
        cache[0] = `HTTP/1.1 ${status} ${msg}\r\n${headers}\r\n\r\n${err.stack}`;
      }
      cache.forEach(args => write.apply(socket, args));
      cache = null;
    };
    socket.write = (...args) => {
      if (cache) {
        cache.push(args);
        return;
      }
      write.apply(socket, args);
    };
    super.completeUpgrade(protocol, version, req, socket, head, cb);
  }
}

module.exports = WebSocketServer;
