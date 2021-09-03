module.exports = function(server) {
  server.on('request', (req, res) => {
    req.pipe(res);
  });
};
