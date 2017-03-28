
module.exports = function () {
  const body = this.request.body;
  if (body.name && typeof body.name === 'string') {
    this.storage.writeFile(body.name, body.value);
  }
  this.body = { ec: 0 };
};
