
module.exports = function () {
  console.log('lineNumber', this.request.body);
  this.body = { ec: 0 };
};
