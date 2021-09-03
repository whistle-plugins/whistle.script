module.exports = function(server) {
  server.on('connect', (_, socket) => {
    socket.pipe(socket);
  });
};
