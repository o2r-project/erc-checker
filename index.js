#!/usr/bin/env node

//require("compareHTML_linebyline");
var checker = require('./checker');
const exec = require('child_process').exec;

var program = require('commander');

program
	.arguments('<fileA>')
	.arguments('<fileB>')
	.action(function (fileA, fileB) {
		console.log(fileA +" - " +fileB);
		exec("diff "+fileA+" "+fileB, (error, stdout, stderr) => {
 		if (error) {
    		console.error(`exec error: ${error}`);
			// checker.compareHTML(fileA, fileB);
    		return;
  		}
  		console.log('The compared files, ' + fileA +' and ' + fileB + ' do not differ. \nCongrats!');
  		// console.log(`stdout: ${stdout}`);
  		// console.log(`stderr: ${stderr}`);
		});

	})
	.parse(process.argv);

module.exports = {
	ercChecker: function (fileA, fileB) {
		console.log(fileA + " - " + fileB);
		exec("diff " + fileA + " " + fileB, (error, stdout, stderr) = > {
				if (error) {
					console.error(`exec error: ${error}`);
					checker.compareHTML(fileA, fileB);
					return;
				}
				console.log('The compared files, ' + fileA + ' and ' + fileB + ' do not differ. \nCongrats!');
			// console.log(`stdout: ${stdout}`);
			// console.log(`stderr: ${stderr}`);
		});
	}
}