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

exports.testHostname = function(test) {
    test.expect(2);
    runcmd("hostname", function(o) {
	test.ok(o.error===undefined, "returns no error");
	test.ok(require('os').hostname() === o.result, "return value ok " + o.result);
	test.done();
    });
};

