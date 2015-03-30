var serverConfig    = require('./serverconfig.js');
var logger          = require('./lib/logger.js'); 
var rabbitServer    = require('./lib/rabbitServer.js');
var httpServer      = require('./lib/httpd.js');

burrow = new rabbitServer();
burrow.start();


