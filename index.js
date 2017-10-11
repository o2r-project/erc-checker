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
			debugERROR("The path to your Original HTML file is invalid. Please check if the file exists.".red, e.message);
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
			debugERROR("The path to your Reproduced HTML file is invalid. Please check if the file exists.".red, e.message);
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

		debug("Files to be compared (w/ path): 	" + originalHTML + " - " + reproducedHTML);

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
			debug('The compared files, ' + originalHTML + ' and ' + reproducedHTML + ' do not differ.'.green);
			let metadata = new Metadata(checkStart, null);
			if (program.metadata) {
				fs.writeFileSync('./resultMetadata.json', metadata);
			}
			debug(metadata);
		}
		else {
			debug("Differences were found; Calling compareHTML to create a HTML file highlighting these differences.");
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


/**
 *  Config Object
 *
 * 	var checkConfig = {
 * 		directoryMode: Boolean, 			// read papers from directory and subdirectories automatically?  (false: paths for both papers MUST be specified
 *		pathToMainDirectory: String,
 *		pathToOriginalHTML: String,
 *		pathToReproducedHTML: String,
 *		saveFilesOutputPath: String,		// necessary if diff-HTML or check metadata should be saved
 *		saveDiffHTML: Boolean,
 *		saveMetadataJSON: Boolean,
 *		createParentDirectories: Boolean, 	// IF outputPath does not yet exist, this flag MUST be set true; otherwise, the check fails
 *		quiet: Boolean
 * 	};
 */

/**
 *	node module:  function ercChecker  returns Promise
 */
function ercChecker (config) {

	let directoryMode = config.directoryMode,
		pathToMainDirectory = config.pathToMainDirectory,
		outputPath = config.saveFilesOutputPath,
		saveDiffHTML = config.saveDiffHTML,
		saveMetadataJSON = config.saveMetadataJSON,
		createParentDirectories = config.createParentDirectories,
		quiet = config.quiet;


	if (quiet) {
		debug = debugERROR = null;
	}

	return new Promise( function (resolve, reject) {

		var checkStart = Date.now(),
			pathOriginalHTML, pathReproducedHTML;

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

		/*
		 * DIRECTORY MODE
		 */
		if (directoryMode) {
			if (pathToMainDirectory == null || pathToMainDirectory == undefined) {
				prematureRejection(new Metadata(checkStart, "ERROR: directory mode chosen, but no directory specified."));
			}
			try {
				fs.accessSync(pathToMainDirectory);
			}
			catch (e) {
				debugERROR("Error reading input directory: " + e);
				prematureRejection(new Metadata(checkStart, e));
			}
			let absoluteMainDirPath = fs.realpathSync(pathToMainDirectory);
			let absoluteOriginalDirPath = path.join(absoluteMainDirPath, "original");
			let absoluteReproducedDirPath = path.join(absoluteMainDirPath, "reproduced");
			let originalDirContent, reproducedDirContent;
			try {
				originalDirContent = fs.readdirSync(absoluteOriginalDirPath);
				reproducedDirContent = fs.readdirSync(absoluteReproducedDirPath);
				if (originalDirContent.length == 0) {
					debugERROR("Error: no paper found in directory " + absoluteOriginalDirPath);
					prematureRejection(new Metadata(checkStart, "Error: no paper found in directory " + absoluteOriginalDirPath));
				}
				if (reproducedDirContent.length == 0) {
					debugERROR("Error: no paper found in directory " + absoluteReproducedDirPath);
					prematureRejection(new Metadata(checkStart, "Error: no paper found in directory " + absoluteReproducedDirPath));
				}
			}
			catch (e) {
				debugERROR("Could not read directory: %s", e)
				prematureRejection(new Promise(checkStart, e))
			}
			for (let file in originalDirContent) {
				if(originalDirContent[file].includes(".html")) {
					pathOriginalHTML = path.join(absoluteOriginalDirPath, originalDirContent[file]);
					break;
				}
				if (file == originalDirContent.length-1) {
					prematureRejection(new Metadata(checkStart, "Error: provided original paper direcory does not contain an .html file."))
				}
			}
			for (let file in reproducedDirContent) {
				if(reproducedDirContent[file].includes(".html")) {
					pathReproducedHTML = path.join(absoluteReproducedDirPath, reproducedDirContent[file]);
					break;
				}
				if (file == reproducedDirContent.length-1) {
					prematureRejection(new Metadata(checkStart, "Error: provided reproduced paper direcory does not contain an .html file."))
				}
			}
		}

		/*
		 *  '2-FILE-PATH' MODE
		 */
		else {
			pathOriginalHTML = config.pathToOriginalHTML,
			pathReproducedHTML = config.pathToReproducedHTML;

			try {
				if (path.isAbsolute(pathOriginalHTML)) {
					let originalFileExisting = fs.statSync(pathOriginalHTML);
				} else {
					let originalFileExisting = fs.statSync(path.join(process.cwd(), pathOriginalHTML));
					pathOriginalHTML = path.join(process.cwd(), pathOriginalHTML);
				}
			}
			catch (e) {
				debugERROR("The path to your Original HTML file is invalid. Please check if the file exists.".red, e.message);

				return prematureRejection(new Metadata(checkStart, e));
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
				debugERROR("The path to your Reproduced HTML file is invalid. Please check if the file exists.".red, e.message);

				prematureRejection(new Metadata(checkStart, e));
			}

		}

		function prematureRejection(rejectionMetadata) {
			if (saveMetadataJSON) {
				writeOutputFiles(rejectionMetadata, outputPath, null, saveMetadataJSON)
			}
			reject(rejectionMetadata);
		}

		try {
			var originalHTMLBuffer = fs.readFileSync(pathOriginalHTML);
			var reproducedHTMLBuffer = fs.readFileSync(pathReproducedHTML);
		}
		catch (e) {
			debugERROR("Failed to read HTML file.".red);
			debugERROR(e);
			prematureRejection(new Metadata(checkStart, "wrong path here: "+e));
		}

		if (originalHTMLBuffer.equals(reproducedHTMLBuffer)) {
			debug('The compared files, ' + pathOriginalHTML + ' and ' + pathReproducedHTML + ' do not differ.'.green + '\n' + 'Congrats!'.green);
			let resolveMetadataEqualPapers = new Metadata(checkStart);
			resolveMetadataEqualPapers.checkSuccessful = true;
			resolve(resolveMetadataEqualPapers);
		}
		else {
			debug("Differences were found; Calling compareHTML to create a HTML file highlighting these differences.");

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
								if (saveMetadataJSON) {
									fs.writeFileSync(path.join(fileOutputPath, 'metadata.json'), JSON.stringify(resultMetadata));
									debug("Metadata JSON file written successfully".green);
								}

								if (saveDiffHTML) {
									fs.writeFileSync(path.join(fileOutputPath, "diffHTML.html"), resultMetadata.resultHTML);
									debug("Diff-HTML file written successfully".green);
								}							}
							catch (e) {
								debugERROR("Failed to write output file.".red);
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
						if (saveMetadataJSON) {
							try {
								fs.writeFileSync(path.join(fileOutputPath, 'metadata.json'), JSON.stringify(rejectMetadata));							}
							catch (e) {
								rejectMetadata.errorsEncountered.push(e);
								debugERROR("Failure writing metadata.json file:", e);
							}
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

}


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
