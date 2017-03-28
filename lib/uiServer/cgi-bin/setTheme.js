
module.exports = function () {
  console.log('theme', this.request.body);
  this.body = { ec: 0 };
};
