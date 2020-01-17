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
var debugSlice = require('debug')('checker:slice');
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

var sharp = require('sharp');
var BlinkDiff = require('blink-diff');
var toBase64 = require('base64-arraybuffer');

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
 * @param originalHTMLPaperPath		Stringified path to original paper's HTML file
 * @param reproducedHTMLPaperPath	Stringified path to reproduced paper's HTML file
 * @param quiet						effectively shut down debug logger
 * @param checkStart				timestamp of check start (UTC time)
 */
function stringifyHTMLandCompare(originalHTMLPaperPath, reproducedHTMLPaperPath, quiet, checkStart) {
	if (quiet) {
		debugGeneral.enabled = debugSlice.enabled = debugCompare.enabled = debugReassemble.enabled = debugERROR.enabled = false;
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
				debugSlice("Extracting text chunks from original HTML String and saving them for later.");
				textChunks = readFilesArray[0].split(regexSplitCuttingImages);
				return sliceImagesOutOfHTMLStringsAndCreateBuffers(readFilesArray);
			},
			function (reason) {
				return Promise.reject(reason);
			}
		)
		.then(
			// @param result2DArrayOfBase64Images resolved Array, holding 2 further Arrays of base64-Strings:
			// [0] contains original images,
			// [1] contains reproduced images
			function (result2DArrayOfBase64Images) {
				debugSlice("All images were extracted successfully.".green);
				debugCompare("Begin comparing images.".cyan);
				return prepareImagesForComparison(result2DArrayOfBase64Images);
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
				return runBlinkDiff(preparedImages);
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
function sliceImagesOutOfHTMLStringsAndCreateBuffers(readFilesArray) {
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

			debugSlice("Sliced up strings");
			debugSlice("Original:  %s images, %s chunks of text.", numImagesOriginal, arrayOriginalHTMLexcludingImages.length);
			debugSlice("Reproduced: %s images, %s chunks of text.", numImagesReproduced, arrayReproducedHTMLexcludingImages.length);

			if (numImagesOriginal != numImagesReproduced) {
				reject([new Error("unequal number of images in input papers: " + numImagesOriginal + " != " + numImagesReproduced), undefined]);
			}

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

function prepareImagesForComparison(twoDimensionalArrayOfBuffers) {
	var resultingImageBuffers = { images: [] };

	// Array of Integers; index represents position of image in paper
	// i.e.: first image is represented by Integer at Array [0], and so forth
	// values:	0 <=> images are of equal size, no resizing necessary
	// 			1 <=> images differ in size, at least one was resized; visual comparison contains distortions, features may have been cut of.
	//			2 <=> images differ in size, but resizing failed; visual comparison contains distortions, features may have been cut of.
	var intArrayImagesCompared = [];

	return new Promise(
		function (resolve, reject) {

			var originalImageBuffers = twoDimensionalArrayOfBuffers[0],
				reproducedImageBuffers = twoDimensionalArrayOfBuffers[1];
			console.log(originalImageBuffers.length);
			console.log(originalImageBuffers);
			console.log(reproducedImageBuffers);
/*
			originalImageBuffers.pop(); 
			originalImageBuffers.pop(); 
			originalImageBuffers.pop(); 
			originalImageBuffers.pop(); 
			originalImageBuffers.pop(); 
			originalImageBuffers.pop(); 
			originalImageBuffers.pop(); 
			originalImageBuffers.pop(); 

			reproducedImageBuffers.pop();
			reproducedImageBuffers.pop();
			reproducedImageBuffers.pop();
			reproducedImageBuffers.pop();
			reproducedImageBuffers.pop();
			reproducedImageBuffers.pop();
			reproducedImageBuffers.pop();
			reproducedImageBuffers.pop();
*/
			console.log(originalImageBuffers);
			console.log(reproducedImageBuffers);

			let countPreparedImages = 0;

			// if images of equal index in their papers differ, compare them
			if (originalImageBuffers.length == 0) {
				resolve({ images: [] });
			}
			originalImageBuffers.forEach(
				function (current, index) {

					let dimensionsOriginal, dimensionsReproduced;

					var currentBufferOriginal = originalImageBuffers[index],
						currentBufferReproduced = reproducedImageBuffers[index];

					// if buffers are equal === if images are equal --> no comparison or resizing needed
					if (currentBufferOriginal == currentBufferReproduced) {
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
						metadata.errors.push(e);
						reject(e);
					}

					debugCompare("Original %s: " + JSON.stringify(dimensionsOriginal), index);
					debugCompare("Reproduced %s: " + JSON.stringify(dimensionsReproduced), index);

					resizeImageIfNecessary(currentBufferOriginal, currentBufferReproduced, dimensionsOriginal, dimensionsReproduced, index)
						.then(function (resolve) {
							console.log(resolve); 
							countPreparedImages++;
							intArrayImagesCompared[index] = resolve.resizeResultCode;
							resultingImageBuffers.images[index] = resolve.images;
							if (countPreparedImages == originalImageBuffers.length) {
								resolver();
							}
						})
						.catch((e)=>{console.log(e)}) 
				});

			function resolver() {
				intArrayImagesCompared.forEach(
					function (current, index) {
						(current != 0) ? metadata.checkSuccessful = false : null;
						metadata.images[index] = (
							{
								imageIndex: index,
								resizeOperationCode: current,
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
 *  Function resizes images of same index that show pairwise differences
 *  Images resized to dimensions 1344 x 960 (standard image size for html papers rendered from rmarkdown
 *
 * @param originalImageBuffer
 * @param reproducedImageBuffer
 * @param dimensionsOriginal
 * @param dimensionsReproduced
 * @param index	 of images in their respective papers
 */
function resizeImageIfNecessary(originalImageBuffer, reproducedImageBuffer, dimensionsOriginal, dimensionsReproduced, index) {

	var originalImage = originalImageBuffer,
		reproducedImage = reproducedImageBuffer;

	function ResizeOperationResults(bufferPreppedOriginal, bufferPreppedReproduction, resultCode) {
		console.log(bufferPreppedOriginal);
		console.log(sizeOf(bufferPreppedOriginal));
		console.log(bufferPreppedReproduction);
		console.log(sizeOf(bufferPreppedReproduction));
		console.log(resultCode);


		this.images = {
			originalImage: {
				buffer: bufferPreppedOriginal
			},
			reproducedImage: {
				buffer: bufferPreppedReproduction
			}
		};
		console.log(this.images); 
		this.resizeResultCode = resultCode;
		console.log(this.resizeResultCode); 
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
										debugERROR("Failure resizing Reproduced image No.%s.".red, index);
										metadata.errors.push(e);
										resultHandler(false, e);
									});
							}
						})
						.catch(e => {
							debugERROR("Failure resizing Original image No.%s.".red, index);
							metadata.errors.push(e);
							resultHandler(false, e)
						});
					}
				else {
					if (dimensionsReproduced.width != 1344 || dimensionsReproduced.height != 960) {
						console.log(dimensionsOriginal.width);
						console.log(dimensionsOriginal.height); 
						console.log(dimensionsReproduced.width);
						console.log(dimensionsReproduced.height);
						sharp(reproducedImage) 
							.metadata()
							.then((metadata) => {
								console.log(metadata);
							})
						sharp(reproducedImage)
							.resize(1344, 960)
							.png()
							.toBuffer()
							.then((reproducedResized) => {
								console.log(reproducedResized);
								debugCompare("Resized Reproduced image No.%s.".yellow, index);
								reproducedImage = reproducedResized;
								resultHandler(true);
							})
							.catch(e => {
								debugERROR("Failure resizing Reproduced image No.%s.".red, index);
								metadata.errors.push(e);
								resultHandler(false, e);
								console.log(reproducedImage);

							});
					}
				}
			}
			else {
				debugCompare("No resizing needed for images with index %s", index);
				resolve(new ResizeOperationResults(originalImage, reproducedImage, 0));
			}

			function resultHandler(resizingSuccessfull) {
				console.log(sizeOf(originalImage));
				console.log(sizeOf(reproducedImage)); 

				if (resizingSuccessfull) {
					resolve(new ResizeOperationResults(originalImage, reproducedImage, 1));
					 // resolve(originalImage);
				}
				else {
					resolve(new ResizeOperationResults(originalImage, reproducedImage, 2));
				}
			}
		}
	)	
}

/**
 *
 * @param images	Array,  length = number of images in compared html papers;
 * 							each element holds an image pair as 2-D Array
 * @returns Promise :
 * 		if image comparison run without errors :	resolved with resulting diff-Images Array and name of used tmp directory ,
 * 		otherwise :		rejected with Error message and (if created) name of used tmp directory
 */
function runBlinkDiff(images) {

	console.log(sizeOf(images[0].originalImage.buffer));
	console.log(sizeOf(images[0].reproducedImage.buffer));

	debugCompare("Starting visual comparison.".cyan);

	let countComparedImages = 0,
		resultImages = {
			diffImages: []
		};
	let tmpBlinkOutputPath;

	return new Promise(
		function (resolve, reject) {
			if (images.length == 0) {
				let emptyReturnObject = {
					diffImages: []
				};

				resolve([emptyReturnObject, ""]);
			}
			else {
				try {
					tmpBlinkOutputPath = fs.mkdtempSync(path.join(os.tmpdir(), 'erc-checker', 'diffImages_'));
				} catch (e) {
					debugERROR("Failed to create temp directory for image comparison output.".red);
					reject(e);
				}

				images.forEach(
					function (current, index) {
						let currImageName = 'diffImage' + index + '.png';
						let blinkOutputPath = path.join(tmpBlinkOutputPath, currImageName);

						let diff = new BlinkDiff({
							imageA: current.originalImage.buffer,
							imageB: current.reproducedImage.buffer,
							thresholdType: BlinkDiff.THRESHOLD_PERCENT,
							threshold: 0,
							imageOutputPath: blinkOutputPath,
							composition: false
						});
						
						const img1 = PNG.sync.read(current.originalImage.buffer);
						const img2 = PNG.sync.read(current.reproducedImage.buffer);
						console.log(img1);
						console.log(img2); 
 
						// test images compared to images from the old o2r platformm 
						const img3 = PNG.sync.read(fs.readFileSync('/home/t_nier01/Downloads/originalTestDiagram.png'));
						const img4 = PNG.sync.read(fs.readFileSync('/home/t_nier01/Downloads/reproducedTestDiagram.png'));

						// variable for the comparison image 
						const diff2 = new PNG({ width: img1.width, height: img1.height });

						// https://github.com/mapbox/pixelmatch
						pixelmatch(img1.data, img2.data, diff2.data, img1.width, img1.height, {threshold: 0.1});					
						// pixelmatch(img3, img4, diff2.data, width, height, { alpha: 0.5, threshold: 0.1, diffColor: [255, 0, 0], aaColor: [255, 255, 0], includeAA: true, diffMask: true });
						// pixelmatch(img3.data, img4.data, diff2.data, width, height, { alpha: 0.5, threshold: 0.1, diffColor: [255, 0, 0], aaColor: [255, 255, 0], includeAA: true, diffMask: true });
						
						/**
						 * function which takes the object which contains the differences and 
						 * returns a boolean if there are differences (true) or not (false)
						 * @param {*} diff 
						 */
						function differences (diff) {
							var differences = false;
							for (var i = 0; i < diff.data.byteLength; i++) {
								if (diff.data[i] != 0) {
									// console.log("nicht leer"); 
									differences = true;
								}
								else {
									// console.log("leer");
								}
							}
							return differences; 
						}

						console.log(differences(diff2));

						fs.writeFileSync('diff2.png', PNG.sync.write(diff2));




						debugCompare("Creating a diff-Image for images with index %s", index);

						diff.run(
							function (err, result) {
								if (err) {
									debugERROR("Error comparing images with index %s.".red, index);
									metadata.errors.push(err);
									reject([new Error("Error reading file", err), tmpBlinkOutputPath]);
								}

								countComparedImages++;

								if (diff.hasPassed(result.code)) {
									resultImages.diffImages[index] = { buffer: current.originalImage.buffer };
								}
								else {
									metadata.F;
									try {
										resultImages.diffImages[index] = { buffer: fs.readFileSync(blinkOutputPath) };
									} catch (e) {
										debugERROR(e.red)
										reject([new Error("Error reading diff image #" + index + " : " + e), tmpBlinkOutputPath]);
									}
								}
								try {
									metadata.images[index].compareResults = {
										differences: result.differences,
										dimension: result.dimension
									};
								} catch (e) { }

								if (countComparedImages === images.length) {
									resolve([resultImages, tmpBlinkOutputPath]);
								}
							}
						)
					}
				);
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