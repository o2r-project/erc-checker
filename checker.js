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

'use strict';

const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;

const debugGeneral = require('debug')('checker:general');
const debugSlice = require('debug')('checker:slice');
const debugCompare = require('debug')('checker:compare');
const debugReassemble = require('debug')('checker:reassemble');
const debugERROR = require('debug')('checker:ERROR');
const colors = require('colors');

const Promise = require('promise');

// const leven = require('leven');

const sizeOf = require('image-size');

var sharp = require('sharp');
var BlinkDiff = require('blink-diff');

var toBase64 = require('base64-arraybuffer');

// RegEx to find all img tags
const allImgTagsAsStrings = /<img src="data:image\/png;base64,(.*)" \/>/g;
const regexSplitCuttingImages = /<img src="data:image\/png;base64,.*" \/>/g;

// Path Strings used
const tempDirectoryForBase64Files = "/tmp/erc-checker/base64EncodedImages";
const tempDirectoryForDecodedImages = "/tmp/erc-checker/decodedImages";
const tempDirectoryForDiffImages = "/tmp/erc-checker/diffImages";
exec("mkdir -p " + tempDirectoryForBase64Files + " " + tempDirectoryForDecodedImages + " " + tempDirectoryForDiffImages,
	function (err) {
		if (err) {
			debugERROR("Could not create one or more tmp directories.".red);
			metadata.errorsEncountered.push(err);
			debugERROR(err);
		}
	}
);

var metadata = {
	differencesFound: false,
	text: "not implemented yet",
	numberOfImages: null,
	images: [],
	resultHTML: null,
	timeAndDateOfCheck : Date.now(),
	errorsEncountered: [],

};


/**
 * This function takes two stringified paths to HTML papers from an ERC following the o2r-specification.
 * It extracts and compares all included images, and creates diff versions where necessary.
 * Then, a 'diff-HTML' file is patched back together, substituting images with their diff version, if one was created.
 *
 * @param originalHTMLPaperPath		Stringified path to original paper's HTML file
 * @param reproducedHTMLPaperPath	Stringified path to reproduced paper's HTML file
 * @param outputPath 				Optional:  name of output file
 */
function stringifyHTMLandCompare(originalHTMLPaperPath, reproducedHTMLPaperPath, outputPath) {

	var textChunks;

	Promise
		.all([readFileSync(originalHTMLPaperPath), readFileSync(reproducedHTMLPaperPath)])
		.then(
			// resolve  <=>  files were read successfully
			function (readFilesArray) {

				debugSlice("Extracting text chunks from original HTML String and saving them for later.");
				textChunks = readFilesArray[0].split(regexSplitCuttingImages);

				return sliceImagesOutOfHTMLStringsAndCreateBuffers(readFilesArray);

			},
			// reject
			function (reason) {
				debugERROR(reason);
			}
		)
		.then(
			// @param resolve Array, holding 2 further Arrays of base64-Strings:
			// [0] is original images,
			// [1] is reproduced images
			function (result2DArrayOfBase64Images) {
				debugSlice("All images were extracted successfully.".green);
				debugCompare("Begin comparing images.".cyan);

				return prepareImagesForComparison(result2DArrayOfBase64Images);
			},
			function (reason) {
				debugERROR(reason);
			}
		)
		.then(
			function (resolve) {
				let preparedImages = resolve.images;
				debugGeneral("Preparation is done, move on to visual comparison".green);
				debugCompare(resolve);

				return runBlinkDiff(preparedImages);

			},
			function (reason) {
				debugERROR(reason);
			}
		)
		.then(
			function(resolve) {
				debugCompare("Visual Comparison completed.".green);
				debugReassemble("Begin Reassembling HTML with Diff-Images where images were not equal.")
				return reassembleDiffHTML(resolve.diffImages, textChunks, outputPath);
			},
			function (reason) {
				debugERROR(reason);
			}
		)

		.catch(debugERROR);
}


function readFileSync(paperPath) {
	return new Promise(function (resolve, reject) {
		try {
			var contentString = fs.readFileSync(paperPath, 'utf-8');
			resolve(contentString);
		}
		catch (e) {
			debugERROR("Error: Could not read file %s.".red, paperPath);
			metadata.errorsEncountered.push(e);
			reject(e);
		}
	})
}


/**
 * Function to extract and save base64-encoded images from stringified HTML papers.
 *
 * @param readFilesArray 	Array with Length === 2; contains Stringified Input HTML papers.
 * 							readFileArray[0] === originalPaper, readFileArray[1] === reproducedPaper
 * @returns {Promise.<*>} 	Resolves, if all images could be extracted and were saved to files.
 */
function sliceImagesOutOfHTMLStringsAndCreateBuffers(readFilesArray) {
	// return a Promise Array
	return new Promise(
		function (resolve, reject) {
			debugGeneral("Successfully read files.");
			// add space and linebreak before every img Tag to stabilize regex splitting later
			let originalPaperString = readFilesArray[0].replace(/<img/g, " \n<img"),
				reproducedPaperString = readFilesArray[1].replace(/<img/g, " \n<img");

			// Extract img-tags (holding base64-images), and store text seperately
			let base64ImagesOriginal = getContentsOfImageTags(originalPaperString),
				base64ImagesReproduced = getContentsOfImageTags(reproducedPaperString),
				arrayOriginalHTMLexcludingImages = originalPaperString.split(regexSplitCuttingImages),
				arrayReproducedHTMLexcludingImages = reproducedPaperString.split(regexSplitCuttingImages);


			debugSlice("Sliced up those pesky Stringsens.");
			debugSlice("Original:  %s images, %s chunks of text.", base64ImagesOriginal.length, arrayOriginalHTMLexcludingImages.length);
			debugSlice("Reproduced: %s images, %s chunks of text.", base64ImagesReproduced.length, arrayReproducedHTMLexcludingImages.length);

			var bufferedImagesOriginal, bufferedImagesReproduced;

			// create Buffer from base64 encoded .png-Images for all Original and Reproduced images
			try {
				bufferedImagesOriginal = base64ImagesOriginal.map(
					function (current, index) {
						let buffer = Buffer.from(current, 'base64');
						debugSlice("Created Buffer for Reproduced image #%s: %s", index, buffer.length);
						return buffer;
					}
				);
				bufferedImagesReproduced = base64ImagesReproduced.map(
					function (current, index) {
						let buffer = Buffer.from(current, 'base64');
						debugSlice("Created Buffer for Reproduced image #%s: %s", index, buffer.length);
						return buffer;
					}
				);

				resolve([bufferedImagesOriginal, bufferedImagesReproduced]);
			}
			catch (e) {
				debugERROR("Failed to create Buffer for at least one base64 encoded image.");
				metadata.errorsEncountered.push(e);
				reject(e);
			}

		}
	);
}



function getContentsOfImageTags(stringifiedHTML) {
	// searches String for patterns matching RegEx, automatically
	return stringifiedHTML.match(allImgTagsAsStrings).map(function (finding) {
		return finding.substr(32, finding.length - 48);
	});
}



function prepareImagesForComparison(twoDimensionalArrayOfBuffers) {

	// resolve.images.inputImageA.base64, resolve.images.inputImageB.base64
	var resultingImageBuffers = { images: [] };


	// Array of Integers; index represents position of image in paper
	// i.e.: first image is represented by Integer at Array [0], and so forth
	// values:	0 <=> images equal, nothing will be changed
	// 			1 <=> images differ and were visually comparison.
	// 			2 <=> images differ in size, at least one was resized; visual comparison contains distortions, features may have been cut of.
	//			3 <=> images differ in size, but resizing failed; visual comparison contains distortions, features may have been cut of.
	var intArrayImagesCompared = [];

	return new Promise(
		function (resolve, reject) {

			var originalImageBuffers = twoDimensionalArrayOfBuffers[0],
				reproducedImageBuffers = twoDimensionalArrayOfBuffers[1];


			let countPreparedImages = 0;

			// if images of equal index in their papers differ, compare them
			originalImageBuffers.map(
				function (current, index) {

					let dimensionsOriginal, dimensionsReproduced;

					var currentBufferOriginal = originalImageBuffers[index],
						currentBufferReproduced = reproducedImageBuffers[index];

					// if buffers are equal === if images are equal --> no comparison or resizing needed
					if ( currentBufferOriginal == currentBufferReproduced ) {
						debugCompare("Images with index %s are equal.", index);
						countPreparedImages++;
						intArrayImagesCompared[index] = 0;
						resultingImageBuffers.images[index] = {
							originalImage: {
								buffer: currentBufferOriginal
							},
							reproducedImage: {
								buffer: currentBufferReproduced
							}

						};
						if (countPreparedImages == originalImageBuffers.length) {
							resolver();
						}
						return;
					}



					try {
						dimensionsOriginal = sizeOf(originalImageBuffers[index]);
						dimensionsReproduced = sizeOf(reproducedImageBuffers[index]);
					}
					catch (e) {
						debugERROR("Failed to get size on image %s. Buffer may be broken.".red, index);
						metadata.errorsEncountered.push(e);
						reject(e);
					}

					debugCompare("Original %s: " + JSON.stringify(dimensionsOriginal), index);
					debugCompare("Reproduced %s: " + JSON.stringify(dimensionsReproduced), index);



					resizeImageIfNecessary(currentBufferOriginal, currentBufferReproduced, dimensionsOriginal, dimensionsReproduced, index)
						.then(
						function (resolve) {
							countPreparedImages++;
							intArrayImagesCompared[index] = resolve.prepOpCode;
							resultingImageBuffers.images[index] = resolve.images;

							if (countPreparedImages == originalImageBuffers.length) {
								resolver();
							}

						}
						);
				});
			function resolver() {

				intArrayImagesCompared.map(
					function (current, index) {
						(current != 0) ? metadata.differencesFound = true : null;
						metadata.images.push(
							{
								imageIndex: index,
								prepResult: current,
								compareResults: null
							}
						);
					}
				);
				resolve(resultingImageBuffers);

			}
		}
	);
}
/**
 *
 *
 * @param originalImageBuffer
 * @param reproducedImageBuffer
 * @param dimensionsOriginal
 * @param dimensionsReproduced
 * @param index
 */
function resizeImageIfNecessary(originalImageBuffer, reproducedImageBuffer, dimensionsOriginal, dimensionsReproduced, index) {

	var originalImage = originalImageBuffer,
		reproducedImage = reproducedImageBuffer;

	function prepResultImages (bufferPreppedOriginal, bufferPreppedReproduction, resultCode) {
		this.images = {
			originalImage : {
				buffer: bufferPreppedOriginal
			},
			reproducedImage : {
				buffer: bufferPreppedReproduction
			}
		};
		this.prepOpCode = resultCode;
	}

	return new Promise(
		function (resolve, reject) {

			if (dimensionsOriginal.width != dimensionsReproduced.width || dimensionsOriginal.height != dimensionsReproduced.height) {
				if (dimensionsOriginal.width != 1344 || dimensionsOriginal.height != 960) {
					sharp(originalImage)
						.resize(1344, 960)
						.png()
						.toBuffer()
						.then(originalResized => {
							debugCompare("Resizing Original image No.%s.".yellow, index);
							originalImage = originalResized;
							if (dimensionsReproduced.width != 1344 || dimensionsReproduced.height != 960) {
								sharp(reproducedImage)
									.resize(1344, 960)
									.png()
									.toBuffer()
									.then(reproResized => {
										debugCompare("Resized Reproduced image No.%s.".yellow, index);
										reproducedImage = reproResized;
										resultHandler(true);
									})
									.catch(e => {
										debugERROR("Failure resizing Reproduced image No.%s.".red, index); resultHandler(false, e);
										metadata.errorsEncountered.push(e);
									});
							}
						})
						.catch(e => {
							debugERROR("Failure resizing Original image No.%s.".red, index);
							metadata.errorsEncountered.push(e);
							resultHandler(false, e)
						});
				}
				else {
					if (dimensionsReproduced.width != 1344 || dimensionsReproduced.height != 960) {
						sharp(reproducedImage)
							.resize(1344, 960)
							.png()
							.toBuffer()
							.then(reproducedResized => {
								debugCompare("Resized Reproduced image No.%s.".yellow, index);
								reproducedImage = reproducedResized;
								resultHandler(true);
							})
							.catch(e => {
								debugERROR("Failure resizing Reproduced image No.%s.".red, index); resultHandler(false, e);
								metadata.errorsEncountered.push(e);
							});
					}
				}
			}
			else {
				debugCompare("No resizing needed for images with index %s", index);
				resolve(new	prepResultImages(originalImage, reproducedImage, 1));
			}

			function resultHandler(resolveThis) {

				if (resolveThis) {
					resolve(new prepResultImages(originalImage, reproducedImage, 2));
				}
				else {
					resolve(new prepResultImages(originalImage, reproducedImage, 3));
				}
			}
		}
	)


}

//var PNGImage = require('pngjs-image');
//var PNGJS = require('node-png');

function runBlinkDiff(images) {

	debugCompare("Starting visual comparison.".cyan);

	let countComparedImages = 0,
		resultImages = {
			diffImages: []
		};


	return new Promise(
		function (resolve, reject) {
			images.map(
				function (current, index) {
					let resultPath = "/tmp/erc-checker/diffImages/diffImage"+index+".png";

					let diff = new BlinkDiff({
						imageA: current.originalImage.buffer,
						imageB: current.reproducedImage.buffer,
						thresholdType: BlinkDiff.THRESHOLD_PERCENT,
						threshold: 0,
						imageOutputPath: resultPath,
						composition: false
					});

					debugCompare("Creating a diff-Image for images with index %s", index);

					diff.run(
						function (err, result) {
							if (err) {
								debugERROR("Error comparing images with index %s.".red, index);
								metadata.errorsEncountered.push(err);
								reject(err);
							}
							countComparedImages++;

							debugCompare('Found %s differing pixels for images with index %s.', result.differences, index);

							if (diff.hasPassed(result.code)) {
								resultImages.diffImages[index] = { buffer : current.originalImage.buffer };
							}
							else {
								resultImages.diffImages[index] =  { buffer : fs.readFileSync(resultPath) };
							}

							metadata.images[index].compareResults = {
								differences : result.differences,
								dimension : result.dimension
							};

							if (countComparedImages === images.length) {
								resolve(resultImages);
							}
						}
					)
				}
			)
		}
	)
}

function reassembleDiffHTML (diffImageBufferArray, textChunkArray, outputName) {

	let reassembledDiffHTMLString = "";

	debugReassemble("Piecing together text chunks and images.");
	textChunkArray.map(
		function (currentTextChunk, index) {
			reassembledDiffHTMLString += currentTextChunk
				+  "<img src=\"data:image/png;base64,"
				+ toBase64.encode(diffImageBufferArray[index].buffer)
				+ "\" width=\"672\" />";
		}
	);
	reassembledDiffHTMLString += textChunkArray.pop();
	debugReassemble("Reassembly done.".green);
	debugGeneral("Writing result HTML".cyan);

	metadata.resultHTML = reassembledDiffHTMLString;

	try {
		if(outputName) {
			fs.writeFileSync("./" + outputName + ".html", reassembledDiffHTMLString);
		}
		else {
			fs.writeFileSync("./result.html", reassembledDiffHTMLString);
		}
	}
	catch(e) {
		debugERROR("Failed to write result HTML file.".red);
		metadata.errorsEncountered.push(e);
		debugERROR(e);
		return;
	}
	debugGeneral("Output files written successfully".green);
	//debugGeneral(metadata);
	return metadata;
}

/*
var paperA = 'test/TestPapers_2/paper_9_img_A.html';
var paperB = 'test/TestPapers_2/paper_9_img_C.html';
stringifyHTMLandCompare(paperA, paperB);
*/

module.exports = {
	compareHTML: stringifyHTMLandCompare
};