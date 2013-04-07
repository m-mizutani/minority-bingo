var http = require ('http');
var fs = require ('fs');

var conf = {
  'console': {
	  'http': {'port': 7080,
		         'host': '0.0.0.0'},
    'ws': {'port': 9081, 'host': '0.0.0.0'}
  },
  'vote': {
	  'http': {'port': 9080,
		         'host': '0.0.0.0'},
	  'html': 'vote/index.html',
    'max': 100
  }
};

var vote_table = {};

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
  case 'conf.json': path = 'conf.json'; break;
  default:          path = 'static/' + url; break;
  }

  // TODO:
  // need to prevent directroy traversal

  var res_msg = '数字を入力して「投票」ボタンを押してください';
  if (req.method == 'POST') {
	  req.on ('data', function (data) {
      var str = data.toString ();

      var map = {};
      str.split('&').forEach (function (kv) { 
        k = kv.split ('=');
        if (k.length == 2) {
          map [k[0]] = k[1];
        }
      });

      if (map.number !== undefined && map.token !== undefined) {
        var num = map.number.replace (/(^\s+)|(\s+$)/g, '');
        num = number_multi2uni (num);
        console.log (num);
        if (num.match (/^[0-9]+$/)) {
          var digit = parseInt (num);
          if (conf.vote.max < digit) {
            res_msg = '投票は1から' + conf.vote.max + 'の数字を指定してください';
          }
          else {
            vote_table [map.token] = num;
            res_msg = num + 'が投票されました';
            console.log (vote_table);
          }
        }
        else {
          res_msg = '数字のみ入力できます';
        }
      }
      else {
        res_msg = '不明なエラー';
        console.log ('-- dump ---');
        console.log (data);
      }

      mime_type = 'text/html';
      res.setHeader ('Content-Type', mime_type);
      res.writeHead (200);
      res.end (vote_html_data.replace (/__RES__/, res_msg).replace ('__TOKEN__', map.token));
    });
  }
  else {
    if (token) {
      mime_type = 'text/html';
      res.setHeader ('Content-Type', mime_type);    
      res.writeHead (200);
      res.end (vote_html_data.replace (/__RES__/, res_msg).replace ('__TOKEN__', token));
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

http.createServer(function (req, res) {
  var dateTime = new Date().toLocaleString();
  var base_url = req.url.replace (/^\//, '');
  var path = null;

  var url = base_url.replace (/\?.*/, '');
  var path = null;
  console.log (req.url);
  switch (url) {
  case '': path = 'console/index.html'; break;
  default: path = 'console/' + url; break;
  }

  var ext = path.replace (/^.*\./g, '\0');
  switch (ext) {
  case 'html': mime_type = 'text/html'; break;
  case 'js': mime_type = 'application/javascript'; break;
  default: mime_type = ''; break;
  }
    
  fs.readFile (path, function (err, data) {
    if (err) {
      res.writeHead (404);
      res.end ('not found');
    }
    else {
      res.setHeader ('Content-Type', mime_type);
      res.writeHead (200);
      res.end (data.toString ());
    }
  });

}).listen(conf.console.http.port, conf.console.http.host);

var ws = require ('ws');
var wss = new ws.Server ({port: conf.console.ws.port});

wss.on ('connection', function(sock) {
  sock.on ('message', function(msg) {
    obj = JSON.parse (msg);
    switch (obj.cmd) {
    case 'show': sock.send (JSON.stringify ({cmd: 'show', data: vote_table})); break;
    case 'start': vote_table = {}; vote_open = true; break;
    case 'stop':  vote_open = false; break;
    default:
      console.log (obj);
    }

  });
});
wss.on('close', function (sock) {
    console.log (sock);
});

var vote_open = true; // for debug
