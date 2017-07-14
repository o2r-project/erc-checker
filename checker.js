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

'use strict'

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

const sizeOf = require('image-size');
const MagickCLI = require('magick-cli');
const decodeBase64 = require('js-base64').decode;
const encodeBase64 = require('js-base64').encode;


// RegEx to find all img tags
var allImgTagsAsStrings = /<img src="data:image\/png;base64,(.*)" \/>/g;
var regexSplitCuttingImages = /<img src="data:image\/png;base64,.*" \/>/g;

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
			// resolve
			function(readFilesArray) {
				debugGeneral("Successfully read files.");
				// add space and linebreak before every img Tag to stabilize regex splitting later
				let originalPaperString = readFilesArray[0].replace(/<img/g, " \n<img"),
					reproducedPaperString = readFilesArray[1].replace(/<img/g, " \n<img");

				// Extract img-tags (holding base64-images), and store text seperately
				let base64ImagesOriginalWithWidth = getContentsOfImageTags(originalPaperString),
					base64ImagesReproducedWithWidth = getContentsOfImageTags(reproducedPaperString),
					arrayOriginalHTMLexcludingImages = originalPaperString.split(regexSplitCuttingImages),
					arrayReproducedHTMLexcludingImages = reproducedPaperString.split(regexSplitCuttingImages);
				debugSlice("Sliced up those pesky Stringsens.");
				debugSlice("Original:  %s images, %s chunks of text.", base64ImagesOriginalWithWidth.length, arrayOriginalHTMLexcludingImages.length);
				debugSlice("Reproduced: %s images, %s chunks of text.", base64ImagesReproducedWithWidth.length, arrayReproducedHTMLexcludingImages.length);

				//TODO: return Promise.all()
			},
			// reject
			function(reason) {
				debugERROR(reason);
			}
		);
}

stringifyHTMLandCompare("/home/timmimim/ownCloud/o2r-data/Hilfskräfte/Kühnel/Checker/erc-checker/test/TestPapers_2/paper_9_img_A.html",
						"/home/timmimim/ownCloud/o2r-data/Hilfskräfte/Kühnel/Checker/erc-checker/test/TestPapers_2/paper_9_img_B.html");

function readFileSync (paperPath) {
	return new Promise (function (resolve, reject) {
		try {
			var contentString =  fs.readFileSync(paperPath, 'utf-8');
			resolve(contentString);
		}
		catch (e) {
			debugERROR("Error: Could not read file %s. Error code: %s", paperPath, e);
			reject("Error reading file(s).".red);
		}
	})
}

function getContentsOfImageTags(stringifiedHTML) {

	return stringifiedHTML.match(allImgTagsAsStrings).map(function (finding) {
		return finding.substr(8, finding.length);
	});
}


module.exports = {
	compareHTML: stringifyHTMLandCompare
};