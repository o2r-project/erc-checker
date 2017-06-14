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


//require("compareHTML_linebyline");
const checker = require('./checker');
const exec = require('child_process').exec;

const debug = require('debug')('index:checkRequestHandling');
const colors = require('colors');

const fs = require("fs");
const path = require("path");
const program = require('commander');

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
			debug("The path to your Original HTML file is invalid. Please check if the file exists.".red, e.message);
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
			debug("The path to your Reproduced HTML file is invalid. Please check if the file exists.".red, e.message);
			console.log("");
			brokenPath = true;
			//return 1;
		}
		finally {
			if (brokenPath) {return 1}

			debug("Files to be compared (w/ path): 	" + originalHTML + " - " + reproducedHTML);
			exec("diff " + originalHTML.replace(/ /g, '\\ ') + " " + reproducedHTML.replace(/ /g, '\\ ') + " -q", function (error, stdout, stderr) {

				if (stdout) {

					debug(stdout, "Differences were found; Calling compareHTML to create a HTML file highlighting these differences.");
					return checker.compareHTML(pathOriginalHTML, pathReproducedHTML, outputName);

				}
				else {
					debug(stdout, stderr, error);
					debug('The compared files, ' + originalHTML + ' and ' + reproducedHTML + ' do not differ. \nCongrats!'.green);
					console.log("");
					return 0;
				}
			});
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
			debug("The path to your Original HTML file is invalid. Please check if the file exists.".red, e.message);
			console.log("");
			return 1;
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
			debug("The path to your Reproduced HTML file is invalid. Please check if the file exists.".red, e.message);
			console.log("");
			return 1;
		}
		finally {
			exec("diff " + originalHTML + " " + reproducedHTML + " -q", function (error, stdout, stderr) {
				if (stdout) {

					debug(stdout, "Differences were found; \nCalling compareHTML to create a HTML file highlighting these differences.");
					return checker.compareHTML(pathOriginalHTML, pathReproducedHTML, outputName);

				}
				else {
					debug('The compared files, ' + originalHTML + ' and ' + reproducedHTML + ' do not differ. \nCongrats!'.greed);
					console.log("");
					return 0;
				}
			});
		}
	}
};
