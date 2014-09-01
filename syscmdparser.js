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

    // check for dependencies
    var has_require = typeof require !== 'undefined';
    var _ = root._;
    if (typeof _ === 'undefined' ) {
	if( has_require ) {
	    _ = require('underscore')
	} else 
	    throw new Error('syscmdparser requires underscore, see http://underscorejs.org');
    }
   
    // min/max/mean/median/std_dev/variance of an array or null if x is empty
    var describe = function(x) {    
        if (x.length === 0) return null;

	var res = {};
	var s = 0;
        for (var i = 0; i < x.length; i++) {
            if (x[i] < res.min || res.min === undefined) res.min = x[i];
            if (x[i] > res.max || res.max === undefined) res.max = x[i];
	    s += x[i];
        }
        res.mean = s / x.length;

	var sumdev = 0;
        for (var i = 0; i < x.length; i++) {
            sumdev += (Math.pow(x[i] - res.mean, 2));
	}
	res.variance = sumdev / x.length;
	res.std_dev = Math.sqrt(res.variance);

        var sorted = x.slice().sort();
        if (sorted.length % 2 === 1) {
            res.median = sorted[(sorted.length - 1) / 2];
        } else {
            var a = sorted[(sorted.length / 2) - 1];
            var b = sorted[(sorted.length / 2)];
            res.median = (a + b) / 2;
        }

	return res;
    }

    //--------------------------------
    // supported OSs

    var winnt = "winnt";
    var android = "android";
    var linux = "linux";
    var darwin = "darwin";

    //--------------------------------
    // parsers

    var parserfuncs = {};

    // -- configs --

    parserfuncs["hostname"] = function(out, cmd, os) {
	return (out ? out.trim() : "");
    };

    parserfuncs["getprop"] = function(out, cmd, os) {
	if (os === android)
	    return (out ? out.trim() : "");
	else
	    throw new Error("syscmdparser 'getprop' not available on '" + os + "'");
    };

    parserfuncs["vm_stat"] = function(out, cmd, os) {
	if (os !== darwin)
	    throw new Error("syscmdparser 'vm_stat' not available on '" + os + "'");

	var lines = (out ? out.trim() : "").split("\n");
	var line = lines[0].trim().replace(/\s+/g, ' ').split(' ');
	var res = {
	    pagesize : parseInt(line[7])
	}

	for (var i = 1; i < lines.length; i++) {
	    line = lines[i].trim().replace(/\s+/g, ' ').split(': ');
	    var key = line[0].replace(/"/gi,'').replace(/ /gi,'_').toLowerCase();
	    res[key] = parseInt(line[1].replace(/\./gi,''));
	}
	return res;
    };

    parserfuncs["cat"] = function(out, cmd, os) {
	function ip4(val) {
	    var addr = [];
	    var tmp = (val & 0xFF);
	    if (tmp < 0) tmp = tmp & 0xFF + 1;
	    var t = addr.push(tmp);
	    tmp = (val & 0xFF00) >> 8;
	    if (tmp < 0) tmp = tmp & 0xFFFF + 1;
	    t = addr.push(tmp);
	    tmp = (val & 0xFF0000) >> 16;
	    if (tmp < 0) tmp = tmp & 0xFFFFFF + 1;
	    t = addr.push(tmp);
	    tmp = (val & 0xFF000000) >> 24;
	    if (tmp < 0) tmp = tmp & 0xFFFFFFFF + 1;
	    t = addr.push(tmp);
	    return addr.join(".");
	}

	var res = { srcfile : cmd[1] };
	var lines = (out ? out.trim() : "").split("\n");

	switch (cmd[1]) {
	case "/etc/resolv.conf":
	    res.nameservers = [];
	    for (var i = 0; i < lines.length; i++) {
		if (lines[i].indexOf("#") === 0 || lines[i].length <= 0) 
		    continue;
		var line = lines[i].trim().replace(/\s+/g, ' ').split(' ');
		if (line[0] == "domain") 
		    res.domain = line.splice(1);
		else if (line[0] == "search") 
		    res.search = line.splice(1);
		else if (line[0] == "nameserver") 
		    res.nameservers.push(line[1]);
	    }
	    break;

	case "/proc/net/route":
	    res.routes = [];
	    var h = lines[0].toLowerCase().trim().replace(/\s+/g, ' ').split(' ');
	    for (var i = 1; i < lines.length; i++) {
		var line = lines[i].trim().replace(/\s+/g, ' ').split(' ');
		var o = {};
		_.each(h, function(key,idx) {
		    switch(key) {
		    case 'destination':
		    case 'gateway':
		    case 'mask':
			o[key] = ip4(parseInt(line[idx],16));
			break;
		    case 'iface':
		    case 'flags':
			o[key] = line[idx];
			break;
		    default:
			o[key] = parseInt(line[idx]);
			break;
		    }
		});
		res.routes.push(o);
	    }
	    break;

	case "/proc/net/wireless":
	    res.ifaces = {};
	    for (var i = 0; i < lines.length; i++) {
		if (lines[i].indexOf("|") >= 0 || lines[i].length <= 0)
		    continue;

		var line = lines[i].trim().replace(/\s+/g, ' ').split(' ');
		res.ifaces[line[0].replace('/:/','')] = {
		    link : parseInt(line[2]),
		    signal : parseInt(line[3]),
		    noise : parseInt(line[4]),
		}
	    }
	    break;

	case "/proc/net/dev":
	    res.ifaces = {};
	    for (var i = 0; i < lines.length; i++) {
		if (lines[i].indexOf("|") >= 0 || lines[i].length <= 0)
		    continue;

		var line = lines[i].trim().replace(/\s+/g, ' ').split(' ');
		res.ifaces[line[0].replace('/:/','')] = {
		    rx : {
			bytes : parseInt(line[1]),
			packets : parseInt(line[2]), 
			errs : parseInt(line[3]),
			drop : parseInt(line[4])
		    },
		    tx : {
			bytes : parseInt(line[8]),
			packets : parseInt(line[9]), 
			errs : parseInt(line[10]),
			drop : parseInt(line[11]) 
		    }
		}
	    }
	    break;

	case "/proc/net/tcp":
	case "/proc/net/tcp6":
	case "/proc/net/udp":
	case "/proc/net/udp6":
	    // FIXME
	    break;

	case "/proc/meminfo":
	case "/proc/net/snmp6":
	    for (var i = 0; i < lines.length; i++) {
		if (lines[i].indexOf("#") === 0 || lines[i].length <= 0)
		    continue;
		var line = lines[i].trim().replace(/\s+/g, ' ').split(' ');
		res[line[0].replace(/:/gi,'').toLowerCase()] = parseInt(line[1]);
	    }
	    break;

	case "/proc/net/netstat":
	case "/proc/net/snmp":
	    var g = undefined;
	    var h = undefined;
	    for (var i = 0; i < lines.length; i++) {
		if (lines[i].indexOf("#") === 0 || lines[i].length <= 0)
		    continue;

		var line = lines[i].trim().replace(/\s+/g, ' ').split(' ');
		if (!g || g !== line[0]) {
		    // header line
		    g = line[0];
		    h = line.splice(1);
		} else {
		    // value line
		    g = g.replace(/:/gi,'').toLowerCase();
		    res[g] = {}
		    _.each(h, function(key,idx) {
			res[g][key.toLowerCase()] = parseInt(line[idx+1]);
		    });
		    g = undefined;
		}
	    }
	    break;

	default:
	    throw new Error("syscmdparser does not support 'cat " + cmd[1] + "'");
	}
	return res;
    };

    parserfuncs["netsh"] = function(out, cmd, os) {
	if (os !== winnt)
	    throw new Error("syscmdparser 'netsh' not available on '" + os + "'");

	// FIXME
    };

    parserfuncs["ifconfig"] = function(out, cmd, os) {
	var res = {};
	
	switch (os) {
	case linux:
	    var ifaces = (out ? out.trim() : "").split("\n\n");
	    for (var i = 0; i < ifaces.length; i++) {
		var str = ifaces[i].trim().replace(/\s+/g, ' ');
		if (!str)
		    continue

		var iface = {};

		var attrs = {
		    'name': /^([\w\d]+) /gi,
		    'type': /encap:(\w+) /gi,
		    'mac': /hwaddr ([\w:\d]+) /gi,
		    'ipv4': /inet addr:([\.\d]+) /gi,
		    'ipv6': /inet6 addr: ([\:\d\w]+\/\d+) /gi,
		    'broadcast': /bcast:([\.\d]+) /gi,
		    'mask': /mask:([\.\d]+) /gi,
		    'mtu': /mtu:(\d+) /gi,
		    'txqueuelen': /txqueuelen:(\d+) /gi
		};

		_.each(attrs, function(value, key) {
		    var m = null;
		    while ((m = value.exec(str)) !== null) {
			iface[key] = m[1];
			if (key === 'mtu' || key === 'txqueuelen')
			    iface[key] = parseInt(m[1]);
			else if (key === 'type')
			    iface[key] = m[1].toLowerCase();
		    }
		});
		if (iface.name)
		    res[iface.name] = iface;
	    }
	    break;

	case darwin:
	    var lines = (out ? out.trim() : "").split("\n");

	    // group by name -> string
	    var tmp = {};
	    var name = undefined;
	    var re = /^([\w\d]+): flags/;
	    for (var i = 0; i < lines.length; i++) {
		var m = re.exec(lines[i]);
		if (m) {
		    name = m[1];
		    tmp[name] = lines[i].slice(lines[i].indexOf(':')+1).trim() + ' ';
		} else {
		    tmp[name] += lines[i].trim() + ' ';
		}
	    }

	    // parse each iface
	    _.each(tmp, function(str, name) {
		var iface = { name : name};

		var attrs = {
		    'mtu': /mtu (\d+) /gi,
		    'ipv6': /inet6 ([\:\d\w]+)/gi,
		    'ipv4': /inet ([\.\d]+) /gi,
		    'mask': /netmask 0x([\d\w]+) /gi,
		    'mac': /ether ([\w:\d]+) /gi
		};

		// remove any extra whitespace
		str = str.replace(/\s+/g, ' ');

		// match attrs
		_.each(attrs, function(value, key) {
		    var m = null;
		    while ((m = value.exec(str)) !== null) {
			iface[key] = m[1];
			if (key === 'mtu') {
			    iface[key] = parseInt(m[1]);
			} else if (key === 'mask') {
			    // hex mask, convert to ip
			    var tmp = [];
			    for (var j = 0; j < 8; j+=2) {
				tmp.push(parseInt('0x' + m[1].substring(j,j+2)));
			    }
			    iface[key] = tmp.join('.');
			}
		    }
		});

		if (iface.name)
		    res[iface.name] = iface;
	    });
	    break;

	default:
	    throw new Error("syscmdparser 'ifconfig' not available on '" + os + "'");
	}
	return res;
    };

    parserfuncs["ipconfig"] = function(out, cmd, os) {
	// FIXME
    };

    parserfuncs["iwconfig"] = function(out, cmd, os) {
	// FIXME
    };

    parserfuncs["networksetup"] = function(out, cmd, os) {
	var res = undefined;
	if (os !== darwin)
	    throw new Error("syscmdparser 'networksetup' not available on '" + os + "'");
	switch (cmd[1]) {
	case "-listallhardwareports":
	    res = {};
	    var ifaces = (out ? out.trim() : "").split("\n\n");
	    for (var i = 0; i < ifaces.length; i++) {
		var vars = ifaces[i].trim().split('\n');
		var iface = {};
		_.each(vars, function(s) {
		    var tmp = s.split(': ');
		    switch (tmp[0].trim().toLowerCase()) {
		    case "hardware port":
			iface['type'] = tmp[1].trim().toLowerCase();
			break;
		    case "device":
			iface['name'] = tmp[1].trim();
			break;
		    case "ethernet address":
			iface['mac'] = tmp[1].trim();
			break;
		    }
		});
		if (iface.name)
		    res[iface.name] = iface;
	    }
	    break;
	default:
	    throw new Error("syscmdparser 'networksetup' unknown switch " + cmd[1]);
	};
	return res;
    }

    parserfuncs["airport"] = function(out, cmd, os) {
	if (os !== darwin)
	    throw new Error("syscmdparser 'airport' not available on '" + os + "'");
	if (!_.contains(cmd, "-I") && !_.contains(cmd, "-s")) { 
	    throw new Error("syscmdparser 'airport' -I or -s required");
	};

	var res = {};
	var lines = (out ? out.trim() : "").split("\n");

	if (_.contains(cmd, "-I")) {
	    for (var i = 0; i < lines.length; i++) {
		var line = lines[i].trim().replace(/\s+/g, ' ').split(': ');
		var key = line[0].replace(/"/gi,'').replace(/ /gi,'_').toLowerCase();
		switch(key) {
		case 'agrctlrssi':
		case 'agrctlnoise':
		case 'agrextrssi':
		case 'agrextnoise':
		case 'lasttxrate':
		case 'maxrate':
		case 'lastassocstatus':
		case 'mcs':
		case 'channel':
		    res[key] = parseInt(line[1]);
		    break;
		default:
		    res[key] = line[1];
		    break;
		};
	    }
	} else {
	    // scan results
	    res = [];
	    var h = lines[0].trim().toLowerCase().replace(/\s+/g, ' ').split(' ');
	    h.pop();
	    for (var i = 1; i < lines.length; i++) {
		var line = lines[i].trim();
		var o = {};
		_.each(h, function(key,idx) {
		    switch(key) {
		    case 'rssi':
			o[key] = parseInt(line[idx]);
			break;
		    default:
			o[key] = line[idx];
			break;
		    }
		});
		res.push(o);
	    }
	}
	return res;
    };

    parserfuncs["ip"] = function(out, cmd, os) {
	var res = undefined;
	var lines = (out ? out.trim() : "").split("\n");
	
	// ip [ OPTIONS ] OBJECT 
	var idx = 1;
	var obj = cmd[idx];
	while (obj.indexOf('-')>=0) {
	    idx += 1;
	    if (obj === '-f') // has a param
		idx += 1;
	    obj = cmd[idx];
	}

	switch (obj) {
	case "neigh":
	    res = [];
	    for (var i = 0; i < lines.length; i++) {
		var line = lines[i].trim().replace(/\s+/g, ' ').split(' ');
		if (line.length!==6)
		    continue
		res.push({
		    address : line[0],
		    iface : line[2],
		    mac : line[4]
		});
	    }
	    break;

	case "addr":
	    res = {};
	    for (var i = 0; i < lines.length; i++) {
		var str = lines[i].trim().replace(/\s+/g, ' ');
		if (!str)
		    continue

		var re = /^\d+: ([\w\d]+) /gi;
		var name = re.exec(str);
		if (name)
		    name = name[1];
		var iface = res[name] || { name : name };
		var attrs = {
		    'ipv4': /inet ([\.\d]+)\/(\d+) /gi,
		    'ipv6': /inet6 ([\:\d\w]+\/\d+) /gi,
		    'broadcast': /brd ([\.\d]+) /gi,
		};

		_.each(attrs, function(value, key) {
		    var m = null;
		    while ((m = value.exec(str)) !== null) {
			iface[key] = m[1];

			if (key === 'ipv4' && m[2]) {
			    var mask = parseInt(m[2]);
			    iface['mask'] = "";
			    var s = '';
			    for (var i = 0; i <= 32; i++) {
				if (s.length === 8) {
				    iface['mask'] += parseInt(s, 2) + '.';
				    s = '';
				}
				s += (i >= mask ? '0' : '1');
			    }
			    iface['mask'] = iface['mask'].slice(0,-1);
			}
		    }
		});

		res[iface.name] = iface;		
	    }
	    break;

	case "link":
	    res = {};
	    for (var i = 0; i < lines.length; i++) {
		var str = lines[i].trim().replace(/\s+/g, ' ');
		if (!str)
		    continue

		var iface = {};
		var attrs = {
		    'name': /^\d+: ([\w\d]+): /gi,
		    'type': /link\/(\w+) /gi,
		    'mac': /link\/\w+ ([\w:\d]+) /gi,
		    'mtu': /mtu (\d+) /gi,
		    'qdisc': /qdisc ([\w_]+) /gi,
		    'txqueuelen': /qlen (\d+)\\ /gi
		};

		_.each(attrs, function(value, key) {
		    var res = null;
		    while ((res = value.exec(str)) !== null) {
			iface[key] = res[1];
			if (key === 'mtu' || key === 'txqueuelen')
			    iface[key] = parseInt(res[1]);
			else if (key === 'type')
			    iface[key] = res[1].toLowerCase();
		    }
		});

		if (iface.name)
		    res[iface.name] = iface;
		
	    }
	    break;

	default:
	    // don't know what to do
	    throw new Error("syscmdparser 'ip' unknown object: " + obj);
	}

	return res;
    };

    parserfuncs["route"] = function(out, cmd, os) {
	var res = [];
	var lines = (out ? out.trim() : "").split("\n");
	
	var h = undefined;
	for (var i = 0; i < lines.length; i++) {
	    var line = lines[i].trim().toLowerCase().replace(/\s+/g, ' ').split(' ');
	    if (line[0] === 'destination') {
		h = line.splice(0);		    
	    } else if (h && h.length >= line.length) {
		var o = {};
		_.each(h, function(key,idx) {
		    key = (key === 'netif' ? 'iface' : key);
		    if (idx < line.length)
			o[key] = line[idx];
		});
		res.push(o);
	    } else {
		h = undefined;
	    }
	}
	return res;
    };

    parserfuncs["netstat"] = function(out, cmd, os) {
	var res = undefined;
	var lines = (out ? out.trim() : "").split("\n");

	if (_.intersection(cmd, ['-b','-i']).length === 2 && os === darwin) {
	    // interface statistics
	    res = {};
	    for (var i = 1; i < lines.length; i++) {
		var line = lines[i].trim().replace(/\s+/g, ' ').split(' ');
		if (line.length !== 11)
		    continue

		res[line[0]] = {
		    rx : {
			packets : parseInt(line[4]), 
			bytes : parseInt(line[6])
		    },
		    tx : {
			packets : parseInt(line[7]), 
			bytes : parseInt(line[9])
		    }
		}
	    }

	} else if (_.intersection(cmd, ['-r','-n']).length === 2) {
	    // routing table
	    res = [];
	    var h = undefined;
	    for (var i = 0; i < lines.length; i++) {
		var line = lines[i].trim().toLowerCase().replace(/\s+/g, ' ').split(' ');
		if (line.length < 4)
		    continue;
		if (line[0] === 'destination') {
		    h = line.splice(0);		    
		} else if (h && h.length >= line.length) {
		    var o = {};
		    _.each(h, function(key,idx) {
			key = (key === 'netif' ? 'iface' : key);
			if (idx < line.length)
			    o[key] = line[idx];
		    });
		    res.push(o);
		} else {
		    h = undefined;
		}
	    }
	} else {
	    // ok don't know what to do
	    throw new Error("syscmdparser 'netstat' unknown options: " + cmd.splice(1).join(' '));
	}
	return res;
    };

    parserfuncs["top"] = function(out, cmd, os) {
	var res = { 
	    tasks : {
		total: null,
		running: null,
		sleeping: null,
	    },
	    loadavg : {
		onemin : null,
		fivemin : null,
		fifteenmin : null,
	    },
	    cpu : {
		user: null,
		system: null,
		idle : null,
	    },
	    memory : {
		total : null,
		used: null,
		free: null,
	    },
	};

	var lines = (out ? out.trim() : "").split("\n");

	switch (os) {
	case android:
	    for (var i = 0; i < lines.length; i++) {
		var row = lines[i].trim().replace(/\s+/g, ' ').split(' ');
		if (row[2] === 'System') {
		    // User 0%, System 0%, IOW 0%, IRQ 0%
		    res.cpu.user = parseFloat(row[1].replace('%,',''));
		    res.cpu.system = parseFloat(row[3].replace('%,',''));
		    res.cpu.idle = 100.0 - (res.cpu.user + res.cpu.system);
		} else if (row[3] === 'Nice') {
		    // User 8 + Nice 1 + Sys 23 + Idle 270 + IOW 1 + IRQ 0 + SIRQ 0 = 303
		    res.tasks.total = parseInt(row[21]);
		    res.tasks.sleeping = parseInt(row[10]);
		    res.tasks.running = res.tasks.total - res.tasks.sleeping;
		}
	    }
	    break;

	case linux:
	    for (var i = 0; i < lines.length; i++) {
		var row = lines[i].trim().replace(/\s+/g, ' ').split(' ');
		switch(row[0]) {
		case "top":
		    for (var j = 1; j<row.length; j++) {
			if (row[j] == "average:") {
			    res.loadavg.onemin = parseFloat(row[j+1].replace(',',''));
			    res.loadavg.fivemin = parseFloat(row[j+2].replace(',',''));
			    res.loadavg.fifteenmin = parseFloat(row[j+3].replace(',',''));
			    break;
			}
		    }
		case "Tasks:":
		    res.tasks.total = parseInt(row[1]);
		    res.tasks.running = parseInt(row[3]);
		    res.tasks.sleeping = parseInt(row[5]);
		    break;
		case "%Cpu(s):":
		    res.cpu.user = parseFloat(row[1]);
		    res.cpu.system = parseFloat(row[3]);
		    res.cpu.idle = parseFloat(row[7]);
		    break;
		case "KiB":
		    if (row[1] == 'Mem:') {
			res.memory.total = parseInt(row[2]);
			res.memory.used = parseInt(row[4]);
			res.memory.free = parseInt(row[6]);
			res.memory.unit = "KiB";
		    }
		    break;
		default:
		    break;
		};
	    }
	    break;

	case darwin:
	    for (var i = 0; i < lines.length; i++) {
		var row = lines[i].trim().replace(/\s+/g, ' ').split(' ');
		switch(row[0]) {
		case "Processes:":
		    res.tasks.total = parseInt(row[1]);
		    res.tasks.running = parseInt(row[3]);
		    res.tasks.sleeping = parseInt(row[7]);
		    break;
		case "Load":
		    res.loadavg.onemin = parseFloat(row[2].replace(',',''));
		    res.loadavg.fivemin = parseFloat(row[3].replace(',',''));
		    res.loadavg.fifteenmin = parseFloat(row[4].replace(',',''));
		    break;
		case "CPU":
		    res.cpu.user = parseFloat(row[2].replace('%',''));
		    res.cpu.system = parseFloat(row[4].replace('%',''));
		    res.cpu.idle = parseFloat(row[6].replace('%',''));
		    break;
		case "PhysMem:":
		    res.memory.used = parseInt(row[1].replace('M',''));
		    res.memory.free = parseInt(row[5].replace('M',''));
		    res.memory.total = (res.memory.used + res.memory.free);
		    res.memory.unit = "M";
		    break;
		default:
		    break;
		};
	    }
	    break;
	}
	return res;
    };

    // -- tools --

    parserfuncs["arp"] = function(out, cmd, os) {
	var lines = (out ? out.trim() : "").split("\n");
	var res = [];
	
	switch (os) {
	case linux:
	case android:
	    for (var i = 0; i < lines.length; i++) {
		var line = lines[i].trim().replace(/\s+/g,' ').split(' ');
		res.push({
		    hostname : line[0],
		    address : line[1].replace(/\(|\)/gi,''),
		    mac : line[3],
		    type : line[4].replace(/\[|\]/gi,''),
		    iface : line[6]
		});
	    }
	    break;
	case darwin:
	    for (var i = 0; i < lines.length; i++) {
		var line = lines[i].trim().replace(/\s+/g,' ').split(' ');
		res.push({
		    hostname : line[0],
		    address : line[1].replace(/\(|\)/gi,''),
		    mac : line[3],
		    iface : line[5],
		    type : line[7].replace(/\[|\]/gi,'')
		});
	    }
	    break;
	case winnt: // FIXME
	    break;
	}
	return res;
    }

    parserfuncs["nslookup"] = function(out, cmd, os) {
	var lines = (out ? out.trim() : "").split("\n");
	var res = {
	    query: cmd[cmd.length-1],
	    server : undefined,
	    answers : []
	};
	var curr = {
	    name : undefined,
	    address : undefined
	};

	for (var i = 0; i < lines.length; i++) {
	    var line = lines[i].trim().toLowerCase().replace(/\s+/g,' ').split(' ');

	    if (line[0] === 'server:') {
		res.server = line[1];
	    } else if (line[0] === 'name:') {
		if (curr.name) {
		    res.answers.push(curr);
		    curr = {
			name : undefined,
			address : undefined
		    };
		}
		curr.name = line[1];
	    } else if (line[0] === 'address:' && curr.name) {
		curr.address = line[1];
	    }
	}

	if (curr.name)
	    res.answers.push(curr);
	return res;
    }

    parserfuncs["ping"] = function(out, cmd, os) {
	var lines = (out ? out.trim() : "").split("\n");
	var res = {
	    dst: cmd[cmd.length-1],
	    dst_ip : undefined,      // resolved IP
	    count : 0,               // -c
	    lost : 0,                // lost pkts
	    bytes : 0,               // -b or default
	    ttl : undefined, 
	    rtt : [],                // results
	    stats : undefined,       // rtt stats
	    time_exceeded_from : undefined // IP of sender
	};

	switch (os) {
	case linux:
	case android:
	    var idx = 0;
	    while (idx < cmd.length) {
		switch (cmd[idx]) {
		case "-c": 
		    res.count = parseInt(cmd[idx+1]);
		    idx += 2;
		    break;
		case "-t": 
		    res.ttl = parseInt(cmd[idx+1]);
		    idx += 2;
		    break;
		default:
		    idx += 1;
		    break;
		}
	    }

	    for (var i = 0; i < lines.length; i++) {	    
		var line = lines[i].trim().replace(/\s+/g, ' ').split(' ');
		if (lines[i].toLowerCase().indexOf('time to live exceeded')>=0) {
		    res.time_exceeded_from = line[2].replace(/\(|\)|:/gi, '');
		    break;		    
		} else if (line[0] === 'PING') {
		    res.dst_ip = line[2].replace(/\(|\)|:/gi, '');
		    res.bytes = parseInt((line[3].indexOf('\(') < 0 ? line[3] : line[3].substring(0,line[3].indexOf('\('))));
		} else if (line[1] === 'bytes') {
		    for (var j = 2; j < line.length; j++) {
			if (line[j].indexOf('time=') === 0) {
			    var tmp = line[j].split('=');
			    res.rtt.push(parseFloat(tmp[1]));
			}
		    }
		}
	    }
	    res.lost = res.count - res.rtt.length;
	    break;

	case darwin:
	    var idx = 0;
	    while (idx < cmd.length) {
		switch (cmd[idx]) {
		case "-c": 
		    res.count = parseInt(cmd[idx+1]);
		    idx += 2;
		    break;
		case "-m": 
		    res.ttl = parseInt(cmd[idx+1]);
		    idx += 2;
		    break;
		default:
		    idx += 1;
		    break;
		}
	    }

	    for (var i = 0; i < lines.length; i++) {	    
		var line = lines[i].trim().replace(/\s+/g, ' ').split(' ');
		if (lines[i].toLowerCase().indexOf('time to live exceeded')>=0) {
		    res.time_exceeded_from = line[3].replace(/:/gi, '');
		    break;		    
		} else if (line[0] === 'PING') {
		    res.dst_ip = line[2].replace(/\(|\)|:/gi, '');
		    res.bytes = parseInt(line[3])
		} else if (line[1] === 'bytes') {
		    for (var j = 2; j < line.length; j++) {
			if (line[j].indexOf('time=') === 0) {
			    var tmp = line[j].split('=');
			    res.rtt.push(parseFloat(tmp[1]));
			}
		    }
		}
	    }
	    res.lost = res.count - res.rtt.length;
	    break;

	case winnt: // FIXME
	    break;
	}

	// count stats
	res.stats = describe(res.rtt);
	return res;
    };

    parserfuncs["fping"] = function(out, cmd, os) {
	if (!_.contains(cmd, "-C")) { 
	    throw new Error("syscmdparser fping -C required");
	};

	var res = {
	    dst: cmd[cmd.length-1],
	    count : 0,               // -C
	    lost : 0,                // lost pkts
	    bytes : 56,              // -b or default
	    ttl : undefined,         // -H or default
	    rtt : [],                // results
	    stats : undefined,        // basic stats
	    time_exceeded_from : undefined
	};

	var idx = 0;
	while (idx < cmd.length) {
	    switch (cmd[idx]) {
	    case "-C": 
		res.count = parseInt(cmd[idx+1]);
		idx += 2;
		break;
	    case "-H": 
		res.ttl = parseInt(cmd[idx+1]);
		idx += 2;
		break;
	    case "-b": 
		res.bytes = parseInt(cmd[idx+1]);
		idx += 2;
		break;
	    default:
		idx += 1;
		break;
	    }
	}

	var lines = (out ? out.trim() : "").split("\n");
	for (var i = 0; i < lines.length; i++) {
	    var line = lines[i].trim().replace(/\s+/g, ' ').split(' ');
	    if (lines[i].toLowerCase().indexOf('time exceeded')>=0) {
		res.time_exceeded_from = line[4];
		break;
	    } else {
		if (/\d+\.?\d*/.test(line[5])) {
		    res.rtt.push(parseFloat(line[5]));
		}
	    }
	}

	// count stats
	res.stats = describe(res.rtt);
	return res;
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

	case winnt: // FIXME
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
	    throw new Error("syscmdparser missing command or os");
	if (!isOSSupported(os))
	    throw new Error("syscmdparser does not yet support '" + 
			    os + "' OS");

	if (!_.isArray(cmd))
	    cmd = cmd.split(' ');
	var prog = cmd[0];
	if (prog.indexOf('\\')>=0)
	    prog = prog.split('\\').splice(-1)[0]
	if (prog.indexOf('/')>=0)
	    prog = prog.split('/').splice(-1)[0]

	if (!isCmdSupported(prog))
	    throw new Error("syscmdparser does not yet support '" + 
			    cmd[0] + "' command");

	var res = {
	    ts : Date.now(),
	    cmd : prog,
	    cmdline : cmd.join(' '),
	    os : os,
	    stderr : (stderr ? stderr.trim() : ""),
	    stdout : (stdout ? stdout.trim().substring(0,32) : ""),
	    result : undefined
	};

	if (error) {
	    res.error = (error.code || error);

	    // some exceptions that provide usefull output even on error
	    if (prog === 'ping' && 
		((res.error == 2 && os === darwin) || 
		 (res.error == 1 && (os === linux || os === android)))) {
		res.error = undefined;
	    } else if (prog === 'fping' && res.error == 1) {
		res.error = undefined;
		stdout = stderr;
	    }
	}

	if (!res.error) {
	    stdout = (stdout ? stdout.trim() : "");
	    res.result = parserfuncs[prog](stdout, cmd, os);
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
	return [//winnt,
	    android,linux,darwin];
    };

    /** @return True if we support this OS, else false. */
    var isOSSupported = syscmdparser.isOSSupported = function(os) {
	return (//os === winnt || 
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
