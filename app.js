const http = require('http');
const startUIServer = require('./lib').uiServer;

const server = http.createServer().listen(9999);
startUIServer(server, {});

var index = 0;
setInterval(function() {
  console.log(new Error('===' + index++), { abc: 123 });
  console.fatal(new Error('===' + index++), { abc: 123 });
  console.error(new Error('===' + index++), { abc: 123 });
  console.warn(new Error('===' + index++), { abc: 123 });
  console.info(new Error('===' + index++), { abc: 123 });
  console.debug(new Error('===' + index++), { abc: 123 });
  console.trace(new Error('===' + index++), { abc: 123 });
}, 1000);
