
module.exports = function () {
  console.log('rename', this.request.body);
  this.body = { ec: 0 };
};
