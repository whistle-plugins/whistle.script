
module.exports = function () {
  console.log('delete', this.request.body);
  this.body = { ec: 0 };
};
