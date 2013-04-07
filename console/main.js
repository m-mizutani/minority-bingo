var ws = null;
var global_conf = null;

function ws_send (cmd, data) {
  if (data === undefined) {
    ws.send (JSON.stringify ({cmd: cmd}));
  }
  else {
    ws.send (JSON.stringify ({cmd: cmd, data: data}));
  }
}

function setup_websocket () {
  port = 9081;
  if ("WebSocket" in window) {
    var server = location.hostname;
    ws = new WebSocket('ws://' + server + ':' + port);
    ws.onopen = function() {
    };
    ws.onmessage = function (ev) {
      jdata = JSON.parse (ev.data);
      switch (jdata.cmd) {
      case 'show': 
        var stat = {};
        for (var t in jdata.data) {
          var n = jdata.data[t];
          stat[n] = (stat[n] === undefined) ? 1 : stat[n] + 1;
        }
        for (var n in stat) {
          $('#val_' + n).text (stat[n]);
        }
        break;

      case 'res': 
        console.log (jdata.data);
        $('#elected').empty ();
        $('#elected').append ('Result: ' + jdata.data);
        jdata.data.forEach (function (n) {
          ws_send ('fix', n);
          $('#item_' + n).addClass ('elected');
        });
        
        break;
      }
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

  $.ajax ({url: '/conf.json'}).done (function (data) {
    global_conf = data;
    tbl = '<table><tbody>';
    for (var i = 1; i <= global_conf.vote.max; i++) {
      tbl += '<tr><td id="item_' + i + '">' + i + '</td><td id="val_' + i + '"></td></tr>';
    }
    tbl += '</tbody></table>';

    $('#stat').empty ();
    $('#stat').append (tbl);
  });

  $('#start_btn').click (function () {
    ws_send ('start');
    var count = 5;

    for (var i = 1; i <= global_conf.vote.max; i++) {
      $('#val_' + i).empty ();
    }

    var timer_id = setInterval (function () {
      $('#count').text (count);
      ws_send ('show');
      if (count === 0) {
        ws_send ('stop');
        ws_send ('res');
        clearInterval (timer_id);
      }
      count--;
    }, 1000);
  });
  $('#result_btn').click (function () {
    ws_send ('show');
  });
});
