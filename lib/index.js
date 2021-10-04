const handlePipe = require('./pipe');

exports.auth = require('./auth');
exports.sniCallback = require('./sniCallback');
exports.uiServer = require('./uiServer');
exports.rulesServer = require('./rulesServer');
exports.resRulesServer = require('./resRulesServer');
exports.tunnelRulesServer = require('./tunnelRulesServer');
exports.server = require('./server');
exports.tunnelServer = require('./tunnelServer');

exports.reqRead = handlePipe('reqRead');
exports.reqWrite = handlePipe('reqWrite');
exports.resRead = handlePipe('resRead');
exports.resWrite = handlePipe('resWrite');
exports.wsReqRead = handlePipe('wsReqRead');
exports.wsReqWrite = handlePipe('wsReqWrite');
exports.wsResRead = handlePipe('wsResRead');
exports.wsResWrite = handlePipe('wsResWrite');
exports.tunnelReqRead = handlePipe('tunnelReqRead');
exports.tunnelReqWrite = handlePipe('tunnelReqWrite');
exports.tunnelResRead = handlePipe('tunnelResRead');
exports.tunnelResWrite = handlePipe('tunnelResWrite');
