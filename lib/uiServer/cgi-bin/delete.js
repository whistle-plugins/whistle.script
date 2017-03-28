
module.exports = function () {
  const name = this.request.body.name;
  if (name && typeof name === 'string') {
    this.storage.removeFile(name);
  }
  this.body = { ec: 0 };
};
