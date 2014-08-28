// test system configuration tools output parsing
var exec = require('child_process').exec;
var os = require('os').platform();
var scp = require('../syscmdparser');

var runcmd = function(cmd, callback) {
    exec(cmd, function (error, stdout, stderr) {
	callback(scp.parse(error, stdout, stderr, cmd, os));
    });
};

exports.testHostname = function(test) {
    test.expect(2);
    runcmd("hostname", function(o) {
	test.ok(!o.error, "returns no error");
	test.ok(require('os').hostname() == o.hostname, "return value ok");
	test.done();
    });
};

