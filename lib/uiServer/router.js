const init = require('./cgi-bin/init');
const create = require('./cgi-bin/create');
const rename = require('./cgi-bin/rename');
const del = require('./cgi-bin/delete');
const settings = require('./cgi-bin/settings');

module.exports = function (router) {
  router.get('/cgi-bin/init', init);
  router.post('/cgi-bin/create', create);
  router.post('/cgi-bin/rename', rename);
  router.post('/cgi-bin/delete', del);
  router.post('/cgi-bin/settings', settings);
};
