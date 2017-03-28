
module.exports = function () {
  const body = this.request.body;
  if (body.name && body.newName) {
    this.storage.renameFile(body.name, body.newName);
  }
  this.body = { ec: 0 };
};
