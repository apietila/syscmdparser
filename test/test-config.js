// test system configuration tools output parsing
var exec = require('child_process').exec;
var os = require('os').platform();
var scp = require('../syscmdparser');
var _ = require('underscore');

var runcmd = function(cmd, callback) {
    exec(cmd, function (error, stdout, stderr) {
	callback(scp.parse(error, stdout, stderr, cmd, os));
    });
};

exports.testNoCmd = function(test) {
    test.expect(1);
    test.throws(function() { scp.parse(0, "", "", "asd", os)}, Error, "throws no error on invalid cmd");
    test.done();
};

exports.testNoOS = function(test) {
    test.expect(1);
    test.throws(function() { scp.parse(0, "", "", "hostname", "asd")}, Error, "throws no error on invalid os");
    test.done();
};

exports.testHostname = function(test) {
    test.expect(2);
    runcmd("hostname", function(o) {
	test.ok(o.error===undefined, "returns no error");
	test.ok(require('os').hostname() === o.result, "return value ok " + o.result);
	test.done();
    });
};

exports.testCatResolvConf = function(test) {
    test.expect(2);
    runcmd("cat /etc/resolv.conf", function(o) {
	test.ok(o.error===undefined, "returns no error");
	test.ok(o.result.nameservers.length >= 1, "found at least one nameserver");
	test.done();
    });
};

exports.testWmStat = function(test) {
    if (os === "darwin") {
	test.expect(2);
	runcmd("vm_stat", function(o) {
	    test.ok(o.error===undefined, "returns no error");
	    test.ok(o.result.pagesize, "got result");
	    test.done();
	});
    } else {
	test.expect(1);
	test.throws(function() { runcmd("wm_stat", function(o) {}) }, Error, "no error on unsupported platform");
	test.done();
    }
};

exports.testAirport = function(test) {
    if (os === "darwin") {
	test.expect(2);
	runcmd("/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I", function(o) {
	    test.ok(o.error===undefined, "returns no error");
	    test.ok(o.result.bssid, "missing bssid");
	    test.done();
	});
    } else {
	test.expect(1);
	test.throws(function() { runcmd("airport", function(o) {}) }, Error, "no error on unsupported platform");
	test.done();
    }
};

exports.testGetProp = function(test) {
    if (os === "android") {
	test.expect(2);
	runcmd("getprop net.hostname", function(o) {
	    test.ok(o.error===undefined, "returns no error");
	    test.ok(o.result, "got result");
	    test.done();
	});
    } else {
	test.expect(1);
	test.throws(runcmd("getprop", function(o) {}), Error, "no error on unsupported platform");
	test.done();
    }
};

exports.testIfconfig = function(test) {
    if (os === "darwin" || os === "linux") {
	test.expect(2);
	runcmd("ifconfig", function(o) {
	    test.ok(o.error===undefined, "returns no error");
	    test.ok(o.result, "got result");
	    test.done();
	});
    } else {
	test.expect(1);
	test.throws(runcmd("ifconfig", function(o) {}), Error, "no error on unsupported platform");
	test.done();
    }
};
