var ws = null;
var global_conf = null;

function ws_send (cmd, data) {
  console.log (cmd);
  console.log (data);
  if (data === undefined) {
    arg = JSON.stringify ({cmd: cmd});
    console.log (ws);
    ws.send (arg);
  }
  else {
    ws.send (JSON.stringify ({cmd: cmd, data: data}));
  }
}

function setup_websocket (callback) {
  port = 9081;
  if ("WebSocket" in window) {
    var server = location.hostname;
    ws = new WebSocket('ws://' + server + ':' + port);
    console.log (ws);

    ws.onopen = function() {
    };
    ws.onmessage = function (ev) {
      jdata = JSON.parse (ev.data);
      switch (jdata.cmd) {
      case 'start': 
        start_voting (jdata.data);
        break;

      case 'result': 
        $('#reach').empty ();
        $('#bingo').empty ();
        var c = 0;
        for (var t in jdata.data.reach) {
          if (jdata.data.bingo[t] === undefined) {
            c++;
            $('#reach').append ('<p>' + jdata.data.reach[t].name + 'さん</p>');
          }
        }
        if (c === 0) {
          $('#reach').append ('<p>まだいません</p>');
        }

        c = 0;
        for (var t in jdata.data.bingo) {
          c++;
          $('#bingo').append ('<p>' + jdata.data.bingo[t].name + 'さん</p>');
        }
        if (c === 0) {
          $('#bingo').append ('<p>まだいません</p>');
        }
          
        break;

      case 'show': 
        var stat = {};
        for (var t in jdata.data) {
          var n = jdata.data[t];
          stat[n] = (stat[n] === undefined) ? 1 : stat[n] + 1;
        }
        for (var n in stat) {
          for (var i = 0; i < stat[n]; i++) {
            $('#c_' + n + '_' + i).addClass ('voted');
          }
          if (! $('#item_' + n).hasClass ('elected')) {
            $('#val_' + n).text (stat[n] + '票');
          }
        }
        break;

      case 'res': 
        console.log (jdata.data);
        $('#elected').text ('当選番号');

        setTimeout (function () {
          $('#elected').text ('当選番号 ' + jdata.data);
          jdata.data.forEach (function (n) {
            ws_send ('fix', n);
            $('#item_' + n).addClass ('highlight');
            prev_elected = n;
          });
        }, 1000);

        break;

      case 'hist':
        for (var n in jdata.data) {
          set_elected (n);
        }
        break;

      case 'list':
        html = '';
        jdata.data.players.forEach (function (p) {
          html += '<div><p>' + p.name + '</p>';
          html += build_cell (p.cell, jdata.data.history);
          html += '</div>';
        });
        $('#list').empty ();
        $('#list').append (html);
        break;
      }
    };
    ws.onclose = function() {
      setTimeout (setup_websocket, 1000);
    };

    if (callback !== undefined) {
      console.log (ws);
      setTimeout (callback, 500);
      // callback ();
    }
  } else {
    $('#count').empty ();
    $('#count').text ('ブラウザがWebSocketをサポートしていないため、このアプリは利用できません。');
    // the browser doesn't support WebSocket.
  }
}

function set_elected (n) {
  $('#item_' + n).addClass ('elected');
  $('#item_' + n).removeClass ('highlight');
  $('#val_' + n).text ('当選済');
}

function build_cell (cell, hist) {
  var c = 0;
  tbl = '<table><tbody><tr>';
  cell.forEach (function (n) {
    if (c > 0 && c % 5 === 0) {
      tbl += '</tr><tr>';
    }
    c++;
    if (hist[n] === true) {
      tbl += '<td class="elected">' + n + '</td>';
    }
    else {
      tbl += '<td>' + n + '</td>';
    }
  });
  tbl += '</tr></tbody></table>';
  return tbl;
}

var prev_elected = null;

function start_voting (data) {
  var count = data.count;
  var fade_start = data.fade;

  if (prev_elected !== null) {          
    set_elected (prev_elected);
    prev_elected = null;
  }

  $('.voted').removeClass ('voted');
  $('#elected').text ('投票中...');
  for (var i = 1; i <= global_conf.vote.max; i++) {
    if (! $('#item_' + i).hasClass ('elected')) {
      $('#val_' + i).empty ();
    }
  }

  count *= 10;
  var timer_id = setInterval (function () {
    $('#count').text ('後 ' + Math.floor(count / 10) + "." + (count % 10) + '秒');
    if (count % 5 == 0) {
      ws_send ('show');
    }

    if (count === 0) {
      clearInterval (timer_id);
      ws_send ('stop');
      ws_send ('res');
    }
    count--;
  }, 100);
}

$(document).ready (function () {
  var count_max = 15;

  $.ajax ({url: '/conf.json'}).done (function (data) {
    global_conf = data;

    // first build for all 
    tbl = '<table><tbody class="score">';
    for (var i = 1; i <= global_conf.vote.max; i++) {
      tbl += '<tr id="item_' + i + '"><td>' + i + '</td><td id="val_' + i + '" class="count"></td>';
      for (var n = 0; n < count_max; n++) {
        tbl += '<td id="c_' + i + '_' + n + '" class="meter"></td>';
      }
      tbl +='</tr>';
    }
    tbl += '</tbody></table>';

    $('#count').text ('スタートを押して下さい...');    
    $('#stat').empty ();
    $('#stat').append (tbl);
    setup_websocket (function () {
      ws_send ('hist');
      ws_send ('result');
    });
/*
    setTimeout (function () {
      ws_send ('hist');
      ws_send ('result');
    }, 500);
*/
  });

  $('#start_btn').click (function () {
    ws_send ('start');
  });
  $('#result_btn').click (function () {    
    ws_send ('list');
  });

  $('#reset_btn').click (function () {    
    ws_send ('reset');
    setTimeout (function () { location.reload (); }, 500 );
  });

});
