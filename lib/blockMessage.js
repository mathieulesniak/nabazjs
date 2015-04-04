var sprintf = require("sprintf-js").sprintf;


var blockMessage = function() {
    this.type   = null;
    this.data   = '';
}

blockMessage.prototype = {
    setType: function(type) {
        this.type = type;
    },
    buildAmbiant: function(servicesList) {
        this.type = '04';
        this.data = '7ffffffe'
        for (var i = 0, len=servicesList.length; i < len; i++) {
            this.data += servicesList[i][0] + servicesList[i][1];
        }
        this.data += 'ff';
        return this;
    },
    buildMessage: function(msg) {
        this.type = '0a';
        this.data = this._encodeText(msg);

        return this;
    },
    buildSleep: function() {
        this.type = '0b';
        this.data = '01';

        return this;
    },
    buildWakeUp: function() {
        this.type = '0b';
        this.data = '00';

        return this;
    },
    buildReboot: function() {
        this.type = '09';
        this.data = '';
        return this;
    },
    _craft: function() {
        var output = '7f'
            + this.type
            + sprintf('%06x', this.data.length / 2);
        if (this.data.length > 0) {
            output += this.data;
        }
        output += 'ff';

        return output;
    },
    _encodeText: function(text) {
        var inversion = [1, 171, 205, 183, 57, 163, 197, 239, 241, 27, 61, 167, 41, 19, 53, 223, 225, 139, 173, 151, 25, 131, 165, 207, 209, 251, 29, 135, 9, 243, 21, 191, 193, 107, 141, 119, 249, 99, 133, 175, 177, 219, 253, 103, 233, 211, 245, 159, 161, 75, 109, 87, 217, 67, 101, 143, 145, 187, 221, 71, 201, 179, 213, 127, 129, 43, 77, 55, 185, 35, 69, 111, 113, 155, 189, 39, 169, 147, 181, 95, 97,11, 45, 23, 153, 3, 37, 79, 81, 123, 157, 7, 137, 115, 149, 63, 65, 235, 13, 247, 121, 227, 5, 47, 49, 91, 125, 231, 105, 83, 117, 31, 33, 203, 237, 215, 89, 195, 229, 15, 17, 59, 93, 199, 73, 51, 85, 255];
        var binary = '00';
        var previousChar = 35;
        for (var i = 0;i < text.length; i++) {
            var currentChar = text.charCodeAt(i);
            var code = (inversion[previousChar%128] * currentChar + 47) % 256;
            previousChar = currentChar;
            var encodedChar = code.toString(16);
            if (encodedChar.length == 1) {
                encodedChar = '0' + encodedChar;
            }
            binary += encodedChar;
        }
        return binary;
    },
    exportInBase64: function() {
        var result = new Buffer(this._craft(), 'hex').toString('base64');

        return result;
    }
}

module.exports = blockMessage;