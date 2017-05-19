#!/usr/bin/env node

//require("compareHTML_linebyline");
var checker = require('./checker');
const exec = require('child_process').exec;

var fs = require("fs");
var path = require("path");
var program = require('commander');

program
	.arguments('<originalHTML>', 'Relative location of the Original HTML file to be compared.')
	.arguments('<reproducedHTML>', 'Relative location of the Reproduced HTML file to be compared.')

	.option('-o, --output <outputPath>', 'Desired Output location.')

	.usage('[options] <originalHTML> <reproducedHTML>')

	.action(function (originalHTML, reproducedHTML, program) {

		var pathOriginalHTML = originalHTML,
			pathReproducedHTML = reproducedHTML,
			brokenPath = false;

		var outputName = program.output;

		try {
			if (path.isAbsolute(originalHTML)) {
				originalFileExisting = fs.statSync(originalHTML);
			} else {
				originalFileExisting = fs.statSync(path.join(process.cwd(), originalHTML));
				pathOriginalHTML = path.join(process.cwd(), originalHTML);
			}
		}
		catch (e) {
			console.log("The path to your Original HTML file is invalid. Please check if the file exists.");
			brokenPath = true;
			return 404;
		}
		try {
			if (!path.isAbsolute(originalHTML)) {
				reproducedFileExisting = fs.statSync(path.join(process.cwd(), reproducedHTML));
				pathReproducedHTML = path.join(process.cwd(), reproducedHTML);
			} else {
				var reproducedFileExisting = fs.statSync(reproducedHTML);
			}
		}
		catch (e) {
			console.log("The path to your Reproduced HTML file is invalid. Please check if the file exists.");
			brokenPath = true;
			return 404;
		}
		finally {
			if (!brokenPath) {
				console.log(originalHTML + " - " + reproducedHTML);
				exec("diff " + originalHTML + " " + reproducedHTML + " -q", function (error, stdout, stderr) {

					if (stdout) {

						console.log(stdout);

						return checker.compareHTML(pathOriginalHTML, pathReproducedHTML, outputName);

					}
					else {
						console.log('The compared files, ' + originalHTML + ' and ' + reproducedHTML + ' do not differ. \nCongrats!');
						return 200;
					}
				});
			}
		}
	})
	.parse(process.argv);

module.exports = {
	ercChecker: function (originalHTML, reproducedHTML, outputPath) {
		var pathOriginalHTML = originalHTML,
			pathReproducedHTML = reproducedHTML,
			brokenPath = false;

		var outputName = outputPath;

		try {
			if (path.isAbsolute(originalHTML)) {
				originalFileExisting = fs.statSync(originalHTML);
			} else {
				originalFileExisting = fs.statSync(path.join(process.cwd(), originalHTML));
				pathOriginalHTML = path.join(process.cwd(), originalHTML);
			}
		}
		catch (e) {
			console.log("The path to your Original HTML file is invalid. Please check if the file exists.");
			brokenPath = true;
			return 404;
		}
		try {
			if (!path.isAbsolute(originalHTML)) {
				reproducedFileExisting = fs.statSync(path.join(process.cwd(), reproducedHTML));
				pathReproducedHTML = path.join(process.cwd(), reproducedHTML);
			} else {
				reproducedFileExisting = fs.statSync(reproducedHTML);
			}
		}
		catch (e) {
			console.log("The path to your Reproduced HTML file is invalid. Please check if the file exists.");
			brokenPath = true;
			return 404;
		}
		finally {
			if (!brokenPath) {
				console.log(originalHTML + " - " + reproducedHTML);
				exec("diff " + originalHTML + " " + reproducedHTML + " -q", function (error, stdout, stderr) {

					if (stdout) {

						console.log(stdout);

						return checker.compareHTML(pathOriginalHTML, pathReproducedHTML, outputName);

					}
					else {
						console.log('The compared files, ' + originalHTML + ' and ' + reproducedHTML + ' do not differ. \nCongrats!');
						return 200;
					}
				});
			}
		}
	}
};