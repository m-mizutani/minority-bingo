#!/usr/bin/env python

import optparse
import json
import random

def gen_player (opt, args, conf, name):
    token = ''
    for c in range(opt.token_len):
        token += random.choice("1234567890ABCDEFGHIJKLMNPQRSTUVWXYZ")

    cell = []
    for c in range(opt.cell_len * opt.cell_len):
        while True:
            d = random.randint (1, conf['vote']['max'])
            if d not in cell: break
        cell.append (d)

    return {'name': name,
            'token': token, 
            'url': 'http://i.pylon.me/?' + token,
            'cell': cell,
            'cell_len': opt.cell_len}

def main (opt, args, conf):
    table = []
    for i in range (90):
        table.append (gen_player (opt, args, conf, 'user{0}'.format (i)))
        
    json.dump (table, open (opt.filename, 'wb'))


if __name__ == '__main__':
    psr = optparse.OptionParser()
    psr.add_option("-f", "--file", dest="filename", default='player.json',
                   help="write to FILE", metavar="FILE")
    psr.add_option("-c", "--cell", dest="cell_len", default=5,
                   help="length of cell", metavar="INT")
    psr.add_option("-t", "--token-len", dest="token_len", default=6,
                   help="length of token", metavar="INT")
    psr.add_option("-q", "--quiet",
                   action="store_false", dest="verbose", default=True,
                   help="don't print status messages to stdout")

    conf = json.load (open ('conf.json', 'r'))
    (opt, args) = psr.parse_args()
    main (opt, args, conf)
