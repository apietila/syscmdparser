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

    // the module
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

    parseIfconfig = function(out, cmd, os) {
    };

    parseIpconfig = function(out, cmd, os) {
    };

    parseIp = function(out, cmd, os) {
    };

    //--------------------------------
    // the main parser interface
    syscmdparser.parse = function(error, stdout, stderr, cmd, os) {
	if (!_.isArray(cmd))
	    cmd = cmd.split(' ');

	var res = {
	    ts : Date.now(),
	    cmd : cmd[0],
	    cmdline : cmd.join(' '),
	    os : os,
	    stderr : (stderr ? stderr.trim() : "nothing in stderr"),
	    stdout : (stdout ? stdout.trim() : "nothing in stdout")
	};

	if (error) {
	    res.error = (error.code || error);
	    return res;
	}
	stdout = stdout || "";

	switch (cmd[0]) {
	case "hostname":
	    res.result = stdout;
	    break;
	case "ifconfig":
	    res.result = parseIfconfig(stdout, cmd, os);
	    break;
	case "ipconfig":
	    res.result = parseIpconfig(stdout, cmd, os);
	    break;
	case "ip":
	    res.result = parseIp(stdout, cmd, os);
	    break;
	default:
	    res.error = "unsupported cmd " + cmd[0];
	    break;
	};
	return res;
    };

    syscmdparser.getSupported = function() {
	return ["hostname","ifconfig","ipconfig","ip"];
    };

    syscmdparser.noConflict = function() {
	root.syscmdparser = prevParser;
	return syscmdparser;
    };

}).call(this);