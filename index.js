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
const checker = require('./lib/checker');

const debug = require('debug')('index:requestHandling');
const debugERROR = require('debug')('index:ERROR');
require('colors');
const sizeof = require('object-sizeof');

const fs = require('fs');
const os = require('os');
const path = require('path');

const globWithXignore = require('./lib/glob-with-X_ignore').globWithXignore;

function Metadata(dateStart, comparisonSet, error) {
	this.checkSuccessful = false;
	this.start = dateStart;
	this.end = Date.now();
	this.comparisonSet = comparisonSet;
	this.images = [];
	this.display = {};
	this.errors = new Array(0);
	if (error != null && error != undefined) {
		this.errors.push(error.toString());
		this.checkSuccessful = false;
	}
}

/**
 *  Config Object
 *
 * 	var checkConfig = {
 * 		directoryMode: Boolean, 				// read papers from directory and subdirectories automatically?  (false: paths for both papers MUST be specified
 *		pathToMainDirectory: String,
 *		pathToOriginalHTML: String,
 *		pathToReproducedHTML: String,
 *		saveFilesOutputPath: String,			// necessary if diff-HTML or check metadata should be saved
 *		saveDiffHTML: Boolean,
 *		outFileName: String						// default: "diffHTML.html"
 *		saveMetadataJSON: Boolean,
 *		createParentDirectories: Boolean, 		// IF outputPath does not yet exist, this flag MUST be set true; otherwise, the check fails
 *		comparisonSetBaseDir: String
 *		checkFileTypes: Array					// case insensitive list of file endings to be included in Check File List
 *		quiet: Boolean
 *		continueOnImageSizeDifference: Boolean	// if true images get compared after resizing, if false (default) images are not further compared if they 
 *												// different dimensions 
 * 	};
 */

/**
 *	node module:  function ercChecker  returns Promise
 */
function ercChecker(config) {

	let directoryMode = config.directoryMode,
		pathToMainDirectory = config.pathToMainDirectory,
		outputPath = config.saveFilesOutputPath,
		saveDiffHTML = config.saveDiffHTML,
		saveMetadataJSON = config.saveMetadataJSON,
		outFileName = config.outFileName || "diffHTML.html",
		createParentDirectories = config.createParentDirectories,
		checkFileTypes = config.checkFileTypes || ['html', 'htm'],
		comparisonSetBaseDir = config.comparisonSetBaseDir || ".",
		quiet = config.quiet;
		continueOnImageSizeDifference = config.continueOnImageSizeDifference || false;


	if (quiet) {
		debug.enabled = debugERROR.enabled = false;
	}

	return new Promise(function (resolve, reject) {
		debug("Starting check, config: %o", config);

		var checkStart = Date.now(),
			pathOriginalHTML, pathReproducedHTML;

		if (!comparisonSetBaseDir) {
			reject(new Metadata(checkStart, [], new Error("comparisonSetBaseDir must be configured")));
		}

		globWithXignore({
			checkFileTypes: checkFileTypes,
			comparisonSetBaseDir: comparisonSetBaseDir,
			ignoreFile: '.ercignore',
			findRoot: false
		}).then(comparisonSet => {
			debug("Comparison set: %o", comparisonSet);

			if ((saveDiffHTML || saveMetadataJSON) && (outputPath == null || outputPath == undefined)) {
				debugERROR("Cannot save files without output path.".red);
				reject(new Metadata(checkStart, comparisonSet, new Error("Requested saving check files without specifying an output path.")));
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
							dirs.forEach(function (current, index) {
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
						catch (e) {
							debugERROR(e);
							reject(new Metadata(checkStart, comparisonSet, "Error creating output directory: " + e))
						}

						fileOutputPath = fs.realpathSync(pathString);
					}
					else {
						debugERROR("Absolute output path could not be determined".red, e);
						reject(new Metadata(checkStart, comparisonSet, "Absolute output path could not be determined. " + e))
					}
				}
			}

			/*
			 * DIRECTORY MODE
			 */
			if (directoryMode) {
				if (pathToMainDirectory == null || pathToMainDirectory == undefined) {
					prematureRejection(new Metadata(checkStart, comparisonSet, "ERROR: directory mode chosen, but no directory specified."), reject);
				}
				try {
					fs.accessSync(pathToMainDirectory);
				}
				catch (e) {
					debugERROR("Error reading input directory: " + e);
					prematureRejection(new Metadata(checkStart, comparisonSet, e), reject);
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
						prematureRejection(new Metadata(checkStart, comparisonSet, "Error: no paper found in directory " + absoluteOriginalDirPath), reject);
					}
					if (reproducedDirContent.length == 0) {
						debugERROR("Error: no paper found in directory " + absoluteReproducedDirPath);
						prematureRejection(new Metadata(checkStart, comparisonSet, "Error: no paper found in directory " + absoluteReproducedDirPath), reject);
					}
				}
				catch (e) {
					debugERROR("Could not read directory: %s", e)
					prematureRejection(new Promise(checkStart, e), reject);
				}
				for (let file in originalDirContent) {
					if (originalDirContent[file].includes(".html")) {
						pathOriginalHTML = path.join(absoluteOriginalDirPath, originalDirContent[file]);
						break;
					}
					if (file == originalDirContent.length - 1) {
						prematureRejection(new Metadata(checkStart, comparisonSet, "Error: provided original paper directory does not contain an .html file."), reject);
					}
				}
				for (let file in reproducedDirContent) {
					if (reproducedDirContent[file].includes(".html")) {
						pathReproducedHTML = path.join(absoluteReproducedDirPath, reproducedDirContent[file]);
						break;
					}
					if (file == reproducedDirContent.length - 1) {
						prematureRejection(new Metadata(checkStart, comparisonSet, "Error: provided reproduced paper directory does not contain an .html file."), reject);
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
					if (!path.isAbsolute(pathOriginalHTML)) {
						pathOriginalHTML = path.join(process.cwd(), config.comparisonSetBaseDir, pathOriginalHTML);
					}
				}
				catch (e) {
					debugERROR("The path to your Original HTML file is invalid. Please check if the file exists.".red, e.message);
					prematureRejection(new Metadata(checkStart, comparisonSet, e), reject);
				}

				try {
					if (!path.isAbsolute(pathReproducedHTML)) {
						pathReproducedHTML = path.join(process.cwd(), config.comparisonSetBaseDir, pathReproducedHTML);
					}
				}
				catch (e) {
					debugERROR("The path to your Reproduced HTML file is invalid. Please check if the file exists.".red, e.message);

					prematureRejection(new Metadata(checkStart, comparisonSet, e), reject);
				}

			}

			function prematureRejection(rejectionMetadata, rejectFunction) {
				if (saveMetadataJSON) {
					writeOutputFiles(rejectionMetadata, outputPath, null, saveMetadataJSON)
				}
				rejectFunction(rejectionMetadata);
			}

			try {
				var originalHTMLBuffer = fs.readFileSync(pathOriginalHTML);
				var reproducedHTMLBuffer = fs.readFileSync(pathReproducedHTML);
			}
			catch (e) {
				debugERROR("Failed to read HTML file.".red);
				debugERROR(e);
				prematureRejection(new Metadata(checkStart, comparisonSet, "wrong path here: " + e), reject);
			}

			if (originalHTMLBuffer.equals(reproducedHTMLBuffer)) {
				debug('The compared files, ' + pathOriginalHTML + ' and ' + pathReproducedHTML + ' do not differ.'.green + '\n' + 'Congrats!'.green);
				let resolveMetadataEqualPapers = new Metadata(checkStart, comparisonSet);
				resolveMetadataEqualPapers.checkSuccessful = true;
				resolve(resolveMetadataEqualPapers);
			}
			else {
				debug("Differences were found; Calling compareHTML to create a HTML file highlighting these differences.");

				checker
					.compareHTML(pathOriginalHTML, pathReproducedHTML, quiet, checkStart)
					.then(
						function (result) {
							debug('Check done'.green);

							let resultMetadata = result;

							resultMetadata.end = Date.now();
							resultMetadata.comparisonSet = comparisonSet;

							if (!process.env.DEV && resultMetadata.images.length != 0) {
								try {
									let tmpDirForDiffImages = resultMetadata.tmpPath;
									deleteFolderRecursive(tmpDirForDiffImages);
									delete resultMetadata.tmpPath;
								} catch (e) {
									debugERROR(e)
								}
							}

							try {
								if (saveMetadataJSON) {
									outputFile = path.join(fileOutputPath, 'metadata.json')
									fs.writeFileSync(outputFile, JSON.stringify(resultMetadata, null, 4));
									debug("Metadata JSON file written successfully to ".green, outputFile);
								}

								if (saveDiffHTML) {
									outputFile = path.join(fileOutputPath, outFileName)
									fs.writeFileSync(outputFile, resultMetadata.display.diff);
									debug("Diff-HTML file written successfully to %s".green, outputFile);
								}
							}
							catch (e) {
								debugERROR("Failed to write output file.".red);
								resultMetadata.errors.push(e);
								debugERROR(e);
								reject(resultMetadata);
							}

							debug("Finished! Returning object of size %s", sizeof(resultMetadata));
							resolve(resultMetadata);
						},
						function (rejectData) {
							debug('Check failed'.red);

							let reason = rejectData[0];
							let tmpPath = rejectData[1];

							debugERROR(reason);
							let rejectMetadata = new Metadata(checkStart, comparisonSet, reason);

							if (!process.env.DEV && tmpPath) {
								try {
									deleteFolderRecursive(tmpPath);
								} catch (e) {
									debugERROR("Failed to delete temp path: " + e);
									rejectMetadata.errors.push(e);
								}
							} else {
								rejectMetadata.tmpPath = tmpPath;
							}
							if (saveMetadataJSON) {
								try {
									fs.writeFileSync(path.join(fileOutputPath, 'metadata.json'), JSON.stringify(rejectMetadata, null, 4));
								}
								catch (e) {
									rejectMetadata.errors.push(e);
									debugERROR("Failure writing metadata.json file:", e);
								}
							}

							debug("Finished! Returning object of size %s", sizeof(rejectMetadata));
							reject(rejectMetadata);
						}
					);
			}
		}).catch(reason => {
			debugERROR(reason);
			reject(new Metadata(checkStart, comparisonSet, new Error("Failed to get Glob with .ercignore: ", reason)));
		});
	});
}


var writeOutputFiles = function (data, outputPath, saveDiffHTML, saveMetadataJSON) {
	if (saveMetadataJSON) {
		fs.writeFileSync(path.join(outputPath, 'metadata.json'), JSON.stringify(data, null, 4));
	}

	if (saveDiffHTML) {
		fs.writeFileSync(path.join(outputPath, "diffHTML.html"), data.display.diff);
		debugGeneral("Output Diff-HTML file written successfully".green);
	}
};

var deleteFolderRecursive = function (pathParam) {

	let tmpDirPath = pathParam;
	try {
		if (fs.existsSync(tmpDirPath)) {
			fs.readdirSync(tmpDirPath).forEach(function (file, index) {
				let curPath = path.join(tmpDirPath, file);
				if (fs.lstatSync(curPath).isDirectory()) { // recurse
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
