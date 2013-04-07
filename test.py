#!/usr/bin/env python

import json
import urllib
import httplib
players = json.load (open ('player.json', 'r'))

import time
import random

url = 'http://localhost/'

for p in players:
    time.sleep (0.02)
    while True:
        conn = httplib.HTTPConnection ('localhost');
        param = urllib.urlencode ({'number': random.choice (p['cell']), 'token': p['token']})
        conn.request ('POST', '/', param)
        r = conn.getresponse ()
        print r.status
        if r.status == 200: break

    # urllib.urlopen (url, param)
