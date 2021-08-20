const crypto = require('crypto');
const { getDataSource, getFn } = require('./util');
const scripts = require('./scripts');


module.exports = (server, options) => {
  const { getReceiver, getSender } = options.wsParser;

  const wrap = (socket, receiver, sender) => {
    socket.on('data', receiver.add.bind(receiver));
    receiver.onData = (data, opts) => socket.emit('message', data, opts);
    receiver.onping = (data) => socket.emit('ping', data);
    receiver.onpong = (data) => socket.emit('pong', data);
    receiver.onclose = (code, message, opts) => socket.emit('disconnect', code, message, opts);
    receiver.onerror = (reason, code) => {
      const err = new Error(reason);
      err.code = code;
      socket.emit('error', err);
    };
    socket.send = sender.send.bind(sender);
    socket.ping = sender.ping.bind(sender);
    socket.pong = sender.pong.bind(sender);
    socket.disconnect = sender.close.bind(sender);
  };

  const wrapServerSocket = (socket) => {
    const receiver = getReceiver(socket, true);
    const sender = getSender(socket);
    wrap(socket, receiver, sender);
  };

  const wrapClientSocket = (socket) => {
    const receiver = getReceiver(socket);
    const sender = getSender(socket, true);
    wrap(socket, receiver, sender);
  };

  server.on('upgrade', async (req, socket) => {
    const oReq = req.originalReq;
    socket.options = options;
    socket.req = req;
    socket.originalReq = oReq;
    const {
      handleWebsocket,
      handleWebSocket,
    } = scripts.getHandler(socket);
    const handleRequest = getFn(handleWebSocket, handleWebsocket);
    if (!handleRequest) {
      return req.passThrough();
    }
    const { dataSource, clearup } = getDataSource();
    const { headers } = req;
    let replied;
    req.on('error', clearup);
    socket.dataSource = dataSource;
    socket.headers = headers;
    socket.url = socket.fullUrl = oReq.url; // eslint-disable-line
    const handleUpgrade = (res) => {
      if (replied) {
        return;
      }
      replied = true;
      let key = `${headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`;
      key = crypto.createHash('sha1').update(key, 'binary').digest('base64');
      if (res) {
        if (res.statusCode == 101) { // eslint-disable-line
          res.headers['sec-websocket-accept'] = key;
        }
      } else {
        const protocol = (headers['sec-websocket-protocol'] || '').split(/, */)[0];
        res = {
          statusCode: 101,
          headers: {
            'Sec-WebSocket-Accept': key,
            Upgrade: 'websocket',
            Connection: 'Upgrade',
          },
        };
        if (protocol) {
          res.headers['Sec-WebSocket-Protocol'] = protocol;
        }
      }
      req.writeHead(res.statusCode, res.statusMessage, res.headers);
    };
    const connect = opts => new Promise((resolve, reject) => {
      const client = req.request(opts, (svrRes) => {
        handleUpgrade(svrRes);
        wrapClientSocket(svrRes);
        resolve(svrRes);
      }, true) || req;
      client.on('error', reject);
    });
    try {
      wrapServerSocket(socket);
      await handleRequest(socket, connect);
      handleUpgrade();
    } catch (err) {
      clearup();
      // 这么写才能在 Network 的 body 里面显示内容
      const body = String(err.stack || '');
      const length = Buffer.byteLength(body);
      socket.write(`HTTP/1.1 502 Bad Gateway\r\nServer: whistle.script\r\nContent-length: ${length}\r\n\r\n${body}`);
    }
  });
};
