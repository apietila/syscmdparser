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

exports.testTr = function(test) {
    test.expect(4);
    runcmd("traceroute -q 2 www.google.com", function(o) {
	test.ok(!o.error, "returns no error");
	test.ok(o.result.dst === "www.google.com", "dst ok");
	test.ok(o.result.nqueries === 2, "nqueries ok");
	test.ok(o.result.hops[1] !== undefined, "found first hop");
	test.done();
    });
};

exports.testMtr = function(test) {
    test.expect(4);
    runcmd("mtr -c 2 --raw www.google.com", function(o) {
	test.ok(!o.error, "returns no error");
	test.ok(o.result.dst === "www.google.com", "dst ok");
	test.ok(o.result.nqueries === 2, "nqueries ok");
	test.ok(o.result.hops[1] !== undefined, "found first hop");
	test.done();
    });
};

exports.testPing = function(test) {
    test.expect(6);
    runcmd("ping -c 5 www.google.com", function(o) {
	test.ok(!o.error, "returns no error");
	test.ok(o.result.dst === "www.google.com", "dst ok");
	test.ok(o.result.count === 5, "count ok");
	test.ok(o.result.bytes === 56, "bytes ok");
	test.ok(o.result.rtt.length === o.result.count - o.result.lost, "ok rtt len");
	test.ok(o.result.stats, "stats exists");
	test.done();
    });
};

exports.testFping = function(test) {
    test.expect(6);
    runcmd("fping -C 5 www.google.com", function(o) {
	test.ok(!o.error, "returns no error");
	test.ok(o.result.dst === "www.google.com", "dst ok");
	test.ok(o.result.count === 5, "count ok");
	test.ok(o.result.bytes === 56, "bytes ok");
	test.ok(o.result.rtt.length === o.result.count - o.result.lost, "ok rtt len");
	test.ok(o.result.stats, "stats exists");
	test.done();
    });
};

exports.testPingEx = function(test) {
    test.expect(4);
    runcmd("ping -c 1 -m 1 www.google.com", function(o) {
	test.ok(!o.error, "returns no error");
	test.ok(o.result.ttl === 1, "ttl ok");
	test.ok(!o.result.stats, "no stats");
	test.ok(o.result.time_exceeded_from, "exceeded from");
	test.done();
    });
};


exports.testFpingEx = function(test) {
    test.expect(4);
    runcmd("fping -C 1 -H 1 www.google.com", function(o) {
	test.ok(!o.error, "returns no error");
	test.ok(o.result.ttl === 1, "ttl ok");
	test.ok(!o.result.stats, "no stats");
	test.ok(o.result.time_exceeded_from, "exceeded from");
	test.done();
    });
};
