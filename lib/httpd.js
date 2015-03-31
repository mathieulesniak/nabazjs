var serverConfig    = require('../serverconfig.js');
var fs              = require('fs');
var express         = require('express')
var winston = require('winston'),
    expressWinston = require('express-winston');

var app             = express()
var execSync        = require('exec-sync');


app.use(expressWinston.logger({
      transports: [
        new winston.transports.Console({
          json: false,
          colorize: true,
          timestamp:true
        })
      ],
      meta: false, // optional: control whether you want to log the meta data about the request (default to true)
      msg: "[HTTP] {{req.connection.remoteAddress}} - {{req.method}} {{req.url}} - {{res.statusCode}} - {{res.responseTime}}ms", // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
      expressFormat: false, // Use the default Express/morgan request formatting, with the same colors. Enabling this will override any msg and colorStatus if true. Will only output colors on transports with colorize set to true
      colorStatus: true // Color the status code, using the Express/morgan color palette (default green, 3XX cyan, 4XX yellow, 5XX red). Will not be recognized if expressFormat is true
    }));


// Static files
app.use('/resources', express.static('resources'));
app.set('view engine', 'jade');
app.set('views', './views');

// Rabbit boot related files
app.get('/bc.jsp', function (req, res) {
    var bootCode = fs.readFileSync('resources/boot/bootc');
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end(bootCode);
})

app.get('/locate.jsp', function (req, res) {
    var content = "ping " + serverConfig.httpHost + "\n"
                + "broad " + serverConfig.xmppDomain + "\n"
                + "xmpp_domain " + serverConfig.xmppDomain + "\n";
    
    res.set({'Content-Type':'text/plain'});
    res.end(content);
})

// Api routing
app.get('/1.0/list-rabbits', function (req, res) {
    res.end(JSON.stringify(burrow.listRabbits()));
});

app.get('/1.0/rabbit/sleep', function (req, res) {
    burrow.getRabbit(req.query.rabbit).sleep()
    res.end("ok");
});

app.get('/1.0/rabbit/wakeup', function (req, res) {
    burrow.getRabbit(req.query.rabbit).wakeUp()
    res.end("ok");
})

app.get('/1.0/rabbit/nap', function (req, res) {
    burrow.getRabbit(req.query.rabbit).nap(req.query.until);
    res.end("ok");
})

app.get('/1.0/rabbit/reboot', function (req, res) {
    burrow.getRabbit(req.query.rabbit).reboot()
    res.end("ok");
})

app.get('/1.0/rabbit/load-config', function (req, res) {
    burrow.getRabbit(req.query.rabbit).loadConfig()
    res.end("ok");
})

app.get('/1.0/rabbit/save-config', function (req, res) {
    burrow.getRabbit(req.query.rabbit).saveConfig()
    res.end("ok");
})

app.get('/1.0/rabbit/command', function (req, res) {
    burrow.getRabbit(req.query.rabbit).talk(req.query.text)
    res.end("ok");
})

app.get('/1.0/rabbit/surprise', function (req, res) {
    burrow.getRabbit(req.query.rabbit).surprise();
    res.end("ok");
});

app.get('/1.0/rabbit/ambiant', function (req, res) {
    burrow.getRabbit(req.query.rabbit).setAmbiant([[req.query.service, req.query.value]]);
    res.end("ok");
});

app.get('/1.0/rabbit/ears', function (req, res) {
    burrow.getRabbit(req.query.rabbit).setEars(parseInt(req.query.left), parseInt(req.query.right));
    res.end("ok");
});

app.get('/1.0/rabbit/speak', function (req, res) {
    var rabbit = burrow.getRabbit(req.query.rabbit);

    if (typeof req.query.mp3 == 'undefined') {
        var exec = require('child_process').exec,
            child;
            child = exec('/usr/bin/wget -q -U Mozilla "http://translate.google.com/translate_tts?ie=UTF-8&tl=fr&q=' + encodeURIComponent(req.query.text) + '" -O ./storage/tts/' + rabbit.macAddress + '.mp3', function(error, stdout, stderr) {
                rabbit.talk('MU http://' + serverConfig.httpHost + '/1.0/rabbit/speak?rabbit=' + rabbit.macAddress + '&mp3=1');
                res.end('ok');
            });

    } else {
        res.writeHead(200, {'Content-Type': 'audio/mpeg'});
        var mp3 = fs.readFileSync('./storage/tts/' + rabbit.macAddress + '.mp3');
        res.end(mp3);
    }
})

app.get('/admin', function (req,res) {
    res.render('index');
})

app.get('/admin/bunnies', function (req, res) {
    res.render('bunnies-list', {bunnies: burrow.listRabbits()});
})

app.get('/admin/bunnies/:rabbitMac', function (req, res) {
    res.render('bunny-hp', {bunny: burrow.getRabbit(req.params.rabbitMac).export()});
})

app.get('/admin/bunnies/:rabbitMac/ears', function (req, res) {
    res.render('bunny-ears', {bunny: burrow.getRabbit(req.params.rabbitMac).export()});
})

app.get('/admin/bunnies/:rabbitMac/nap', function (req, res) {
    res.render('bunny-nap', {bunny: burrow.getRabbit(req.params.rabbitMac).export()});
})

app.get('/admin/bunnies/:rabbitMac/talk', function (req, res) {
    res.render('bunny-talk', {bunny: burrow.getRabbit(req.params.rabbitMac).export()});
})

app.get('/admin/bunnies/:rabbitMac/configure', function (req, res) {
    res.render('bunny-configure', {bunny: burrow.getRabbit(req.params.rabbitMac).export()});
})

var httpServer = app.listen(2222, function () {
    var host = httpServer.address().address;
    var port = httpServer.address().port;

    winston.info("HTTP server listening on %s:%s", host, port);

    

});

module.exports = httpServer;


/*
httpServer.prototype = {
    init: function() {
    },
    start: function() {
        var server = http.createServer(this.handleRequest);
        server.listen(2222, function(){
            logger.info("HTTP server listening on localhost:2222");
});
    },
    handleRequest: function handleRequest(request, response){
        try {
            logger.info('[HTTP] - ' + request.connection.remoteAddress + ' - ' + request.url);
            
            //Disptach
            HttpDispatcher.dispatch(request, response);
        } catch(err) {
            console.log(err);
        }
    }
}

module.exports = httpServer;
*/