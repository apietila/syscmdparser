/*
  The MIT License (MIT)

  Copyright (c) 2014 Anna-Kaisa Pietilainen <anna-kaisa.pietilainen@inria.fr>

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
*/
"use strict";

(function() {
    var root = this;
    var prevParser = root.syscmdparser;

    // the module object
    var syscmdparser = function(obj) {
	if (obj instanceof syscmdparser) return obj;
	if (!(this instanceof syscmdparser)) return new syscmdparser(obj);
	this._wrapped = obj;
    };

    // export the module
    if( typeof exports !== 'undefined' ) {
	if( typeof module !== 'undefined' && module.exports ) {
	    exports = module.exports = syscmdparser;
	}
	exports.syscmdparser = syscmdparser;
    } else {
	root.syscmdparser = syscmdparser;
    }

    var has_require = typeof require !== 'undefined';

    // check for dependencies
    var _ = root._;
    if (typeof _ === 'undefined' ) {
	if( has_require ) {
	    _ = require('underscore')
	} else 
	    throw new Error('syscmdparser requires underscore, see http://underscorejs.org');
    }

    // optional dependency
    var ipaddr = root.ipaddr;
    if (typeof ipaddr === 'undefined' && has_require) {
	ipaddr = require('ipaddr.js');
    }

    //--------------------------------
    // internal helpers

    const winnt = "winnt";
    const android = "android";
    const linux = "linux";
    const darwin = "darwin";

    const parserfuncs = {};

    parserfuncs["hostname"] = function(out, cmd, os) {
	return (out ? out.trim() : "unknown");
    };

    parserfuncs["ifconfig"] = function(out, cmd, os) {
    };

    parserfuncs["ipconfig"] = function(out, cmd, os) {
    };

    parserfuncs["ip"] = function(out, cmd, os) {
    };

    parserfuncs["traceroute"] = function(out, cmd, os) {
	var lines = (out ? out.trim() : "").split("\n");
	var res = {
	    dst: cmd[cmd.length-1],
	    nqueries : 3,
	    hops: {},        // dst -> ip -> { hostname : val, rtt : [] };
	};

	switch (os) {
	case linux:
	case android:
	case darwin:
	    var idx = 0;
	    while (idx < cmd.length) {
		switch (cmd[idx]) {
		case "-q": 
		    res.nqueries = parseInt(cmd[idx+1]);
		    idx += 2;
		    break;
		default:
		    idx += 1;
		    break;
		}
	    }

            var currhop = {};
	    var currhopid = -1;
	    for (var i = 0; i < lines.length; i++) {
		var str = lines[i].trim();
		if (!str || str.length === 0 || str.indexOf('traceroute')>=0) 
		    continue;

		var ent = str.replace(/\s+/g,' ').replace(/\sms/g,'').split(' ');

		if (/^\d{1,2} /.test(str)) {
		    if (currhopid>0) {
			res.hops[currhopid] = currhop;
		    }
		    currhop = {};
		    currhopid = parseInt(ent[0].trim());
		    ent = ent.slice(1);
		}
		
		if (ent[0] == '*') {
		    currhop['*'] = {hostname : undefined, rtt : [], missed : res.nqueries};
		} else {
		    var ip = ent[1].replace(/\(|\)/gi, '');
		    currhop[ip] = {hostname : ent[0], rtt : [], missed : 0};
		    var idx = 2;
		    while (idx < ent.length) {
			if (ent[idx] === '*') {
			    currhop[ip].missed += 1;
			    idx += 1;
			} else if (/\(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\)/.test(ent[idx+1])) {
			    ip = ent[idx+1].replace(/\(|\)/gi, '');
			    currhop[ip] = {hostname : ent[idx], rtt : [], missed : 0};
			    idx += 2;
			} else {
			    currhop[ip].rtt.push(parseFloat(ent[idx]));
			    idx += 1;
			}
		    }
		}
	    }

	    if (currhopid>0) {
		res.hops[currhopid] = currhop;
	    }
	    break;

	case winnt:
	    for (var i = 3; i < lines.length - 2; i++) {
		var str = lines[i].replace(/\s+/g, ' ').replace(/\sms/g, '');
		if (str.trim() == "") {
		    continue;
		}

		var ent = str.trim().split(' ');

		var h = new Hop();
		h.id = ent[0];

		if(ent.length == 6) {
		    h.host = ent[4];
		    h.ip = ent[5].replace(/\[|\]/gi, '');
		} else if(ent.length == 5) {
		    h.ip = ent[4];
		}

		if (h.ip) {
		    h.missed = 0;
		    h.rtt = [];
		    for (var k = 1; k <= 3; k++) {
			if (ent[k] === '*') {
			    h.missed = h.missed + 1;
			} else {
			    h.rtt.push(parseFloat(ent[k].replace(/</g,'')));
			}
		    }
		}

		traceroute.hop.push(h);

	    }
	    break;
	}
	return res;
    };
    
    parserfuncs["mtr"] = function(out, cmd, os) {
	if (!_.contains(cmd, "--raw")) { 
	    throw new Error("syscmdparser mtr --raw required");
	};

	var res = {
	    dst: cmd[cmd.length-1],
	    nqueries : 0,
	    hops: {},        // cnt -> ip -> { hostname : val, rtt : [] };
	};

	var idx = 0;
	while (idx < cmd.length) {
	    switch (cmd[idx]) {
	    case "-c": 
		res.nqueries = parseInt(cmd[idx+1]);
		idx += 2;
		break;
	    default:
		idx += 1;
		break;
	    }
	}

	var lines = (out ? out.trim() : "").split("\n");
	for (var i = 0; i < lines.length; i++) {
	    var tmp = lines[i].trim().split(' ');
	    var hopid = (parseInt(tmp[1])+1);
	    switch (tmp[0]) {
	    case 'h':
		// traceroute indexes from 1, mtr from 0 ..
		res.hops[hopid] = {};
		res.hops[hopid][tmp[2]] = { hostname : undefined, missed : res.nqueries, rtt : [] };
		break;
	    case 'p':
		var hop = res.hops[hopid];
		hop = hop[_.keys(hop)[0]]; // mtr only keeps track of single ip per hop
		hop.missed -= 1;
		hop.rtt.push(parseInt(tmp[2])/1000.0);
		break;
	    case 'd':
		var hop = (res.hops[hopid] ? res.hops[hopid] : res.hops[hopid-1]);
		hop = hop[_.keys(hop)[0]];
		hop.hostname = tmp[2];
		break;
	    }
	}
	return res;
    };

    parserfuncs["iperf"] = function(out, cmd, os) {
	var idx = _.indexOf(cmd, '-y');
	if (idx < 0 || (cmd[idx+1].toLowerCase() !== 'j' &&
			cmd[idx+1].toLowerCase() !== 'c')) 
	{
	    throw new Error("syscmdparser iperf -Y [j|c] required");
	}

	// reporting style
	var iscsv = (cmd[idx+1].toLowerCase() === 'c');

	var res = {
	    header : {                 // configuration
		test : {
		    proto : "tcp",         // -u
		    duration : 10,         // -t
		    bytes : undefined,     // -n
		    rate : undefined,      // -b
		    mode : "normal"        // normal, tradeoff, reverse, dual
		},
		role : undefined,          // client or server
		local_host : undefined,
		remote_host : undefined
	    },
	    local : {                      // local received and/or sent data
		recv : undefined,
		send : undefined
	    },
	    remote : {                     // remote received and/or sent data
		recv : undefined,
		send : undefined
	    }
	};

	// fill some of the header with the cmd params
	var idx = 0;
	while (idx < cmd.length) {
	    switch (cmd[idx]) {
	    case "-c": 
		res.header.role = "client";
		idx += 1;
		break;
	    case "-s": 
		res.header.role = "server";
		idx += 1;
		break;
	    case "-t": 
		res.header.test.duration = parseInt(cmd[idx+1]);
		idx += 2;
		break;
	    case "-b": 
		res.header.test.rate = cmd[idx+1];
		idx += 2;
		break;
	    case "-n": 
		res.header.test.bytes = cmd[idx+1];
		idx += 2;
		break;
	    case "-u": 
		res.header.test.proto = "udp";
		idx += 1;
		break;
	    case "-d": 
		res.header.test.mode = "dual";
		idx += 1;
		break;
	    case "-r": 
		res.header.test.mode = "tradeoff";
		idx += 1;
		break;
	    case "-E": 
		res.header.test.mode = "reverse";
		idx += 1;
		break;
	    default:
		idx += 1;
		break;
	    }
	}

	var gettimestamp = function(s) {
	    if (s.length<14) {
		return { timein : s, timesec : parseInt(s) };
	    } else {
		var d = new Date(parseInt(s.substring(0,4)), // year
				 parseInt(s.substring(4,6)), // month
				 parseInt(s.substring(6,8)), // date
				 parseInt(s.substring(8,10)), // hour
				 parseInt(s.substring(10,12)), // minute
				 parseInt(s.substring(12,14)), // second
				 0); // ms
	    }
	    return {time : d.toJSON(),
		    timemsec : d.getTime(),
		    timein : s};
	};

	var lines = out.split('\n');

	if (iscsv) {
	    var tmp = lines[0].split(',');
	    res.header.local_host = tmp[1];
	    res.header.remote_host = tmp[3];

	    var obj = {
		local_port : parseInt(tmp[2]),
		remote_port : parseInt(tmp[4]),
		intervals : [],
		total : undefined
	    }

	    for (var i = 0; i<lines.length; i++) {		    
		tmp = lines[i].split(',');
		var iobj = {
		    timestamp : gettimestamp(tmp[0]),
		    startTime : parseFloat(tmp[6].split('-')[0]),
		    endTime : parseFloat(tmp[6].split('-')[1]),
		    bytes : parseFloat(tmp[7]),
		    rate : parseFloat(tmp[8]),
		}

		if (tmp.length > 10) {
		    _.extend(iobj, {
    			jitter : parseFloat(tmp[9]),
    			errorCnt : parseInt(tmp[10]),
    			dgramCnt : parseInt(tmp[11]),
    			errorRate : parseFloat(tmp[12]),
    			outOfOrder : parseFloat(tmp[13])
		    });
		}
		// KB
		iobj.bytesK = iobj.bytes / 1024.0;
		// MB
		iobj.bytesM = iobj.bytes / 1024.0 / 1024.0;
		// bytes / s
		iobj.rate = iobj.bytes / (iobj.endTime - iobj.startTime);
		// bits / s
		iobj.ratebit = iobj.rate * 8.0;
		// Kbit / s
		iobj.rateKbit = iobj.ratebit *  (1.0 / 1000 );
		// Mbit / s
		iobj.rateMbit = iobj.ratebit *  (1.0 / 1000 / 1000);
		
		var local_port = parseInt(tmp[2]);
		var remote_port = parseInt(tmp[4]);
		
		if (local_port !== obj.local_port || 
		    remote_port !== obj.remote_port) 
		{
		    obj.total = obj.intervals.pop();
		    if (res.header.role === "client") {
			if (!res.local.send && 
			    res.header.test.mode !== "reverse") {
			    // client send report (except -E)
			    res.local.send = obj;
			} else if (local_port === obj.remote_port &&
				   remote_port === obj.local_port) 
			{
			    // server side recv report
			    res.remote.recv = obj;
			} else {
			    // client recv report (-E, -d or -r)
			    res.local.recv = obj;
			}
		    } else {
			if (!res.local.recv && 
			    res.hearder.test.mode !== "reverse") {
			    // server recv report (except -E)
			    res.local.recv = obj;
			} else if (!res.local.send) {
			    // server send report (-E, -d or -r)
			    res.local.send = obj;
			} else {
			    // remote side recv report (-u and -E, -d or -r)
			    res.remote.recv = obj;
			}
		    }
		    // reset
		    obj = {
			local_port : local_port,
			remote_port : remote_port,
			intervals : [],
			total : undefined
		    }
		}
		obj.intervals.push(iobj);
	    }

	    // handle last
	    obj.total = obj.intervals.pop();
	    if (res.header.role === "client") {
		if (!res.local.send && res.header.test.mode !== "reverse") {
		    // client send report (except -E)
		    res.local.send = obj;
		} else if (res.header.test.mode === "normal") {
		    // server side recv report
		    res.remote.recv = obj;
		} else {
		    // client recv report (-E, -d or -r)
		    res.local.recv = obj;
		}
	    } else {
		if (!res.local.recv && res.header.test.mode !== "reverse") {
		    // server recv report (except -E)
		    res.local.recv = obj;
		} else if (!res.local.send) {
		    // server send report (-E, -d or -r)
		    res.local.send = obj;
		} else {
		    // remote side recv report (-u and -E, -d or -r)
		    res.remote.recv = obj;
		}
	    }
	} else { // json
	    // just to match the common output format
	}

	return res;
    };

    //--------------------------------
    // public API

    /** Parse output (and errors) from the given system command run on
     *  the given os.
     */
    syscmdparser.parse = function(error, stdout, stderr, cmd, os) {
	if (!cmd || !os)
	    throw new Error("missing command or os");
	if (!isOSSupported(os))
	    throw new Error("syscmdparser does not yet support '" + 
			    os + "' OS");

	if (!_.isArray(cmd))
	    cmd = cmd.split(' ');

	if (!isCmdSupported(cmd[0]))
	    throw new Error("syscmdparser does not yet support '" + 
			    cmd[0] + "' command");

	var res = {
	    ts : Date.now(),
	    cmd : cmd[0],
	    cmdline : cmd.join(' '),
	    os : os,
	    stderr : (stderr ? stderr.trim() : ""),
	    stdout : (stdout ? stdout.trim().substring(0,32) : ""),
	    result : undefined
	};

	if (error) {
	    res.error = (error.code || error);
	} else {
	    stdout = (stdout ? stdout.trim() : "");
	    res.result = parserfuncs[cmd[0]](stdout, cmd, os);
	}

	return res;
    };

    /** @return List of supported system commands. */
    syscmdparser.getSupportedCmds = function() {
	return _.keys(parserfuncs);
    };

    /** @return True if we know how to parse the cmd, else false. */
    var isCmdSupported = syscmdparser.isCmdSupported = function(cmd) {
	return (parserfuncs[cmd] && _.isFunction(parserfuncs[cmd]));
    };

    /** @return List of supported OS platforms. */
    syscmdparser.getSupportedOSs = function() {
	return [winnt,android,linux,darwin];
    };

    /** @return True if we support this OS, else false. */
    var isOSSupported = syscmdparser.isOSSupported = function(os) {
	return (os === winnt || 
		os === android || 
		os === linux || 
		os === darwin);
    };

    /** @return Get a no-conflict instance of the module. */
    syscmdparser.noConflict = function() {
	root.syscmdparser = prevParser;
	return syscmdparser;
    };

}).call(this);
