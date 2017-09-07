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
	this.checkSuccessful = false;
	this.timeOfCheck = {
		start:  dateStart,
		end: Date.now()
	};
	this.images = null;
	this.resultHTML = null;
	this.errorsEncountered = new Array (0);
	if (errorEncountered != null && errorEncountered != undefined) {
		this.errorsEncountered.push(errorEncountered.toString());
		this.checkSuccessful = false;
	}
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

		var fileOutputPath = program.output;

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
			return checker.compareHTML(pathOriginalHTML, pathReproducedHTML, fileOutputPath, createParentDirectoriesInOutputPath, silenceDebuggers, checkStart)
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


var checkConfig = {
	directoryMode: Boolean, 			// read papers from directories automatically?  (false: paths for both papers MUST be specified
	pathToMainDirectory: String,
	pathToOriginalHTML: String,
	pathToReproducedHTML: String,
	saveFilesOutputPath: String,		// necessary if diff-HTML or check metadata should be saved
	saveDiffHTML: Boolean,
	ercID: String,
	saveMetadataJSON: Boolean,
	createParentDirectories: Boolean, 	// IF outputPath does not yet exist, this flag MUST be set true; otherwise, the check fails
	quiet: Boolean
};

/**
 *	node module:  function ercChecker  returns Promise
 */
var ercChecker = function (config) {

	let directoryMode = config.directoryMode,
		pathToMainDirectory = config.pathToMainDirectory,
		//pathToOriginalHTML = config.pathToOriginalHTML,
		//pathToReproducedHTML: config.pathToReproducedHTML,
		outputPath = config.saveFilesOutputPath,
		ercID = config.ercID,
		saveDiffHTML = config.saveDiffHTML,
		saveMetadataJSON = config.saveMetadataJSON,
		createParentDirectories = config.createParentDirectories,
		quiet = config.quiet;


	if (quiet) {
		debug = debugERROR = null;
	}

	return new Promise( function (resolve, reject) {

		var pathOriginalHTML = config.pathToOriginalHTML,
			pathReproducedHTML = config.pathToReproducedHTML,
			brokenPath = false,
			checkStart = Date.now();

		if ((saveDiffHTML || saveMetadataJSON) && (outputPath == null || outputPath == undefined)) {
			debugERROR("Cannot save files without output path.".red);
			reject(new Metadata(checkStart, new Error("Requested saving check files without specifying an output path.")));
		}

		// if output data requested, try define the output path, and if requested, create parent directories
		if (saveMetadataJSON || saveDiffHTML) {
			var fileOutputPath;
			try {
				fileOutputPath = fs.realpathSync(outputPath);
			}
			catch (e) {
				if (createParentDirectories) {
					let delimiter = (os.platform() == 'win32') ? "\\" : "/";

					if (!path.isAbsolute(outputPath)) {
						outputPath = path.join(process.cwd(), outputPath);
					}

					var dirs = outputPath.replace(/\\/g, '/').split('/');
					let pathString = delimiter;

					try {
						dirs.map(function (current, index) {
							pathString = path.join(pathString, current);
							let err;
							try {
								fs.accessSync(pathString);
							}
							catch (e) {
								err = e;
							}
							if (err) fs.mkdirSync(pathString);
						});
					}
					catch(e) {
						debugERROR(e);
						reject( new Metadata(checkStart, "Error creating output directory: "+e))
					}

					fileOutputPath = fs.realpathSync(pathString);
				}
				else {
					debugERROR("Absolute output path could not be determined".red, e);
					reject( new Metadata(checkStart, "Absolute output path could not be determined. " + e))
				}
			}
		}

		if (pathOriginalHTML != null && pathReproducedHTML == null) {
			try {
				var inputFilePaths = getInputFilePathsDirectoryMode(pathOriginalHTML);
			}
			catch (e) {
				debugERROR("Could not read data from directory: " + e);
				reject(new Metadata(checkStart, e));
			}
		}

		try {
			if (path.isAbsolute(pathOriginalHTML)) {
				let originalFileExisting = fs.statSync(pathOriginalHTML);
			} else {
				let originalFileExisting = fs.statSync(path.join(process.cwd(), pathOriginalHTML));
				pathOriginalHTML = path.join(process.cwd(), pathOriginalHTML);
			}
		}
		catch (e) {
			debugERROR("\t\tThe path to your Original HTML file is invalid. Please check if the file exists.".red, e.message);

			brokenPath = new Metadata(checkStart, e);
		}
		try {
			if (!path.isAbsolute(pathReproducedHTML)) {
				let reproducedFileExisting = fs.statSync(path.join(process.cwd(), pathReproducedHTML));
				pathReproducedHTML = path.join(process.cwd(), pathReproducedHTML);
			} else {
				let reproducedFileExisting = fs.statSync(pathReproducedHTML);
			}
		}
		catch (e) {
			debugERROR("\t\tThe path to your Reproduced HTML file is invalid. Please check if the file exists.".red, e.message);

			brokenPath = new Metadata(checkStart, e);
		}
		/*
		function prematureRejection (rejectionMetadata) {
			if (saveMetadataJSON) {
				writeOutputFiles(rejectionMetadata, outputPath, ercID, )
			}
		}
		*/

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
			debug('\tThe compared files, ' + pathOriginalHTML + ' and ' + pathReproducedHTML + ' do not differ.'.green + '\n' + 'Congrats!'.green);
			let resolveMetadataEqualPapers = new Metadata(checkStart);
			resolveMetadataEqualPapers.checkSuccessful = true;
			resolve(resolveMetadataEqualPapers);
		}
		else {
			debug("\tDifferences were found; Calling compareHTML to create a HTML file highlighting these differences.");

			checker.compareHTML(pathOriginalHTML, pathReproducedHTML, quiet, checkStart)
				.then(
					function (result) {
						debug('Check done.'.green);

						let resultMetadata = result;

						resultMetadata.timeOfCheck.end = Date.now();

						if (!process.env.DEV && resultMetadata.images.length != 0) {
							try {
								let tmpDirForDiffImages = resultMetadata.tmpPath;
								deleteFolderRecursive(tmpDirForDiffImages);
								delete resultMetadata.tmpPath;
							} catch (e) {
								debugERROR (e)
							}
						}

						if (saveDiffHTML || saveMetadataJSON) {
							try {
								writeOutputFiles(resultMetadata, fileOutputPath, saveDiffHTML, saveMetadataJSON);
							}
							catch (e) {
								debugERROR("Failed to write result HTML file.".red);
								resultMetadata.errorsEncountered.push(e);
								debugERROR(e);
								/*
								let fileMeta = resultMetadata;
								fileMeta.resultHTML = '';
								fs.writeFileSync("./testing"+checkStart+".json", JSON.stringify(fileMeta));
								*/
								reject(resultMetadata);
							}
						}

						/*
						let fileMeta = resultMetadata;
						fileMeta.resultHTML = '';
						fs.writeFileSync("./testing"+checkStart+".json", JSON.stringify(fileMeta));
						*/
						resolve(resultMetadata);
					},
					function (rejectData) {
						let reason = rejectData[0];
						let tmpPath = rejectData[1];
						debugERROR("This may be the one with unequal number of images.".red);
						debugERROR(reason);
						let rejectMetadata = new Metadata(checkStart, reason);

						if (!process.env.DEV && tmpPath) {
							try {
								deleteFolderRecursive(tmpPath);
							} catch (e) {
								debugERROR ("Failed to delete temp path: " + e);
								rejectMetadata.errorsEncountered.push(e);
							}
						} else {
							rejectMetadata.tmpPath = tmpPath;
						}

						try {
							writeOutputFiles(rejectMetadata, outputPath, false, saveMetadataJSON);
						}
						catch (e) {
							rejectMetadata.errorsEncountered.push(e);
							debugERROR("Failure writing metadata.json file:", e);
						}
						/*
							let fileMeta = rejectMetadata;
							fileMeta.resultHTML = config;
							fs.writeFileSync("./testing"+checkStart+".json", JSON.stringify(fileMeta));
						*/

						reject(rejectMetadata);
					}
				)
				.catch(debugERROR)
			;
		}
	});

};

// Work In Progress - DirMode
var checkPathsFileModeAndReturnAbsolutePaths = function () {
	
};


var writeOutputFiles = function (data, outputPath, saveDiffHTML, saveMetadataJSON) {
	if (saveMetadataJSON) {
		fs.writeFileSync(path.join(outputPath, 'metadata.json'), JSON.stringify(data));
	}

	if (saveDiffHTML) {
		fs.writeFileSync(path.join(outputPath, "diffHTML.html"), data.resultHTML);
		debugGeneral("Output Diff-HTML file written successfully".green);
	}
};

var deleteFolderRecursive = function(pathParam) {

	let tmpDirPath = pathParam;
	try {
		if( fs.existsSync(tmpDirPath) ) {
			fs.readdirSync(tmpDirPath).forEach(function(file,index){
				let curPath = path.join(tmpDirPath, file);
				if(fs.lstatSync(curPath).isDirectory()) { // recurse
					deleteFolderRecursive(curPath);
				} else { // delete file
					fs.unlinkSync(curPath);
				}
			});
			fs.rmdirSync(tmpDirPath);

		}
	} catch (e) {
		debugERROR(e);
	}
};


module.exports = {
	// ercChecker returns a Promise
	// in case of any Error, the Promise is REJECTED, and contains a Metadata Object with Timestamps and Error Description
	// otherwise, the Promise is RESOLVED and contains a Metadata Object. In case of Differences, it also contains a Diff-HTML String.
	ercChecker: ercChecker
};
