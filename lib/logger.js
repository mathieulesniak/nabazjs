var logger      = require('winston');

logger.remove(logger.transports.Console);
logger.level = 'debug';
logger.add(logger.transports.Console, {'level': 'debug','timestamp':true,'colorize':true});

module.exports=logger;