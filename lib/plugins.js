var plugins = function(rabbit) {
    this.rabbit         = rabbit;
}

plugins.prototype = {
    repeat: function() {
        if (this.rabbit.lastReceivedMessage != null) {
            this.rabbit.talk(this.rabbit.lastReceivedMessage);
        }
    }
}

module.exports = plugins;
