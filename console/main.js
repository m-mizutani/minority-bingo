var ws = null;
function setup_websocket () {
  port = 9081;
  if ("WebSocket" in window) {
    var server = location.hostname;
    console.log (server);
    ws = new WebSocket('ws://' + server + ':' + port);
    ws.onopen = function() {
    };
    ws.onmessage = function (ev) {
      jdata = JSON.parse (ev.data);
      console.log (jdata);
    };
    ws.onclose = function() {
      setTimeout (setup_websocket, 1000);
    };
  } else {
    // the browser doesn't support WebSocket.
  }
}


$(document).ready (function () {
  setup_websocket ();

  $('#start_btn').click (function () {
    ws.send (JSON.stringify ({cmd: 'start'}));
  });
  $('#result_btn').click (function () {
    ws.send (JSON.stringify ({cmd: 'show'}));
  });
});
