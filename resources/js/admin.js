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
    earLeft = $("#ear-left").val();
    earRight = $("#ear-right").val();
    
    
    $.getJSON(RABBIT_API_ROOT + '/ears?rabbit=' + rabbitId + '&left=' + earLeft + '&right=' + earRight, function (json) {
            console.log(json);
        });
    return false;
}

function doInsomniac(rabbitId, mode)
{
    $.getJSON(RABBIT_API_ROOT+ '/insomniac',
        {
            rabbit: rabbitId,
            insomniac: mode
        },
        function (json) {
            console.log(json);
        }
    );
}
function doConfig(rabbitId)
{
    $.getJSON(RABBIT_API_ROOT+ '/save-config', 
        {
            rabbit: rabbitId,
            friendlyName: $('#rabbit-name').val(),
            breathe: $('#rabbit-breathe').val(),
            surprise: $('#rabbit-surprise').val(),
            taichi: $('#rabbit-taichi').val(),
            clock: $('#rabbit-clock').is(':checked') ? 1 : 0
        },
        function (json) {
            console.log(json);
        })
}