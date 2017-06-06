const Server = require('ws').Server;

class WebSocketServer extends Server {
  completeUpgrade(protocol, version, req, socket, head, cb) {
    const write = socket.write;
    let cache = [];
    req.response = (err) => {
      if (!cache) {
        return;
      }
      if (err) {
        cache[0] = `HTTP/1.1 502 Bad Gateway\r\nContent-Type: text/plain\r\n\r\n${err.stack}`;
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
