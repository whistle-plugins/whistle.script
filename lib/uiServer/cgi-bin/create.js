
module.exports = function () {
  console.log('create', this.request.body);
  this.body = { ec: 0 };
};
