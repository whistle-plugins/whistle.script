
module.exports = function () {
  console.log('settings', this.request.body);
  this.body = { ec: 0 };
};
