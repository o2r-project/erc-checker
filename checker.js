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

// RegEx to find all img tags
const allImgTagsAsStrings = /<img src="data:image\/png;base64,(.*)" \/>/g;
const regexSplitCuttingImages = /<img src="data:image\/png;base64,.*" \/>/g;

// Path Strings used
const tempDirectoryForBase64Files = "/tmp/erc-checker/base64EncodedImages";
const tempDirectoryForDecodedImages = "/tmp/erc-checker/decodedImages";
const tempDirectoryForDiffImages = "/tmp/erc-checker/diffImages";
exec("mkdir -p " + tempDirectoryForBase64Files + " " + tempDirectoryForDecodedImages + " " + tempDirectoryForDiffImages,
	function (err) {
		if(err) {
			debugERROR("Could not create one or more tmp directories.".red);
			debugERROR(err);
		}
	}
);

var metadata = {
	text: "not implemented yet",
	images: [

	]
};


/**
 * This function takes two stringified paths to HTML papers from an ERC following the o2r-specification.
 * It extracts and compares all included images, and creates diff versions where necessary.
 * Then, a 'diff-HTML' file is patched back together, substituting images with their diff version, if one was created.
 *
 * @param originalHTMLPaperPath		Stringified path to original paper's HTML file
 * @param reproducedHTMLPaperPath	Stringified path to reproduced paper's HTML file
 * @param outputName			Optional:  name of output file
 */
function stringifyHTMLandCompare(originalHTMLPaperPath, reproducedHTMLPaperPath, outputName) {

// promises ALL:
// - read file 1
// - read file 2
// ALL:
// - compare image 1
// - compare image 2
// - compare image 3
// THEN:
// -
// - ...


	Promise
		.all([readFileSync(originalHTMLPaperPath), readFileSync(reproducedHTMLPaperPath)])
		.then(
			// resolve  <=>  files were read successfully
			function(readFilesArray) {

				return sliceImagesOutOfHTMLStringsAndCreateBuffers(readFilesArray);

			},
			// reject
			function(reason) {
				debugERROR(reason);
			}
		)
		.then(
			// @param resolve Array, holding 2 further Arrays of base64-Strings:
			// [0] is original images,
			// [1] is reproduced images
			function (resolve) {
				debugSlice("All images were extracted successfully.".green);
				debugCompare("Begin comparing images.".cyan);

				//check(resolve, "Raw");

				return prepareImagesForComparison(resolve);
			},
			function (reason) {
				debugERROR(reason);
			}
		)
		.then(
			function (resolve) {

				//check(resolve, "Prepared");

				debugGeneral("prep done, now blink it");

				runBlinkDiff(resolve[0][0], resolve[0][1]);

			},
			function (reason) {
				debugERROR(reason);
			}
		);
}

stringifyHTMLandCompare("/home/timmimim/ownCloud/o2r-data/Hilfskräfte/Kühnel/Checker/erc-checker/test/TestPapers_2/paper_9_img_A.html",
						"/home/timmimim/ownCloud/o2r-data/Hilfskräfte/Kühnel/Checker/erc-checker/test/TestPapers_2/paper_9_img_C.html");

/*function check (arrayBuffersAndOtherStuff, state) {
	arrayBuffersAndOtherStuff[0].map(
		function(current, index) {
			fs.writeFile(path.join(tempDirectoryForDecodedImages, "original"+state+index+".png"), current);
		}
	);
	arrayBuffersAndOtherStuff[1].map(
		function(current, index) {
			fs.writeFile(path.join(tempDirectoryForDecodedImages, "reproduced"+state+index+".png"), current);
		}
	);
}*/



function readFileSync (paperPath) {
	return new Promise (function (resolve, reject) {
		try {
			var contentString =  fs.readFileSync(paperPath, 'utf-8');
			resolve(contentString);
		}
		catch (e) {
			debugERROR("Error: Could not read file %s.".red, paperPath);
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
function sliceImagesOutOfHTMLStringsAndCreateBuffers (readFilesArray) {
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
						debugSlice("Created Buffer for Original image #%s.", index);
						return Buffer.from(current, 'base64');
					}
				);
				bufferedImagesReproduced = base64ImagesReproduced.map(
					function (current, index) {

						debugSlice("Created Buffer for Reproduced image #%s.", index);
						return Buffer.from(current, 'base64');
					}
				);

				resolve([bufferedImagesOriginal, bufferedImagesReproduced]);
			}
			catch (e) {
				debugERROR("Failed to create Buffer for at least one base64 encoded image.")
				reject(e);
			}

		}
	);
}



function getContentsOfImageTags(stringifiedHTML) {
	// searches String for patterns matching RegEx, automatically
	return stringifiedHTML.match(allImgTagsAsStrings).map(function (finding) {
		return finding.substr(32, finding.length-48);
	});
}



function prepareImagesForComparison (twoDimensionalArrayOfBuffers) {
	var resultingImageBuffers = [];
	resultingImageBuffers[0] = [];
	resultingImageBuffers[1] = [];

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

					try {
						dimensionsOriginal = sizeOf(originalImageBuffers[index]);
						dimensionsReproduced = sizeOf(reproducedImageBuffers[index]);
					}
					catch (e) {
						debugERROR("Failed to get size on image %s. Buffer may be broken.".red, index);
						reject(e);
					}

					debugCompare("Original %s: " + JSON.stringify(dimensionsOriginal), index);
					debugCompare("Reproduced %s: " + JSON.stringify(dimensionsReproduced), index);



					resizeImageIfNecessary(currentBufferOriginal, currentBufferReproduced, dimensionsOriginal, dimensionsReproduced)
						.then(
							function (resolve) {
								countPreparedImages++;
								intArrayImagesCompared[index] = resolve[2];
								resultingImageBuffers[index][0] = resolve[0];
								resultingImageBuffers[index][1] = resolve[1];

								if (countPreparedImages == originalImageBuffers.length) {
										resolver();
								}

							}
						);
				});
			function resolver() {

				intArrayImagesCompared.map(
					function (current, index) {
						metadata.images.push(
							{
								imageIndex: index,
								size: current
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
 */
function resizeImageIfNecessary (originalImageBuffer, reproducedImageBuffer, dimensionsOriginal, dimensionsReproduced, index) {

	var originalImage = originalImageBuffer,
		reproducedImage = reproducedImageBuffer;

	return new Promise (
		function (resolve, reject) {

			if (dimensionsOriginal.width != dimensionsReproduced.width || dimensionsOriginal.height != dimensionsReproduced.height) {
				if (dimensionsOriginal.width != 1344 || dimensionsOriginal.height != 960) {
					sharp(originalImage)
						.resize(1344, 960)
						.png()
						.toBuffer()
						.then(originalResized => {
							debugCompare("Resized Original image No.%s.".yellow, index);
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
										debugERROR("Failure resizing Reproduced image No.%s.".red, index); resultHandler(false, e);});
							}
						})
						.catch(e => {
							debugERROR("Failure resizing Original image No.%s.".red, index);
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
								debugERROR("Failure resizing Reproduced image No.%s.".red, index); resultHandler(false, e);});
					}
				}
			}
			else {
				resolve([originalImageBuffer, reproducedImageBuffer, 1]);
			}

			function resultHandler(resolveThis) {

				if (resolveThis) {
					resolve([originalImage, reproducedImage, 2]);
				}
				else {
					resolve([originalImage, reproducedImage, 3]);
				}
			}
		}
	)


}

//var PNGImage = require('pngjs-image');
//var PNGJS = require('node-png');

function runBlinkDiff(currentOriginal, currentReproduced) {

	debugCompare("blinking it")

	var diff = new BlinkDiff({
		imageA: currentOriginal,
		imageB: currentReproduced,
		thresholdType: BlinkDiff.THRESHOLD_PERCENT,
		threshold: 0,
		imageOutputPath: "/tmp/erc-checker/testCompare.png",
		composition: false
	});

	//debugCompare("Creating a diff-Image for images with index %s", index);
	diff.run( function (err, result) {
		if (err) throw err;
		debugCompare('Found ' + result.differences + ' differing pixels.');
		console.log(result);
		debugCompare(diff);
		/*diff._imageOutput.writeImage("/tmp/erc-checker/whataboutthis.png");
		var buffer = PNGee.sync.write(diff._imageOutput.getImage());
		fs.writeFile("/tmp/erc-checker/stuff.png", buffer)*/
	});

}


module.exports = {
	compareHTML: stringifyHTMLandCompare
};