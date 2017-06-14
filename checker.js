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

const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const debug = require('debug')('checker:general');
const debugSlice = require('debug')('checker:slice');
const debugComp = require('debug')('checker:compare');
const debugRe = require('debug')('checker:reassemble');
const colors = require('colors');

var iterate;

// RegEx to find all img tags
var allImgTagsAsStrings = /<img src="data:image\/png;base64,(.*)" \/>/g;
var regexSplitCuttingImages = /<img src="data:image\/png;base64,.*" \/>/g;


/* TODO: splice HTML into head and body, only then extract base64-images from body and then compare remaining snippets textually;
   TODO: for now: leave Head with first body-segment, split HTML String at every Image, cutting out images and save to array "splitHTMLexcludingImages"*/
//var head = /regex/
var arrayOriginalHTMLexcludingImages;
var arrayReproducedHTMLexcludingImages;

var boolArrayImageDiffOrdered = [];


function stringifyHTMLandCompare(originalPaperHTML, reproducedPaperHTML, outputName) {
	fs.readFile(originalPaperHTML, 'utf-8', function (err, dataOriginal) {
		if (err) {
			debug("Unable to read the first (original) file as String. Something has gone wrong.\nMaybe check your input path.".red, err.message);
			return 1;
		}
		else {
			fs.readFile(reproducedPaperHTML, 'utf-8', function (err, dataReproduced) {
				if (err) {
					debug("Unable to read the second (reproduced) file as String. Something has gone wrong.\nMaybe check your input path.".red, err.message);
					return 1;
				}

				debug("File read successfully!");

				var originalStringSpacedBetweenImages = dataOriginal.replace(/<img/g, " \n<img");
				var reproducedStringSpacedBetweenImages = dataReproduced.replace(/<img/g, " \n<img");

				var base64ImagesOriginalWithWidth = getContentsOfImageTags(originalStringSpacedBetweenImages);
				var base64ImagesReproducedWithWidth = getContentsOfImageTags(reproducedStringSpacedBetweenImages);
				var base64ImagesOriginal = [], base64ImagesReproduced = [];

				var differingImagesCount = 0;
				var differingImagePositions = [];

				var finalHTMLoutputCompared = "";

				function checkIfEncodedImagesAreExtracted() {
					if (base64ImagesOriginalWithWidth != null && base64ImagesReproducedWithWidth != null) {

						if (base64ImagesReproducedWithWidth.length != base64ImagesOriginalWithWidth.length) {
							debugSlice("Unequal number of images on input papers. Aborting comparison.".red + "\n" + base64ImagesReproducedWithWidth.length + " " + base64ImagesOriginalWithWidth.length);
							return 1;
						}

						for (var i = 0; i < base64ImagesOriginalWithWidth.length; i++) {
							base64ImagesOriginal[i] = base64ImagesOriginalWithWidth[i].substr(0, base64ImagesOriginalWithWidth[i].length-16);
							base64ImagesReproduced[i] = base64ImagesReproducedWithWidth[i].substr(0, base64ImagesReproducedWithWidth[i].length-16);
						}

						setTimeout( function () {
							writeBase64Files();
						},10);

						arrayOriginalHTMLexcludingImages = originalStringSpacedBetweenImages.split(regexSplitCuttingImages);
						arrayReproducedHTMLexcludingImages = reproducedStringSpacedBetweenImages.split(regexSplitCuttingImages);
					}
					else {
						setTimeout( function() { checkIfEncodedImagesAreExtracted() }, 20);
					}
				}

				
				function writeBase64Files() {
					if (base64ImagesOriginal.length != base64ImagesReproduced.length) {
						throw new Error ([1, "The input HTML files do not contain the same number of images.".red + "\nPlease check your files again, especially the original file."]);
					}
					for (var i = 0; i < base64ImagesOriginal.length; i++){
						var filenameA = 'tmp_base64_Original_' + i + '.txt';
						fs.writeFileSync(path.join(process.cwd(), filenameA), base64ImagesOriginal[i].substr(24, base64ImagesOriginal[i].length));
						exec("base64 -d " + filenameA + " > tmp_img_Original_" + i + ".png");
					}
					for (var j = 0; j < base64ImagesReproduced.length; j++){
						var filenameB = 'tmp_base64_Reproduced_' + j + '.txt';
						fs.writeFileSync(path.join(process.cwd(), filenameB), base64ImagesReproduced[j].substr(24, base64ImagesReproduced[j].length));
						exec("base64 -d " + filenameB + " > tmp_img_Reproduced_" + j + ".png");
					}
					debugSlice("Lengths:  A: " + base64ImagesOriginal.length + ",  B: " + base64ImagesReproduced.length);

					for (var k = 0; k < base64ImagesOriginal.length; k++) {
						compareImagesQuickNaive(k);
					}

				}
				
				function reassembleHTMLfromComparedImagesAndText() {

					debugRe("Reached Reassembly-Point");
					for (iterate = 0; iterate < arrayReproducedHTMLexcludingImages.length-1; iterate++) {

						finalHTMLoutputCompared += arrayReproducedHTMLexcludingImages[iterate];


						if (boolArrayImageDiffOrdered[iterate]) {
							debugRe("found diff image");

							var base64DiffImage = fs.readFileSync(path.join(process.cwd(), "tmp_comp_base64_" + iterate + ".txt"), 'utf-8');
							debugRe("diff image read");
							finalHTMLoutputCompared += "<p><img src=\"data:image/png;base64," + base64DiffImage;
							finalHTMLoutputCompared += base64ImagesReproducedWithWidth[iterate].substr(base64ImagesReproducedWithWidth[iterate].length-16, base64ImagesReproducedWithWidth[iterate].length-7);
							debugRe("diff image integrated");

						}
						else {
							finalHTMLoutputCompared += "<p><img src=\"data:image/png;base64," + base64ImagesReproduced[iterate].substr(24, base64ImagesReproduced[iterate].length);
							finalHTMLoutputCompared += base64ImagesReproducedWithWidth[iterate].substr(base64ImagesReproducedWithWidth[iterate].length-16, base64ImagesReproducedWithWidth[iterate].length - 7);
						}

						if (iterate == arrayReproducedHTMLexcludingImages.length-2) {
							finalHTMLoutputCompared += arrayReproducedHTMLexcludingImages[arrayOriginalHTMLexcludingImages.length-1];
							if(outputName){
								fs.writeFileSync(path.join(process.cwd(), '/' + outputName.toString() + '.html'), finalHTMLoutputCompared);
								debugRe(path.join(process.cwd() + "/" + outputName.toString() + ".html  ist der Speicherort."));

								fs.stat(path.join(process.cwd(), '/' + outputName.toString() + '.html'), function(err, stat) {
									if (err) {
										debug("Writing diff HTML file failed.".red + err.message);
									}
									else {
										debug("Diff HTML created successfully!".green);
										console.log("");
										exec("rm tmp*.*");
									}
								});
							}
							else {
								fs.writeFileSync(path.join(process.cwd(), '/outputHTMLCompared.html'), finalHTMLoutputCompared);
								debugRe(path.join(process.cwd() + "/outputHTMLCompared.html  ist der Speicherort."));

								fs.stat(path.join(process.cwd(), '/outputHTMLCompared.html'), function(err, stat) {
									if (err) {
										debug("Writing diff HTML file failed.".red + err.message);
									}
									else {
										debug("Diff HTML created successfully!".green);
										console.log("");
										exec("rm tmp*.*");
									}
								});
							}



						}

					}

				}

				function compareImagesQuickNaive(k) {
					exec("diff tmp_img_Original_" + k + ".png tmp_img_Reproduced_" + k + ".png -s", function (stderr, stdout) {



						if (stderr != null) {

							debugComp("Diff Image #" + k + ": " + stderr);

							differingImagePositions[differingImagesCount] = k;
							differingImagesCount += 1;

							var originalImgWidth, originalImgHeight, reproducedImgWidth, reproducedImgHeight;
							var gotImageSizes = false;

							boolArrayImageDiffOrdered[k] = true;

							exec("convert tmp_img_Original_" + k + ".png -ping -format %w info:", function (stderr, stdout, err) {
								originalImgHeight = stdout;

								exec("convert tmp_img_Original_" + k + ".png -ping -format %hinfo:", function (stderr, stdout, err) {
									originalImgWidth = stdout;

									exec("convert tmp_img_Reproduced_" + k + ".png -ping -format %w info:", function (stderr, stdout, err) {
										reproducedImgHeight = stdout;

										exec("convert tmp_img_Reproduced_" + k + ".png -ping -format %h info:", function (stderr, stdout, err) {
											reproducedImgWidth = stdout;
											gotImageSizes = true;
										});
									});
								});
							});

							function waitForImageSizes() {

								if (gotImageSizes) {

									if((originalImgHeight+originalImgWidth) <= (reproducedImgHeight+reproducedImgWidth)) {
										exec("convert tmp_img_Original_" + k + ".png -resize " + reproducedImgWidth + "x" + reproducedImgWidth + "! -quality 100 tmp_img_Original_" + k + ".png")
									}
									else {
										exec("convert tmp_img_Reproduced_" + k + ".png -resize " + originalImgHeight + "x" + originalImgWidth + "! -quality 100 tmp_img_Reproduced_" + k + ".png")
									}

									setTimeout( function () {
										exec("compare tmp_img_Original_" + k + ".png tmp_img_Reproduced_" + k + ".png tmp_comp_imgOrigRep_" + k +".png", function (stdout, stderr, err) {
											debugComp("Image #" + k + " wird verglichen.");
											debugComp("Visually compared Image #" + k + "; child_process exit message:\n"+ stdout + "" + stderr + "" + err);

											exec("base64 tmp_comp_imgOrigRep_" + k +".png > tmp_comp_base64_" + k + ".txt", function (stdout, stderr, err) {
												debugComp("Writing base64-File for Image #" + k  + ": " + stdout + "" + stderr + "" + err);
												if (k == base64ImagesOriginal.length-1) {
													checkIfAllImagesAreDoneComparing();
												}
											});
										})
									},5);
								}
								else {
									setTimeout( function () { waitForImageSizes() }, 5 );
								}
							}
							waitForImageSizes();
						}

						else {
							boolArrayImageDiffOrdered[k] = false;
							if( k == base64ImagesOriginal.length-1) {
								setTimeout( function () {
									reassembleHTMLfromComparedImagesAndText();
								}, 5);
							}
						}
						if (stdout) {
							debugComp("Image #" + k +":  " + stdout);
						}
					})
				}

				function checkIfAllImagesAreDoneComparing() {
					var countFound = 0;
					for ( var numImage = 0; numImage < differingImagesCount; numImage++ ) {
						try {
							var checkIfFileExists = fs.statSync(path.join(process.cwd(), "tmp_comp_base64_" + differingImagePositions[numImage] + ".txt"));
						}
						catch (e) {
							countFound -= 1;
						}
						finally {
							countFound += 1;
						}
					}
					if (countFound == differingImagesCount) {
						reassembleHTMLfromComparedImagesAndText();
					}
					else {
						setTimeout(function () {
							checkIfAllImagesAreDoneComparing();
						}, 20);
					}
			}
				
				checkIfEncodedImagesAreExtracted();
				// checkIfAllSplittingAndComparisonDone();
			});
		}

	});
}


function getContentsOfImageTags(stringifiedHTML) {

	return stringifiedHTML.match(allImgTagsAsStrings).map(function (finding) {
		return finding.substr(8, finding.length);
	});
}


module.exports = {
	compareHTML: stringifyHTMLandCompare
};
