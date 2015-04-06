var serverConfig    = require('../serverconfig.js');
var fs              = require("fs");

var plugins = function(rabbit) {
    this.rabbit         = rabbit;
}

plugins.prototype = {
    repeat: function() {
        if (this.rabbit.lastReceivedMessage != null) {
            this.rabbit.talk(this.rabbit.lastReceivedMessage);
        }
    },
    surprise: function() {
        // Get a random MP3 file for surprise
        var surpriseDir     = './resources/mp3/surprise/fr';
        var files           = this.getMp3FromDirectory(surpriseDir);
        var surpriseNb      = Math.floor(Math.random() * (files.length) + 1);

        var respirationDir  = './resources/mp3/respiration';
        var files           = this.getMp3FromDirectory(respirationDir);
        var respirationNb   = Math.floor(Math.random() * (files.length) + 1);

        var command  = 'MU http://' + serverConfig.httpHost + respirationDir + '/' + respirationNb + '.mp3' + "\n"
                    + 'MW' + "\n"
                    + 'MU http://' + serverConfig.httpHost + surpriseDir + '/' + surpriseNb + '.mp3' + "\n"
                    + 'PL 3' + "\n"
                    + 'MW' + "\n"
                    + 'MU http://' + serverConfig.httpHost + respirationDir + '/' + respirationNb + '.mp3' + "\n"
                    + 'MW' + "\n";
        

        this.rabbit.talk(command);
    },
    clock: function() {
        var zeDate      = new Date();
        // Get a random MP3 file for current hour
        var filesDir    = './resources/mp3/clock/fr/' + sprintf('%02d', zeDate.getHours());
        var files       = this.getMp3FromDirectory(filesDir);
        
        var fileNb      = Math.floor(Math.random() * (files.length) + 1);
        var command  = 'MU http://' + serverConfig.httpHost + '/resources/mp3/clock/fr/signature.mp3' + "\n"
            + 'MW' + "\n"
            + 'MU http://' + serverConfig.httpHost + filesDir + '/' + fileNb + '.mp3' + "\n"
            + 'MW' + "\n"
            + 'MU http://' + serverConfig.httpHost + '/resources/mp3/clock/fr/signature.mp3' + "\n"
            + 'MW';
        this.rabbit.talk(command);
    },
    getMp3FromDirectory: function (directory) {
        var suffix      = '.mp3';
        var files       = fs.readdirSync(directory);
        var goodFiles = []
        for (var i in files) {
            if (files[i].indexOf(suffix, files[i].length - suffix.length) !== -1) {
                goodFiles.push(files[i]);
            }
        }
        return goodFiles;
    },

}

module.exports = plugins;
