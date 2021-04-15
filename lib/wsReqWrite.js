
module.exports = (server/* , options */) => {
  server.on('connect', (req, socket) => {
    socket.pipe(socket);
  });
};
