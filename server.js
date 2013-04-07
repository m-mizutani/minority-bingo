var http = require ('http');
var fs = require ('fs');
var spawn = require('child_process').spawn;

var conf = JSON.parse (fs.readFileSync ('./conf.json'));
var players = JSON.parse (fs.readFileSync ('./player.json'));

var player_table = {};
players.forEach (function (p) {
  player_table[p.token] = p;
});

var vote_table = {};
var vote_history = {};

// -----------------------------------------------------------------
// vote server
//

var vote_html_data = '';
function read_vote_html (path) {
  fs.readFile (path, function (err, data) {
    if (err) {
	    throw 'can not open ' + path;
    }
    else {
	    vote_html_data = data.toString ();
    }
  });
}

fs.watchFile (conf.vote.html, {persistent: true, interval: 1000}, 
              function (curr, prev) {
                read_vote_html (conf.vote.html);
              });

read_vote_html (conf.vote.html);

function number_multi2uni (num) {
  var char1 = new Array(
    '%EF%BC%91',
    '%EF%BC%92',
    '%EF%BC%93',
    '%EF%BC%94',
    '%EF%BC%95',
    '%EF%BC%96',
    '%EF%BC%97',
    '%EF%BC%98',
    '%EF%BC%99',
    '%EF%BC%90'
  );

  var char2 = new Array(1,2,3,4,5,6,7,8,9,0);
  
  for (var i = 0; i < 10; i++) {
    num = num.replace (char1[i], char2[i]);
  }
  return num;
}

function build_vote_content (res_msg, token) {
  var player = player_table [token];
  data = vote_html_data.replace ('__RES__', res_msg).
    replace (/__TOKEN__/g, token).
    replace ('__NAME__', player.name);

  if (player === undefined) {
    console.log ('token error');
    console.log (res_msg, token); 
  }

  var c = 0;
  var tbl = '<tr>';
  player.cell.forEach (function (n) {
    if (c > 0 && c % 5 === 0) {
      tbl += '</tr><tr>';
    }

    if (vote_history[n] === true) {
      tbl += '<td style="background: #871;">' + n + '</td>';
    }
    else {
      tbl += '<td>' + n + '</td>';
    }
    c++;
  });
  tbl += '</tr>';
                       
  data = data.replace (/__TABLE__/, tbl);
  return data;
}

http.createServer(function (req, res) {
  var dateTime = new Date().toLocaleString();
  var base_url = req.url.replace (/^\//, '');
  var path = null;

  var up = base_url.split ('?');
  var url = up[0];
  var token = (up.length > 1) ? up[1] : null;

  var path = null;
  switch (url) {
  case '':          path = 'static/index.html'; break;
  default:          path = 'static/' + url; break;
  }


  var res_msg = '数字を入力して「投票」ボタンを押してください';
  switch (req.method) {
  case 'POST':
	  req.on ('data', function (data) {
      try {
        var str = data.toString ();

        var map = {};
        str.split('&').forEach (function (kv) { 
          k = kv.split ('=');
          if (k.length == 2) {
            map [k[0]] = k[1];
          }
        });

        if (map.number === undefined || 
            map.token === undefined || 
            player_table[map.token] === undefined) {
          console.log ('-- dump ---');
          console.log (data.toString ());
          throw '不明なエラー';
        }

        try {
          token = map.token;
          var num = map.number.replace (/(^\s+)|(\s+$)/g, '');
          num = number_multi2uni (num);

          if (! num.match (/^[0-9]+$/)) {
            throw '数字のみ入力できます';            
          }

          var digit = parseInt (num);
          if (conf.vote.max < digit) {
            throw '投票は1から' + conf.vote.max + 'の数字を指定してください';
          }

          if (conf.vote.max < digit) {
            throw '投票は1から' + conf.vote.max + 'の数字を指定してください';
          }


          if (vote_history[num] === true) {
            console.log ('conflict, ' + num + ': ' + token);
            throw num + 'はすでに選ばれています。他の数字を選んでください';
          }

          vote_table [map.token] = num;
          res_msg = num + 'が投票されました';
          code = 200;
        } catch (e) {
          code = 406;
          res_msg = e;
        }

        mime_type = 'text/html';
        res.setHeader ('Content-Type', mime_type);
        res.writeHead (code);
        res.end (build_vote_content (res_msg, token));

      } catch (e) {
        console.log (e);
        mime_type = 'text/html';
        res.setHeader ('Content-Type', mime_type);
        res.writeHead (406);
        res.end ('もう一度アクセスしなおして下さい');
      }
    });
    break;

  case 'GET':
    if (token) {
      mime_type = 'text/html';
      res.setHeader ('Content-Type', mime_type);    
      res.writeHead (200);
      res.end (build_vote_content (res_msg, token));
    }
    else {
      mime_type = 'text/html';
      res.setHeader ('Content-Type', mime_type); 
      res.writeHead (403);
      res.end ('アクセスしなおしてください');
    }
  }
}).listen(conf.vote.http.port, conf.vote.http.host);


// -----------------------------------------------------------------
// console server
//

function respond_file (res, path) {

  fs.readFile (path, function (err, data) {
    if (err) {
      res.writeHead (404);
      res.end ('not found');
    }
    else {
      var ext = path.replace (/^.*\./g, '');

      switch (ext) {
      case 'html': mime_type = 'text/html'; break;
      case 'css':  mime_type = 'text/css'; break;
      case 'js':   mime_type = 'text/javascript'; break;
      case 'json': mime_type = 'text/json'; break;
      default: mime_type = ''; break;
      }

      res.setHeader ('Content-Type', mime_type);
      res.writeHead (200);
      res.end (data.toString ());
    }
  });
}

http.createServer(function (req, res) {
  var dateTime = new Date().toLocaleString();
  var base_url = req.url.replace (/^\//, '');
  var path = null;

  var url = base_url.replace (/\?.*/, '');
  var path = null;
  switch (url) {
  case '': path = 'console/index.html'; break;
  case 'conf.json': path = 'conf.json'; break;
  default: path = 'console/' + url; break;
  }

  respond_file (res, path);

}).listen(conf.console.http.port, conf.console.http.host);

var ws = require ('ws');
var wss = new ws.Server ({port: conf.console.ws.port});


function vote_start () {
  vote_table = {}; 
  vote_open = true; 
  
  // for test
  spawn ('./test.py', []);
  
}

function vote_stop () {
  vote_open = false; 
}

function vote_result () {
  var stat = {};

  for (var t in vote_table) {
    var n = vote_table[t];
    stat[n] = (stat[n] === undefined) ? 1 : (stat[n] + 1);
  }

  var min = null;
  for (var n in stat) {
    min = (min === null || stat[n] < min) ? stat[n] : min;
  }

  var min_n = null;
  for (var g in stat) {
    n = parseInt (g);
    if (stat[g] === min) {
      min_n = (min_n === null || n < min_n) ? n : min_n;
    }
  }

  var res = [min_n];
  return res;
}

function set_vote_history (data, sock) {
  if (typeof data !== 'number') {
    data = parseInt (data);
  }
  vote_history [data] = true;
  sock.send (JSON.stringify ({cmd: 'show', data: vote_table})); 
}

wss.on ('connection', function(sock) {
  sock.on ('message', function(msg) {
    obj = JSON.parse (msg);
    switch (obj.cmd) {
    case 'show': sock.send (JSON.stringify ({cmd: 'show', data: vote_table})); break;
    case 'res': sock.send (JSON.stringify ({cmd: 'res', data: vote_result ()})); break;
    case 'fix': set_vote_history (obj.data, sock); break;
    case 'start': vote_start (); break;
    case 'stop':  vote_stop (); break;
    default:
      console.log (obj);
    }

  });
});
wss.on('close', function (sock) {
    console.log (sock);
});

var vote_open = true; // for debug
