
module.exports = function() {
  console.log('active', this.request.body);
  this.body = { ec: 0 };
};
