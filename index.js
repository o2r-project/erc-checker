#!/usr/bin/env node
/**
 * (C) Copyright 2017 o2r-project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

if(process.env.DEBUG === undefined) process.env['DEBUG']='index:requestHandling,checker:general, checker:ERROR';


const checker = require('./checker');
const exec = require('child_process').exec;

var debug = require('debug')('index:requestHandling\t');
var debugERROR = require('debug')('index:ERROR\t\t');
const colors = require('colors');

const fs = require("fs");
const path = require("path");
const program = require('commander');


program
	.arguments('<originalHTML>', 'Relative or absolute location of the Original HTML file to be compared.')
	.arguments('<reproducedHTML>', 'Relative or absolute location of the Reproduced HTML file to be compared.')

	.option('')
	.option('-o, --output <outputPath>', '\tdesired output location and file name \n\t\t\t\tas String or standard path input.\n\t\t\t\tAccepts absolute and relative paths alike.')
	.option('')
	.option('-q, --quiet', '\tquiet mode, silencing DEBUG logs entirely')

	.usage('[options]'.magenta + ' ' + '<originalHTML>'.blue + ' ' + '<reproducedHTML>'.cyan + '\n\n' +
		'\t' + '<originalHTML>'.blue + '\t\t' + 'Relative or absolute location of the Original HTML file to be compared.'.blue +'\n' +
		'\t' + '<reproducedHTML>'.cyan +'\t' + 'Relative or absolute location of the Reproduced HTML file to be compared.'.cyan)

	.on('--help', function () {
		console.log();
		console.log("   To debug this tool, set a environment variable 'DEBUG'.".yellow);
		console.log("   Example:".yellow);
		console.log("\tDEBUG=* erc-checker [option] <path_original> <path_reproduced> -o <output>");
		console.log();
		console.log("   Available DEBUG loggers are:".yellow);
		console.log("\t- index:requestHandling\t(default)\n\t- index:ERROR\t\t\t(default)\n\t- checker:general\t\t(default)\n\t- checker:slice\n\t- checker:compare\n\t- checker:reassemble\n\t- checker:ERROR\t\t\t(default)\n\n");
	})

	.action(function (originalHTML, reproducedHTML, program) {

/*
		if (program.quiet != undefined)
		{
			//debug = debugERROR = require('debug')('quiet');
		}
*/

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
			debugERROR("The path to your Original HTML file is invalid. Please check if the file exists.".red, e.message);
			brokenPath = true;
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
			debugERROR("The path to your Reproduced HTML file is invalid. Please check if the file exists.".red, e.message);
			console.log("");
			brokenPath = true;
		}
		finally {
			if (brokenPath) {return 1}

			debug("Files to be compared (w/ path): 	" + originalHTML + " - " + reproducedHTML);
			exec("diff " + originalHTML.replace(/ /g, '\\ ') + " " + reproducedHTML.replace(/ /g, '\\ ') + " -q", function (error, stdout, stderr) {

				if (stdout) {

					debug("Differences were found; Calling compareHTML to create a HTML file highlighting these differences.");
					return checker.compareHTML(pathOriginalHTML, pathReproducedHTML, outputName);

				}
				else {
					debug('The compared files, ' + originalHTML + ' and ' + reproducedHTML + ' do not differ.'.green + '\n' +'Congrats!'.green);
					console.log("");
					return 0;
				}
			});
		}
	})
	.parse(process.argv);


var ercChecker = function (originalHTML, reproducedHTML, outputPath) {
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
		debugERROR("The path to your Original HTML file is invalid. Please check if the file exists.".red, e.message);
		console.log("");
		brokenPath = true;
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
		debugERROR("The path to your Reproduced HTML file is invalid. Please check if the file exists.".red, e.message);
		console.log("");
		brokenPath = true;
	}
	finally {
		if(brokenPath){return 1}

		exec("diff " + originalHTML.replace(/ /g, '\\ ') + " " + reproducedHTML.replace(/ /g, '\\ ') + " -q", function (error, stdout, stderr) {
			if (stdout) {

				debug(stdout, "Differences were found; \nCalling compareHTML to create a HTML file highlighting these differences.");
				checker.compareHTML(pathOriginalHTML, pathReproducedHTML, outputName);
				return waiting = false;
			}
			else {
				debug('The compared files, ' + originalHTML.replace(/ /g, '\\ ') + ' and ' + reproducedHTML + ' do not differ. \nCongrats!'.green);
				console.log("");
				return waiting = false;
			}
		});

		return 0;
	}
};

module.exports = {
	ercChecker: ercChecker
};
