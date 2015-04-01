var net     = require('net');
var logger  = require('winston');
var bunny   = require('./bunny.js');

var rabbitServer = function(options) {
    this.options = options;
    this.options = options ||{};

    this.rabbits = [];

    this.init();
}

rabbitServer.prototype = {
    init: function() {
    },
    start: function() {
        var connId = 0;
        var that = this;
        logger.info("Starting XMPP server on port 5222");
        var server = net.createServer(function (socket) {
            socket.setTimeout(15000, function(){
                logger.log("Closing socket after timeout");
                socket.end();
            });
            var client = new bunny(),
                connKey = '_' + connId++;
        
            client.socket = socket;
            client._connKey = connKey;

            that.rabbits[connKey] = client;

            client.on('ready', function() {
                console.log("Client is ready");
            });
            client.on('identify', function() {
                console.log('Bunny identified');
            });

            client.on('disconnect', function() {
                delete that.rabbits[connKey];
            })


            client.init();
            socket.on('data', function(data) {
                client.parseMessage(data.toString());
            });

            socket.on('end', function() {
                console.log("SERVER SOCKET CLOSE");
                
                console.log(connKey);
                console.log(that.rabbits);
                delete that.rabbits[connKey];
                console.log(that.rabbits);
                
            });
         });

        server.on('error', function(error) {
            console.log("socket error " + error);
        });


        server.listen(5222);
    },
    getRabbit: function(macAddress) {
        for (var i in this.rabbits) {
            console.log(macAddress);
            console.log(this.rabbits[i].macAddress);
            if (this.rabbits[i].macAddress == macAddress) {

                return this.rabbits[i];
            }
        }
        return false;
    },
    listRabbits: function()
    {
        console.log("list rabbits");
        result = [];
        for (var i in this.rabbits) {
            item = this.rabbits[i];
            var rabbit = item.export();

            result.push(rabbit);
        }

        return result;
    }
}


module.exports = rabbitServer;
