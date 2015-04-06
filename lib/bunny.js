var serverConfig    = require('../serverconfig.js');
var logger          = require('winston');
var os              = require("os");
var fs              = require("fs");
var merge           = require('merge');
var EventEmitter    = require('events').EventEmitter;
var extend          = require('xtend');
var xml2js          = require('xml2js');
var sprintf         = require("sprintf-js").sprintf;
var xmppMessage     = require('./xmppMessage.js');
var plugins         = require('./plugins.js');

var parser = new xml2js.Parser();


var bunny = function() {
    this.socket         = null;
    this._connKey       = null;
    this.authenticated  = false;
    this._authStep      = 0;
    this.macAddress     = '';
    this._messageId     = 0;
    this._resource      = '';
    this.config         = {
        'friendlyName': '',
        'clock': false,
        'hours':[],
        'taichi': 255,
        'surprise': 255,
        'breathe': 5,
        'simpleclick': 'repeat',
        'doubleclick': null,
        };

    this._lastCronDate      = new Date();
    this._lastSurpriseDate  = new Date();
    this._surpriseMeanTime  = null;
    this.napUntil           = null;
    this.insomniac          = false;
    this.lastReceivedMessage= null;
}

bunny.prototype =  extend(EventEmitter.prototype, {
    init: function() {
        var that = this;
        this.socket.setNoDelay(true);
        this.socket.setKeepAlive(true, 15 * 1000); //every 15 second(s)
        this.socket.on('error', function (err) {
            that.disconnect("socket error " + err);
        });
        this.socket.on('close', function (err) { that.disconnect("socket close " + err); });
        this.socket.on('timeout', function (err) { that.disconnect("socket timeout " + err); });

        this.ready();
    },
    getJid: function() {
        if (this.authenticated) {
            return this.macAddress + '@' + serverConfig.xmppDomain + '/' + this._resource;
        } else {
            return '';
        }
    },
    getIp: function() {
        return this.socket.remoteAddress;
    },
    getStatus: function() {
        return this._resource;
    },
    getName: function() {
        if (this.config.friendlyName != '') {
            return this.config.friendlyName + '(' + this.macAddress + ')';
        } else {
            return this.macAddress;
        }
    },
    isAsleep: function() {
        return this._resource == 'asleep';
    },
    export: function() {
        return {
            'jid': this.getJid(),
            'macAddress': this.macAddress,
            'friendlyName': this.getName(),
            'ip':this.getIp(),
            'status': this.getStatus(),
            'config': this.config,
            'insomniac': this.insomniac
        };
    },
    loadConfig: function() {
        var that = this;
        logger.info('[' + that.getJid() + '] tring to load config from FS');
        fs.exists('./storage/bunnies/' + this.macAddress + '.json', function(exists) {
            if (exists) {
                logger.info('[' + that.getJid() + '] loading config from FS');
                fs.readFile('./storage/bunnies/' + that.macAddress + '.json', function(err, data) {
                    if (err) {
                        console.log('Error: ' + err);
                        return;
                    }
                    that.config = merge(that.config, JSON.parse(data));
                    that.applyConfig();
                });
            } else {
                that.applyConfig();
            }
        });
    },
    saveConfig: function() {
        logger.info('[' + this.getJid() + '] saving config to FS');
        fs.writeFile('./storage/bunnies/' + this.macAddress + '.json', JSON.stringify(this.config));
    },
    applyConfig: function() {
        logger.info('[' + this.getJid() + '][CONFIG] applying config')
        
        if (typeof this.config.taichi != 'undefined') {
            this.setTaichi(parseInt(this.config.taichi));
        }

        if (typeof this.config.surprise != 'undefined') {
            if (this.config.surprise == 0) {
                this._surpriseMeanTime = null;
                this.info("[" + this.getJid() + "][CONFIG] disabling surprises");
            } else {
                var meanTimeInSec = (250/this.config.surprise) * 10 * 60;
                var randomRatio = 300;
                var delta = Math.floor(Math.random() * (randomRatio + randomRatio) - randomRatio);
                this._surpriseMeanTime = Math.floor(meanTimeInSec +delta);
                logger.info("[" + this.getJid() + "][CONFIG] Setting surprise to every %s seconds", this._surpriseMeanTime);
            }
        }

        if (typeof this.config.breathe != 'undefined') {
            this.setBreatheColor(this.config.breathe);
        }
    },
    parseMessage: function(message) {
        var that = this;
        logger.debug('[' + this.getJid() + '][MSGin] ' + message);

        if (message == ' ') {
            logger.info('[' + this.getJid() + '] ping');
            this.doCronjobs();
        } else {
            parser.parseString(message, function(err, parsedMessage){
                if (that.authenticated == false) {
                    that.auth(parsedMessage);
                } else {
                    switch(Object.keys(parsedMessage)[0]) {
                        case 'iq':
                            that.handleIqMessage(parsedMessage);
                            break;
                        case 'presence':
                            that.handlePresenceMessage(parsedMessage);
                            break;
                        case 'message':
                            that.handleMessageMessage(parsedMessage);
                            break;
                    }
                }
            });
            
        }
    },
    doCronjobs: function() {

        var zeDate      = new Date();
        var currentTime = parseInt(zeDate.getHours().toString() + sprintf('%02d', zeDate.getMinutes()));
        var lastTime    = parseInt(this._lastCronDate.getHours().toString() + sprintf('%02d', this._lastCronDate.getMinutes()));

        if (this._resource != 'asleep') {
            if (this.config.clock && zeDate.getHours() != this._lastCronDate.getHours()) {
               this.launchPlugin('clock');
            }

            if (this._surpriseMeanTime != null) {
                if (Math.floor((zeDate - this._lastSurpriseDate) / 1000) >= this._surpriseMeanTime) {
                    this.launchPlugin('surprise');
                    this._lastSurpriseDate = zeDate;
                }
            }
        }

        // WakeUp / go to sleep
        if (currentTime != lastTime) {
            if (this.napUntil != null) {
                if (this._resource == 'asleep') {
                    if (currentTime >= this.napUntil) {
                        this.napUntil = null;
                        this.wakeUp();
                    }
                }
            } else {
                if (this.insomniac) {
                    if (this._resource == 'asleep') {
                        this.wakeUp();
                    }
                } else {
                    if (typeof this.config.hours[zeDate.getDay()] != 'undefined') {
                        if (currentTime < this.config.hours[zeDate.getDay()].wake || currentTime >= this.config.hours[zeDate.getDay()].sleep) {
                            if (this._resource == 'idle') {
                               this.sleep();
                            }
                        } else if (currentTime >= this.config.hours[zeDate.getDay()].wake && currentTime < this.config.hours[zeDate.getDay()].sleep) {
                            if (this._resource == 'asleep') {
                                this.wakeUp()
                            }
                        }
                    }
                }
            }
        }
    
        this._lastCronDate = zeDate;
    },
    ready: function() {
        logger.info("I'm ready");
        this.emit('ready');
    },

    disconnect: function(msg) {
        this.emit('disconnect');
    },
    rawSend: function(msg) {
        logger.log('debug', '[' + this.getJid() + '][MSGout] ' + msg);
        this.socket.write(msg);
    },
    auth: function(parsedMessage) {
        
        logger.info("[AUTH][" +  this.getJid() + "][" + this._authStep +"]");
        if (this._authStep == 0) {
            this.rawSend("<?xml version='1.0'?>"
            + "<stream:stream xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' id='2173750751' from='pookie.eskuel.net' version='1.0' xml:lang='en'>"
            + "<stream:features>"
            + "<mechanisms xmlns='urn:ietf:params:xml:ns:xmpp-sasl'>"
            + "<mechanism>DIGEST-MD5</mechanism>"
            + "<mechanism>PLAIN</mechanism>"
            + "</mechanisms>"
            + "<register xmlns='http://violet.net/features/violet-register'/>"
            + "</stream:features>");
            this._authStep = 1;
        } else if (this._authStep == 1) {
            var nonce = parseInt(Math.random() * 10000) + 1;
            var challenge = new Buffer("nonce=\"" + nonce + "\",qop=\"auth\",charset=utf-8,algorithm=md5-sess").toString('base64');
            var answer = "<challenge xmlns='urn:ietf:params:xml:ns:xmpp-sasl'>"  + challenge + "</challenge>";
            
            this.rawSend(answer);
            
            this._authStep = 2
        } else if (this._authStep == 2) {
            var authResponse = new Buffer(parsedMessage.response._, 'base64').toString();
            var macAddress = authResponse.match(/username="([0-9a-f]{12})"/);
            this.macAddress = macAddress[1]
            logger.info("[AUTH] client is now known as " + this.macAddress);
            this.rawSend("<success xmlns='urn:ietf:params:xml:ns:xmpp-sasl'/>");
            this._authStep = 3;
        } else if (this._authStep == 3) {
            
            var answer = "<?xml version='1.0'?>"
                    + "<stream:stream xmlns='jabber:client' xmlns:stream='http://etherx.jabber.org/streams' id='" + (this._messageId+1) + "' from='xmpp.nabaztag.com' version='1.0' xml:lang='en'>"
                    + "<stream:features><bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'><required/></bind><unbind xmlns='urn:ietf:params:xml:ns:xmpp-bind'/><session xmlns='urn:ietf:params:xml:ns:xmpp-session'/></stream:features>";
            this.rawSend(answer);
            this._authStep = 0;
            this.authenticated = true;
            this.loadConfig();
        }

    },
    handleIqMessage: function(parsedMessage) {
        this._messageId = parsedMessage.iq.$.id;
        var xmpp = new xmppMessage(parsedMessage.iq.$.from, this._messageId);

        if (parsedMessage.iq.$.type == 'set') {
            // bind
            if (typeof parsedMessage.iq.bind !='undefined') {
                this._resource = parsedMessage.iq.bind[0].resource[0];
                this.rawSend(xmpp.bindJid(this._resource));
            }
            // unbind
            if (typeof parsedMessage.iq.unbind !='undefined') {
                this.rawSend(xmpp.unbindJid());
            }

            if (typeof parsedMessage.iq.session != 'undefined') {
                this.rawSend(xmpp.session());
            }
        } else {
            if (typeof parsedMessage.iq.query != 'undefined' && typeof parsedMessage.iq.query[0].packet != 'undefined') {
                this.rawSend(xmpp.source());
            }
        }
    },
    handlePresenceMessage: function(parsedMessage) {
        var xmpp = new xmppMessage(parsedMessage.presence.$.from, parsedMessage.presence.$.id);
        this.rawSend(xmpp.presence());
    },
    handleMessageMessage: function(parsedMessage) {
        if (typeof parsedMessage.message.button != 'undefined') {
            logger.debug("[" + this.getJid()  + "]Button clicked");
            
            if (parseInt(parsedMessage.message.button[0].clic[0]) == 1) {
                this.launchPlugin(this.config.simpleclick);
            } else {
                this.launchPlugin(this.config.doubleclick);
            }
        } else if (typeof parsedMessage.message.ears != 'undefined') {
            logger.debug("[" + this.getJid()  + "]ears moved");
        }
    },
    launchPlugin: function(pluginName) {
        logger.debug("[" + this.getJid()  + "] launchPlugin " + pluginName);
        plugin = new plugins(this);
        switch (pluginName) {
            case 'repeat':
                plugin.repeat();
                break;
        }
    },
    talk: function(text) {
        logger.info('[' + this.getJid() + '] talk');
        var xmpp = new xmppMessage(this.getJid(), ++this._messageId);
        this.lastReceivedMessage = text;
        this.rawSend(xmpp.nabazLang(text));
    },
    setAmbiant: function(serviceList) {
        logger.info('[' + this.getJid() + '] ambiant');
        logger.info(serviceList);
        var xmpp = new xmppMessage(this.getJid(), ++this._messageId);
        this.rawSend(xmpp.setAmbiant(serviceList));
    },
    setWeather: function(weatherIndex) {
        logger.info('[' + this.getJid() + '] set weather');
        this.setAmbiant([['01', sprintf('%02x', weatherIndex)]]);
    },
    setStock: function(stockIndex) {
        logger.info('[' + this.getJid() + '] set stock');
        this.setAmbiant([['02', sprintf('%02x', stockIndex)]]);
    },
    setTraffic: function(trafficIndex) {
        logger.info('[' + this.getJid() + '] set traffic');
        this.setAmbiant([['03', sprintf('%02x', trafficIndex)]]);
    },
    setEars: function(left, right) {
        logger.info('[' + this.getJid() + '] set ears pos');
        var ambiantValues = [['04', sprintf('%02x', left)], ['05', sprintf('%02x', right)]];
        this.setAmbiant(ambiantValues)
    },
    setEmail: function(emailIndex) {
        logger.info('[' + this.getJid() + '] set email');
        this.setAmbiant([['06', sprintf('%02x', emailIndex)]]);
    },
    setAir: function(airIndex) {
        logger.info('[' + this.getJid() + '] set air');
        this.setAmbiant([['07', sprintf('%02x', airIndex)]]);
    },
    setNose: function(noseIndex) {
        logger.info('[' + this.getJid() + '] set nose');
        this.setAmbiant([['08', sprintf('%02x', noseIndex)]]);
    },
    setBreatheColor: function(color) {
        logger.info('[' + this.getJid() + '] set breathe color');
        this.setAmbiant([['09', sprintf('%02x', color)]]);
    },
    setTaichi: function(frequency) {
        logger.info('[' + this.getJid() + '] set taïchi to frequency ' + frequency);
        this.setAmbiant([['0e', sprintf('%02x', frequency)]]);
    },
    sleep: function() {
        logger.info('[' + this.getJid() + '] going to sleep');
        var xmpp = new xmppMessage(this.getJid(), ++this._messageId);
        
        this.rawSend(xmpp.sleep());
    },
    nap: function(until) {
        logger.info('[' + this.getJid() + '] going for a nap until ' + until);
        this.napUntil = until;
        var xmpp = new xmppMessage(this.getJid(), ++this._messageId);
        
        this.rawSend(xmpp.sleep());
    },
    wakeUp: function() {
        logger.info('[' + this.getJid() + '] wake up');
        var xmpp = new xmppMessage(this.getJid(), ++this._messageId);
        this.rawSend(xmpp.wakeUp());
    },
    reboot: function() {
        logger.info('[' + this.getJid() + '] reboot');
        var xmpp = new xmppMessage(this.getJid(), ++this._messageId);
        this.rawSend(xmpp.reboot());
    }
});


module.exports = bunny;

