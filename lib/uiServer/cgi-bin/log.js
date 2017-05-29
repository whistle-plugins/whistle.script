
module.exports = () => {
  this.body = this.getLogs(this.request.query.id);
};
