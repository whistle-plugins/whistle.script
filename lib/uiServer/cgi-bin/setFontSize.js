
module.exports = function () {
  const fontSize = this.request.body.fontSize;
  if (fontSize && typeof fontSize === 'string') {
    this.storage.setProperty('fontSize', fontSize);
  }
  this.body = { ec: 0 };
};
