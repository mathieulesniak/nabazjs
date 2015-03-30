var API_VERSION = '1.0';
var RABBIT_API_ROOT = '/' + API_VERSION + '/rabbit';

function doReboot(rabbitId)
{
    var ret = confirm("Reboot ?");
    if (ret) {
        $.getJSON(RABBIT_API_ROOT + '/reboot?rabbit=' + rabbitId, function (json) {
            console.log(json);
        });
    }
}

function doTalk(rabbitId)
{
    var tts = $("#text").val();
    $.getJSON(RABBIT_API_ROOT + '/speak?rabbit=' + rabbitId + '&text=' + tts, function (json) {
            console.log(json);
        });
    return false;
}

function doEars(rabbitId)
{
    $.getJSON(RABBIT_API_ROOT + '/ears?rabbit=' + rabbitId + '&left=' + $("#ear-left").val() + '&right=' + $("#ear-right").val(), function (json) {
            console.log(json);
        });
    return false;
}