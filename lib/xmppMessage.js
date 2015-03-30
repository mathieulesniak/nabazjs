var blockMessage = require('./blockMessage.js');
var blockMsg = new blockMessage();

var xmppMessage = function(to, messageId) {
    this.to         = to;
    this.messageId  = messageId;
}

xmppMessage.prototype = {
    unbindJid: function(type) {
        return "<iq id='" + this.messageId + "' type='result' />";
    },
    bindJid: function(type) {
        to = this.to.substring(0, this.to.indexOf('/'));
        var answer = "<iq id='" + this.messageId + "' type='result'>"
            + "<bind xmlns='urn:ietf:params:xml:ns:xmpp-bind'>"
            + "<jid>"
            + to + '/' + type
            + "</jid></bind></iq>";
        
        return answer;
    },
    session: function() {
        var answer = "<iq type='result' to='" + this.to + "' from='xmpp.nabaztag.com' id='" + this.messageId  + "'>"
                + "<session xmlns='urn:ietf:params:xml:ns:xmpp-session'/></iq>";
        return answer;
    },
    source: function() {
        var answer = "<iq from='net.violet.platform@xmpp.nabaztag.com/sources' to='" + this.to + "' id='" + this.messageId + "' type='result'>"
                + "<query xmlns='violet:iq:sources'>"
                + "<packet xmlns='violet:packet' format='1.0' ttl='604800'>fwQAAAx////+BAAFAA7/CAALAAABAP8=</packet>"
                + "</query>"
                + "</iq>";

        return answer;
    },
    presence: function() {
        return "<presence from='"  + this.to + "' id='" +this.messageId + "'></presence>";
    },
    sleep: function() {
        return this._buildMessagePacket(blockMsg.buildSleep().exportInBase64());
    },
    wakeUp: function() {
        return this._buildMessagePacket(blockMsg.buildWakeUp().exportInBase64());
    },
    reboot: function() {
        return this._buildMessagePacket(blockMsg.buildReboot().exportInBase64());
    },
    nabazLang: function(text) {
        message = blockMsg.buildMessage(text);

        return this._buildMessagePacket(message.exportInBase64());
    },
    setAmbiant: function (serviceList) {
        message = blockMsg.buildAmbiant(serviceList);

        return this._buildMessagePacket(message.exportInBase64());  
    },
    _buildMessagePacket: function(message) {
        return "<message from='net.violet.platform@xmpp.nabaztag.com/sources' to='" + this.to + "' id='" + this.messageId + "'>"
            + "<packet xmlns='violet:packet' format='1.0'>"
            + message
            + "</packet>"
            + "</message>";
    }

}

module.exports = xmppMessage;
