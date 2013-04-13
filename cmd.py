#!/usr/bin/env python

import optparse
import zmq
import json

def main (opt, args, conf):
    ctx = zmq.Context()
    sock = ctx.socket (zmq.REQ)
    url = 'tcp://{0}:{1}'.format (opt.host, opt.port)
    sock.connect (url)
    
    msg = {'time': opt.time}
           
    sock.send (json.dumps (msg))
    data = sock.recv ()
    print data

if __name__ == '__main__':
    psr = optparse.OptionParser ()
    psr.add_option ('-t', '--time', dest='time', default=30,
                    help='duration')
    psr.add_option ('-r', '--host', dest='host', default='localhost',
                    help='duration')
    psr.add_option ('-p', '--port', dest='port', default=7000,
                    help='duration')

    conf = json.load (open ('conf.json', 'r'))
    (opt, args) = psr.parse_args ()
    main (opt, args, conf)
