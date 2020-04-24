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
const os = require('os');
const path = require('path');

const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');

var debugGeneral = require('debug')('checker:general');
var debugExtract = require('debug')('checker:extract');
var debugCompare = require('debug')('checker:compare');
var debugReassemble = require('debug')('checker:reassemble');
var debugERROR = require('debug')('checker:ERROR');
const colors = require('colors');

const Promise = require('promise');

const sizeOf = require('image-size');

var textualDiff = require('node-htmldiff');
var textDiffCSS = "<body>\n<style type=\"text/css\">\n" +
	"\n" +
	"ins { background-color: #aaffaa; text-decoration: none }\n" +
	"del { background-color: #ff8888; text-decoration: none }\n" +
	"\n" +
	"</style>";

var toBase64 = require('base64-arraybuffer');
var Jimp = require('jimp');


// RegEx to find all img tags
const allImgTagsAsStrings = /<img src="data:image\/png;base64,(.*)" \/>/g;
// RegEx to split HTML, excluding images
const regexSplitCuttingImages = /<img src="data:image\/png;base64,.*" \/>/g;

var metadata = {
	checkSuccessful: true,
	images: [],
	display: {},
	numTextDifferrences: 0,
	start: null,
	end: null,
	errors: []
};

/**
 * This function takes two stringified paths to HTML papers from an ERC following the o2r-specification.
 * It extracts and compares all included images, and creates diff versions where necessary.
 * Then, a 'diff-HTML' file is patched back together, substituting images with their diff version, if one was created.
 *
 * @param originalHTMLPaperPath			Stringified path to original paper's HTML file
 * @param reproducedHTMLPaperPath		Stringified path to reproduced paper's HTML file
 * @param quiet							effectively shut down debug logger
 * @param checkStart					timestamp of check start (UTC time)
 */
function stringifyHTMLandCompare(originalHTMLPaperPath, reproducedHTMLPaperPath, quiet, checkStart) {
	if (quiet) {
		debugGeneral.enabled = debugExtract.enabled = debugCompare.enabled = debugReassemble.enabled = debugERROR.enabled = false;
	}
	metadata = {
		checkSuccessful: true,
		images: [],
		display: {},
		numTextDifferrences: 0,
		start: null,
		end: null,
		errors: []
	};

	// set start date in check metadata
	metadata.start = checkStart;

	// if tmp directory for erc-checker does not exist already, create it
	try {
		fs.mkdirSync(path.join(os.tmpdir(), 'erc-checker'));
	} catch (e) { }

	// initiate container variable for text-chunks from input HTML
	var textChunks;

	// Main process
	return Promise
		.all([readFileSync(originalHTMLPaperPath, 'utf8'), readFileSync(reproducedHTMLPaperPath, 'utf8')])
		.then(
			// resolve  <=>  files were read successfully
			// resolve parameter is a 2-D Array, holding both input files' contents as utf-8 Strings
			function (readFilesArray) {
				debugGeneral("Comparing HTML tags usually containing Text and including differences.");
				// check html for differences in text tags, and specifically exclude tags listed in 5th parameter
				readFilesArray[0] = textualDiff(readFilesArray[1], readFilesArray[0], 'erc-checker', null, "iframe,object,math,svg,script,video,head,style,img");
				// add CSS to `<body>` to highlight differences an a more pleasant and obvious way.
				readFilesArray[0] = readFilesArray[0].replace("<body>", textDiffCSS);
				metadata.numTextDifferrences = (readFilesArray[0].match(/<ins data-operation-index/g) || []).length;
				debugExtract("Extracting text chunks from original HTML String and saving them for later.");
				textChunks = readFilesArray[0].split(regexSplitCuttingImages);
				return extractImagesOutOfHTMLStringsAndCreateBuffers(readFilesArray);
			},
			function (reason) {
				return Promise.reject(reason);
			}
		)
		.then(
			// @param resultArrayOfBase64Images	resolved Array, holding on each position a couple of two more arrays of which one
			// 									is the original image [0] and the other one is the correspoding reproduced image [1].
			function (resultArrayOfBase64Images) {
				debugExtract("All images were extracted successfully.".green);
				debugCompare("Begin comparing images.".cyan);
				return prepareImagesForComparison(resultArrayOfBase64Images);
			},
			function (reason) {
				return Promise.reject(reason);
			}
		)
		.then(
			// @param resizeOperationCode contains an array of 'image' objects, each holding a buffer for both original and reproduced image
			function (resizeOperationCode) {
				let preparedImages = resizeOperationCode.images;
				debugGeneral("Preparation is done, move on to visual comparison.".green);
				return compareImages(preparedImages);
			},
			function (reason) {
				return Promise.reject(reason);
			}
		)
		.then(
			// @param result is a 2-D json object,
			// holding at result[0] an array of diff-Images created from each pair of input images (corresponding by order),
			// and in result[1] the temporary directory path used by the comparison tool.
			function (result) {
				debugCompare("Visual Comparison completed.".green);
				debugReassemble("Begin Reassembling HTML with Diff-Images where images were not equal.");
				metadata.tmpPath = result[1];
				return reassembleDiffHTML(result[0].diffImages, textChunks);
			},
			function (reason) {

				// 2 cases:
				// error after diff analysis --> tmp directory exists and is passed along with error in an array
				if (typeof reason == Array) {
					return Promise.reject(reason);
				}
				// error happened before tmp directory was created, only error returned
				else {
					return Promise.reject([reason]);
				}
			}
		)
}

function readFileSync(paperPath) {
	return new Promise(function (resolve, reject) {
		try {
			var contentString = fs.readFileSync(paperPath, 'utf-8');
			resolve(contentString);
		}
		catch (e) {
			debugERROR("Error: Could not read file %s.".red, paperPath);
			metadata.errors.push(e);
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
function extractImagesOutOfHTMLStringsAndCreateBuffers(readFilesArray) {
	// array for resulting image buffers
	var resultingImageBuffers = [];
	// return a Promise Array
	return new Promise(
		function (resolve, reject) {
			debugGeneral("Successfully read files.");

			// add space and line break before every img Tag to stabilize regex splitting later
			let originalPaperString = readFilesArray[0].replace(/<img/g, " \n<img"),
				reproducedPaperString = readFilesArray[1].replace(/<img/g, " \n<img");

			// Extract img-tags (holding base64-images), and store text separately
			let base64ImagesOriginal = getContentsOfImageTags(originalPaperString),
				base64ImagesReproduced = getContentsOfImageTags(reproducedPaperString),
				arrayOriginalHTMLexcludingImages = originalPaperString.split(regexSplitCuttingImages),
				arrayReproducedHTMLexcludingImages = reproducedPaperString.split(regexSplitCuttingImages);

			let numImagesOriginal = base64ImagesOriginal.length,
				numImagesReproduced = base64ImagesReproduced.length;

			debugExtract("Sliced up strings");
			debugExtract("Original:  %s images, %s chunks of text.", numImagesOriginal, arrayOriginalHTMLexcludingImages.length);
			debugExtract("Reproduced: %s images, %s chunks of text.", numImagesReproduced, arrayReproducedHTMLexcludingImages.length);

			if (numImagesOriginal != numImagesReproduced) {
				reject([new Error("unequal number of images in input papers: " + numImagesOriginal + " != " + numImagesReproduced), undefined]);
			}

			var bufferedImagesOriginal, bufferedImagesReproduced;

			// create Buffer from base64 encoded .png-Images for all Original and Reproduced images
			try {
				bufferedImagesOriginal = base64ImagesOriginal.map(
					function (current, index) {
						let buffer = Buffer.from(current, 'base64');
						debugExtract("Created Buffer for Reproduced image #%s: %s", index, buffer.length);
						return buffer;
					}
				);
				bufferedImagesReproduced = base64ImagesReproduced.map(
					function (current, index) {
						let buffer = Buffer.from(current, 'base64');
						debugExtract("Created Buffer for Reproduced image #%s: %s", index, buffer.length);
						return buffer;
					}
				);

				/*
				Sort buffer in an array which contains in each position a further array with the originalImageBuffer and the reproducedImageBuffer.
				If there are more reproduced buffers than original buffers, they are left out.
				*/
				bufferedImagesOriginal.forEach(
					function (current, index) {
						resultingImageBuffers[index] = [current, bufferedImagesReproduced[index]]
					}
				)

				/*
				If there are more reproduced images than original images there is a reject.
				*/
				if (bufferedImagesOriginal.length != bufferedImagesReproduced.length) {
					reject({ error: "unequal number of images in input papers: " + bufferedImagesOriginal.length + " originalImageBuffers != " + bufferedImagesReproduced.length + " reproducedImageBuffers" });
				}
				resolve(resultingImageBuffers);
			}
			catch (e) {
				debugERROR("Failed to create Buffer for at least one base64 encoded image.");
				metadata.errors.push(e);
				reject(e);
			}

		}
	);
}

function getContentsOfImageTags(stringifiedHTML) {
	// searches String for patterns matching RegEx, automatically
	try {
		return stringifiedHTML.match(allImgTagsAsStrings).map(function (finding) {
			return finding.substr(32, finding.length - 48);
		});
	}
	catch (e) {
		return [];
	}
}


/**
 * Function which is a template for the structure of the buffer.
 * @param currentBufferOriginal
 * @param currentBufferReproduced
 */
function templateBuffer(currentBufferOriginal, currentBufferReproduced) {
	return {
		originalImage: {
			buffer: currentBufferOriginal
		},
		reproducedImage: {
			buffer: currentBufferReproduced
		}
	};
}

/**
 * Function which proofs if there are images available, if yes, there is a proof if a resizing is needed, or if
 * no further preperation is needed. Accordingly, the reproduced buffers are resized to the size of the original buffers,
 * the metadata is adjusted and an array with the pairs of original and reproduced buffers is returned.
 * @param twoDimensionalArrayOfBuffers
 */
function prepareImagesForComparison(twoDimensionalArrayOfBuffers) {
	// resulting ImageBuffers
	var resultingImageBuffers = { images: [] };

	return new Promise(
		function (resolve, reject) {

			// if the array is empty there are no images to prepare for a comparison
			if (twoDimensionalArrayOfBuffers.length == 0) {
				resolve({ images: [] });
			}

			// Here a counting variable as well as a function resolver in the following is necessary, otherwise the image size adjustment fails due to asynchrony
			let countPreparedImages = 0;

			twoDimensionalArrayOfBuffers.forEach(
				function (current, index) {

					let dimensionsOriginal, dimensionsReproduced;

					// if buffers are equal === if images are equal --> no comparison or resizing needed
					if (current[0] === current[1]) {
						countPreparedImages++;
						resultingImageBuffers.images[index] = templateBuffer(current[0], current[1]);
						if (countPreparedImages == twoDimensionalArrayOfBuffers.length) {
							resolver();
						}
					}

					try {
						dimensionsOriginal = sizeOf(current[0]);
						dimensionsReproduced = sizeOf(current[1]);
					}
					catch (e) {
						debugERROR("Failed to get size on image %s. Buffer may be broken.".red, index);
						metadata.errors.push(e);
						reject(e);
					}

					debugCompare("Original %s: " + JSON.stringify(dimensionsOriginal), index);
					debugCompare("Reproduced %s: " + JSON.stringify(dimensionsReproduced), index);

					resizeImageIfNecessary(current[0], current[1], dimensionsOriginal, dimensionsReproduced)
						.then(function (value) {
							countPreparedImages++;
							resultingImageBuffers.images[index] = value;
							if (countPreparedImages == twoDimensionalArrayOfBuffers.length) {
								resolver();
							}
						}
						).catch(function (err) {
							debug(err);
						});
				}
			);

			function resolver() {
				twoDimensionalArrayOfBuffers.forEach(
					function (current, index) {
						(current != 0) ? metadata.checkSuccessful = false : null;
						metadata.images[index] = (
							{
								imageIndex: index,
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
 * Function which resizes the reproduced buffer on the size of the original buffer and returns the resized reproduced buffer.
 * The resizing is realized by Jimp.
 * @param reproducedImageBuffer
 * @param dimensionsOriginal
 * @param done
 */
function resizing(reproducedImageBuffer, dimensionsOriginal, done) {

	Jimp.read(reproducedImageBuffer, (err, image) => {
		if (err) debug(err);

		image.resize(dimensionsOriginal.width, dimensionsOriginal.height)
			.getBuffer(image._originalMime, (err, result) => {
				if (err) debug(err);
				done(result);
			});
	});
}

/**
 * Function which proofs if the dimensions of the buffers are different, if yes a resizing function is called, and the function resolves with the
 * the couple of the original and (resized - if needed) reproduced buffer applied on a template buffer structure.
 *
 * @param originalImageBuffer
 * @param reproducedImageBuffer
 * @param dimensionsOriginal
 * @param dimensionsReproduced
 */
function resizeImageIfNecessary(originalImageBuffer, reproducedImageBuffer, dimensionsOriginal, dimensionsReproduced) {

	return new Promise(
		function (resolve, reject) {
			if (dimensionsOriginal.width != dimensionsReproduced.width || dimensionsOriginal.height != dimensionsReproduced.height) {
				resizing(reproducedImageBuffer, dimensionsOriginal, (reproducedImageBufferResized) => {
					resolve(templateBuffer(originalImageBuffer, reproducedImageBufferResized));
				});
			}

			else {
				debugCompare("No resizing needed for images");
				resolve(templateBuffer(originalImageBuffer, reproducedImageBuffer));
			}
		}
	)
}

/**
 * Function which compares each of the image pairs and creates a corresponding diff image by using pixelmatch
 * @param images	Array,  length = number of images in compared html papers;
 * 							each element holds an image pair as 2-D Array
 * @returns Promise :
 * 		if image comparison run without errors :	resolved with resulting diff-Images Array and name of used tmp directory ,
 * 		otherwise :		rejected with Error message and (if created) name of used tmp directory
 */
function compareImages(images) {
	debugCompare("Starting visual comparison.".cyan);

	let resultImages = {
		diffImages: []
	};
	let tmpImagePath;

	return new Promise(
		function (resolve, reject) {
			if (images.length == 0) {
				debugCompare("No images given.".cyan);

				let emptyReturnObject = {
					diffImages: []
				};

				resolve([emptyReturnObject, ""]);
			}
			else {
				try {
					tmpImagePath = fs.mkdtempSync(path.join(os.tmpdir(), 'erc-checker', 'diffImages_'));
				} catch (e) {
					debugERROR("Failed to create temp directory for image comparison output.".red);
					reject(e);
				}

				images.forEach(
					function (current, index) {
						let currImageName = 'diffImage' + index + '.png';
						let currImageOutputPath = path.join(tmpImagePath, currImageName);
						debugCompare("Saving temporary comparison images to %s", currImageOutputPath);

						const originalImageBuffer = PNG.sync.read(current.originalImage.buffer);
						const reproducedImageBuffer = PNG.sync.read(current.reproducedImage.buffer);

						// variable for the output with the differences 
						const diff = new PNG({ width: originalImageBuffer.width, height: originalImageBuffer.height });
						const diffDimension = originalImageBuffer.width * originalImageBuffer.height;

						debugCompare("Creating a diff-Image for images with index %s", index);

						try {
							// pixelmatch and write the diff to files 
							var numberMismatchedPixels = pixelmatch(originalImageBuffer.data, reproducedImageBuffer.data, diff.data, originalImageBuffer.width, originalImageBuffer.height, { threshold: 0.1 });
							fs.writeFileSync(currImageOutputPath, PNG.sync.write(diff));
							debugCompare("Found %s mismatched pixels.", numberMismatchedPixels);
						}
						catch (err) {
							debugERROR("Error comparing images with index %s.".red, index);
							metadata.errors.push(err);
							reject([new Error("Error reading file", err), tmpImagePath]);
						}

						if (numberMismatchedPixels === 0) {
							// for the case that images are identical, the original image is returned 
							resultImages.diffImages[index] = { buffer: current.originalImage.buffer };
						}
						else {
							// for the case that images are different, the diff image is returned 
							try {
								resultImages.diffImages[index] = { buffer: fs.readFileSync(currImageOutputPath) };
							} catch (e) {
								debugERROR(e.red)
								reject([new Error("Error reading diff image #" + index + " : " + e), currImageOutputPath]);
							}
						}

						try {
							// number of differing pixels and dimension of the diff is added to the metadata 
							metadata.images[index].compareResults = {
								differences: numberMismatchedPixels,
								dimension: diffDimension
							};
						} catch (e) { }
					}
				);

				debugCompare("Finished and returning %s result images", resultImages.length);
				resolve([resultImages, tmpImagePath]);
			}
		}
	)
}

function reassembleDiffHTML(diffImageBufferArray, textChunkArray) {
	return new Promise(
		function (resolve, reject) {
			let reassembledDiffHTMLString = "";
			debugReassemble("Piecing together text chunks and images.");
			if (diffImageBufferArray.length == 0) {
				metadata.display.diff = textChunkArray[0];
			}
			else {
				diffImageBufferArray.forEach(
					function (currentImage, index) {
						reassembledDiffHTMLString += textChunkArray[index]
							+ "<img src=\"data:image/png;base64,"
							+ toBase64.encode(currentImage.buffer)
							+ "\" width=\"672\" />";
					}
				);
				reassembledDiffHTMLString += textChunkArray.pop();
				debugReassemble("Reassembly done.".green);

				metadata.display.diff = reassembledDiffHTMLString;
			}

			if (metadata.numTextDifferrences > 0) {
				debugCompare("Found %s text diffs, check not successful".red, metadata.numTextDifferrences);
				metadata.checkSuccessful = false;
			}

			if (metadata.images.length > 0) {
				let imageDifferencesSum = metadata.images
					.map(image => { return (image.compareResults.differences) })
					.reduce((accumulator, currentValue) => accumulator + currentValue);
				if (imageDifferencesSum > 0) {
					debugCompare("Found %s image diffs in %s images, check not successful".red, imageDifferencesSum, metadata.images.length);
					metadata.checkSuccessful = false;
				}
			}

			resolve(metadata);
		}
	);
}

module.exports = {
	compareHTML: stringifyHTMLandCompare
};