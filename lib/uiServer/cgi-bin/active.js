
module.exports = function () {
  const name = this.request.body.name;
  if (name && typeof name === 'string') {
    this.storage.setProperty('activeName', name);
  }
  this.body = { ec: 0 };
};
