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

if(process.env.DEBUG === undefined) process.env['DEBUG']='index:requestHandling,index:ERROR,checker:general,checker:ERROR';


var checker = require('./checker');

var debug = require('debug')('index:requestHandling');
var debugERROR = require('debug')('index:ERROR');
const colors = require('colors');

const fs = require("fs");
const path = require("path");
const program = require('commander');

function Metadata (errorEncountered) {
	this.differencesFound = 0;
	this.timeAndDateOfCheck = Date.now();
	this.errorsEncountered = [];
	this.errorsEncountered[0] = errorEncountered;
}


program
	.arguments('<originalHTML>', 'Relative or absolute location of the Original HTML file to be compared.')
	.arguments('<reproducedHTML>', 'Relative or absolute location of the Reproduced HTML file to be compared.')

	.option('')
	.option('-o, --output <outputPath>', '\tdesired output location and file name \n\t\t\t\tas String or standard path input.\n\t\t\t\tAccepts absolute and relative paths alike.')
	.option('')
	.option('-p, --parents', '\tautomatically create parent directories for the output path.')
	.option('')
	.option('-q, --quiet', '\tquiet mode, silencing DEBUG logs entirely.')

	.usage('[options]'.magenta + ' ' + '<originalHTML>'.blue + ' ' + '<reproducedHTML>'.cyan + '\n\n' +
		'\t' + '<originalHTML>'.blue + '\t\t' + 'Relative or absolute location of the Original HTML file to be compared.'.blue +'\n' +
		'\t' + '<reproducedHTML>'.cyan +'\t' + 'Relative or absolute location of the Reproduced HTML file to be compared.'.cyan)

	.on('--help', function () {
		console.log();
		console.log("   To debug this tool, set a environment variable 'DEBUG'.".yellow);
		console.log("   Example:".yellow);
		console.log("\tDEBUG=* erc-checker [option] <path_original> <path_reproduced> [-o <output>]");
		console.log();
		console.log("   Available DEBUG loggers are:".yellow);
		console.log("\t- index:requestHandling\t(default)\n\t- index:ERROR\t\t\t(default)\n\t- checker:general\t\t(default)\n\t- checker:slice\n\t- checker:compare\n\t- checker:reassemble\n\t- checker:ERROR\t\t\t(default)\n\n");
	})

	.action(function (originalHTML, reproducedHTML, program) {
		if (program.quiet)
		{
			debug = debugERROR = require('debug')('quiet');
		}

		var pathOriginalHTML = originalHTML,
			pathReproducedHTML = reproducedHTML,
			createParentDirectoriesInOutputPath = program.parents,
			silenceDebuggers = program.quiet,
			brokenPath = null;

		var outputName = program.output;

		try {
			if (path.isAbsolute(originalHTML)) {
				let originalFileExisting = fs.statSync(originalHTML);
			} else {
				let originalFileExisting = fs.statSync(path.join(process.cwd(), originalHTML));
				pathOriginalHTML = path.join(process.cwd(), originalHTML);
			}
		}
		catch (e) {
			debugERROR("\t\tThe path to your Original HTML file is invalid. Please check if the file exists.".red, e.message);
			brokenPath = new Metadata(e);
		}
		try {
			if (!path.isAbsolute(originalHTML)) {
				let reproducedFileExisting = fs.statSync(path.join(process.cwd(), reproducedHTML));
				pathReproducedHTML = path.join(process.cwd(), reproducedHTML);
			} else {
				let reproducedFileExisting = fs.statSync(reproducedHTML);
			}
		}
		catch (e) {
			debugERROR("\t\tThe path to your Reproduced HTML file is invalid. Please check if the file exists.".red, e.message);
			brokenPath = new Metadata(e);
		}

		if (brokenPath) {return brokenPath}

		debug("\tFiles to be compared (w/ path): 	" + originalHTML + " - " + reproducedHTML);

		try {
			var originalHTMLBuffer = fs.readFileSync(pathOriginalHTML);
			var reproducedHTMLBuffer  = fs.readFileSync(pathReproducedHTML);
		}
		catch (e) {
			debugERROR("Failed to read HTML file.".red);
			debugERROR(e);
			return new Metadata(e);
		}

		if (originalHTMLBuffer.equals(reproducedHTMLBuffer)) {
			debug('\tThe compared files, ' + originalHTML + ' and ' + reproducedHTML + ' do not differ.'.green + '\n' +'Congrats!'.green);
			return new Metadata(null);
		}
		else {
			debug("\tDifferences were found; Calling compareHTML to create a HTML file highlighting these differences.");
			return checker.compareHTML(pathOriginalHTML, pathReproducedHTML, outputName, createParentDirectoriesInOutputPath, silenceDebuggers);
		}

	})
	.parse(process.argv);


var ercChecker = function (originalHTML, reproducedHTML, outputPath, createParentDirectoriesInOutputPath, silenceDebuggers) {
	var pathOriginalHTML = originalHTML,
		pathReproducedHTML = reproducedHTML,
		brokenPath = false;

	var outputName = outputPath;

	try {
		if (path.isAbsolute(originalHTML)) {
			let originalFileExisting = fs.statSync(originalHTML);
		} else {
			let originalFileExisting = fs.statSync(path.join(process.cwd(), originalHTML));
			pathOriginalHTML = path.join(process.cwd(), originalHTML);
		}
	}
	catch (e) {
		debugERROR("\t\tThe path to your Original HTML file is invalid. Please check if the file exists.".red, e.message);

		brokenPath = new Metadata(e);
	}
	try {
		if (!path.isAbsolute(originalHTML)) {
			let reproducedFileExisting = fs.statSync(path.join(process.cwd(), reproducedHTML));
			pathReproducedHTML = path.join(process.cwd(), reproducedHTML);
		} else {
			let reproducedFileExisting = fs.statSync(reproducedHTML);
		}
	}
	catch (e) {
		debugERROR("\t\tThe path to your Reproduced HTML file is invalid. Please check if the file exists.".red, e.message);

		brokenPath = new Metadata(e);
	}

	if (brokenPath) { return brokenPath }

	try {
		var originalHTMLBuffer = fs.readFileSync(pathOriginalHTML);
		var reproducedHTMLBuffer  = fs.readFileSync(pathReproducedHTML);
	}
	catch (e) {
		debugERROR("Failed to read HTML file.".red);
		debugERROR(e);
		return new Metadata(e);
	}

	if (originalHTMLBuffer.equals(reproducedHTMLBuffer)) {
		debug('\tThe compared files, ' + originalHTML + ' and ' + reproducedHTML + ' do not differ.'.green + '\n' +'Congrats!'.green);
		return new Metadata(null);
	}
	else {
		debug("\tDifferences were found; Calling compareHTML to create a HTML file highlighting these differences.");
		let metadata;

		checker.compareHTML(pathOriginalHTML, pathReproducedHTML, outputName, createParentDirectoriesInOutputPath, silenceDebuggers)
			.then(
				function (result) {
					// TODO do somehting with Metadata
				}
			);
		return 0;
	}

};

module.exports = {
	ercChecker: ercChecker
};
