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

if(process.env.DEBUG === undefined) process.env['DEBUG']='index:requestHandling,index:ERROR,checker:ERROR';


var checker = require('./checker');

var debug = require('debug')('index:requestHandling');
var debugERROR = require('debug')('index:ERROR');
const colors = require('colors');

const fs = require('fs');
const os = require('os');
const path = require('path');
const program = require('commander');

function Metadata (dateStart, errorEncountered) {
	this.differencesFound = false;
	this.timeOfCheck = {
		start:  dateStart,
		end: Date.now()
	};
	this.errorsEncountered = [];
	this.errorsEncountered[0] = errorEncountered;
}


program
	.arguments('<originalHTML>', 'Relative or absolute location of the Original HTML file to be compared.')
	.arguments('<reproducedHTML>', 'Relative or absolute location of the Reproduced HTML file to be compared.')

	.option('')
	.option('-m, --metadata <metadataOutputPath>', '\tSave Check metadata to file; \n\t\t\t\tChoose desired output location and file name as String or standard path input.\n\t\t\t\tAccepts absolute and relative paths alike.')
	.option('')
	.option('-o, --output <outputPath>', '\tSave output to file; \n\t\t\t\tChoose desired output location and file name as String or standard path input.\n\t\t\t\tAccepts absolute and relative paths alike.')
	.option('')
	.option('-p, --parents', '\tAutomatically create parent directories for the output path.')
	.option('')
	.option('-q, --quiet', '\tQuiet mode, silencing DEBUG logs entirely.')
	.option('')

	.usage('[options]'.magenta + ' ' + '<originalHTML>'.green + ' ' + '<reproducedHTML>'.cyan + '\n\n' +
		'\t' + '<originalHTML>'.green + '\t\t' + 'Relative or absolute location of the Original HTML file to be compared.'.green +'\n' +
		'\t' + '<reproducedHTML>'.cyan +'\t' + 'Relative or absolute location of the Reproduced HTML file to be compared.'.cyan)

	.on('--help', function () {
		console.log();
		console.log("   To debug this tool, set a environment variable 'DEBUG'.".yellow);
		console.log("   Example:".yellow);
		console.log("\tDEBUG=* erc-checker [option] <path_original> <path_reproduced> [-o <output>]");
		console.log();
		console.log("   Available DEBUG loggers are:".yellow);
		console.log("\t- index:requestHandling\t(default)\n\t- index:ERROR\t\t(default)\n\t- checker:general\t(default)\n\t- checker:slice\n\t- checker:compare\n\t- checker:reassemble\n\t- checker:ERROR\t\t(default)\n\n");
	})

	.action(function (originalHTML, reproducedHTML, program) {

		var checkStart = Date.now();

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
			brokenPath = new Metadata(checkStart, e);
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
			brokenPath = new Metadata(checkStart, e);
		}

		if (brokenPath) {
			let metadata = brokenPath;
			if (program.metadata) {
				fs.writeFileSync('./resultMetadata.json', metadata);
			}
			debug(metadata);
			return;
		}

		debug("\tFiles to be compared (w/ path): 	" + originalHTML + " - " + reproducedHTML);

		try {
			var originalHTMLBuffer = fs.readFileSync(pathOriginalHTML);
			var reproducedHTMLBuffer  = fs.readFileSync(pathReproducedHTML);
		}
		catch (e) {
			debugERROR("Failed to read HTML file.".red);
			debugERROR(e);
			let metadata = new Metadata(checkStart, e);
			if (program.metadata) {
				fs.writeFileSync('./resultMetadata.json', metadata);
			}
			debug(metadata);
			return;
		}

		if (originalHTMLBuffer.equals(reproducedHTMLBuffer)) {
			debug('\tThe compared files, ' + originalHTML + ' and ' + reproducedHTML + ' do not differ.'.green);
			let metadata = new Metadata(checkStart, null);
			if (program.metadata) {
				fs.writeFileSync('./resultMetadata.json', metadata);
			}
			debug(metadata);
		}
		else {
			debug("\tDifferences were found; Calling compareHTML to create a HTML file highlighting these differences.");
			return checker.compareHTML(pathOriginalHTML, pathReproducedHTML, outputName, createParentDirectoriesInOutputPath, silenceDebuggers, checkStart)
				.then( function (resolve) {
					if (program.metadata) {
						fs.writeFileSync('./resultMetadata.json', resolve);
					}
					debug('Done'.green);
				},
				function (reason) {
					debugERROR('Check failed:'.red);
					debugERROR(reason);
					let metadata = new Metadata(checkStart, reason);
					if (program.metadata) {
						fs.writeFileSync('./resultMetadata.json', metadata);
					}
					else {
						debug(metadata);
					}
				});
		}
	})
	.parse(process.argv);


var ercChecker = function (originalHTML, reproducedHTML, outputPath, checkID, createParentDirectoriesInOutputPath, silenceDebuggers) {

	return new Promise( function (resolve, reject) {

		var pathOriginalHTML = originalHTML,
			pathReproducedHTML = reproducedHTML,
			brokenPath = false,
			checkStart = Date.now();

		var outputName = outputPath;
		if (checkID) {
			var checkIDString = '_'+checkID;
		}
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

			brokenPath = new Metadata(checkStart, e);
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

			brokenPath = new Metadata(checkStart, e);
		}

		if (brokenPath) {
				reject(brokenPath);
		}

		try {
			var originalHTMLBuffer = fs.readFileSync(pathOriginalHTML);
			var reproducedHTMLBuffer = fs.readFileSync(pathReproducedHTML);
		}
		catch (e) {
			debugERROR("Failed to read HTML file.".red);
			debugERROR(e);
				reject(new Metadata(checkStart, e));
		}

		if (originalHTMLBuffer.equals(reproducedHTMLBuffer)) {
			debug('\tThe compared files, ' + originalHTML + ' and ' + reproducedHTML + ' do not differ.'.green + '\n' + 'Congrats!'.green);
			resolve(new Metadata(checkStart, null))
		}
		else {
			debug("\tDifferences were found; Calling compareHTML to create a HTML file highlighting these differences.");

			checker.compareHTML(pathOriginalHTML, pathReproducedHTML, outputName, checkIDString, createParentDirectoriesInOutputPath, silenceDebuggers, checkStart)
				.then(
					function (result) {
						// provisional arrangement: write output file to check correct result
						let resultMetadata = result;
						resultMetadata.timeOfCheck.end = Date.now();
						//fs.writeFileSync('./metadata.json', JSON.stringify(resultMetadata));
						if (checkIDString) {
							try{deleteFolderRecursive(path.join(os.tmpdir(), 'erc-checker/diffImages'+checkIDString));}catch (e){debugERROR}
						}
						try{deleteFolderRecursive(path.join(os.tmpdir(), 'erc-checker/diffImages'));}catch (e){debugERROR}
						debug('Check done.'.green);

						resolve(resultMetadata);
					},
					function (reason) {
						debugERROR(reason);
						let rejectMetadata = new Metadata(checkStart, reason);
						//fs.writeFileSync('./metadata.json', JSON.stringify(rejectMetadata));

						reject(rejectMetadata);
					}
				);
		}
	});

};

var deleteFolderRecursive = function(path) {
	if( fs.existsSync(path) ) {
		fs.readdirSync(path).forEach(function(file,index){
			var curPath = path + "/" + file;
			if(fs.lstatSync(curPath).isDirectory()) { // recurse
				deleteFolderRecursive(curPath);
			} else { // delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
};


module.exports = {
	// ercChecker returns a Promise
	// in case of any Error, the Promise is REJECTED, and contains a Metadata Object with Timestamps and Error Description
	// otherwise, the Promise is RESOLVED and contains a Metadata Object. In case of Differences, it also contains a Diff-HTML String.
	ercChecker: ercChecker
};
