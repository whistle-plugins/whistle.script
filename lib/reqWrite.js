
module.exports = (server/* , options */) => {
  server.on('request', (req, res) => {
    req.pipe(res);
  });
};
