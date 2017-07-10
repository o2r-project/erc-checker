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
const debugERROR = require('debug')('checker:ERROR');
const colors = require('colors');
const Promise = require('promise');

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
			debugERROR("\t\tFileReader for original paper: Unable to read the first (original) file as String. Something has gone wrong.\nMaybe check your input path.".red, err.message);
			return 1;
		}
		else {
			fs.readFile(reproducedPaperHTML, 'utf-8', function (err, dataReproduced) {
				if (err) {
					debugERROR("\t\tFileReader for reproduced paper: Unable to read the second (reproduced) file as String. Something has gone wrong.\nMaybe check your input path.".red, err.message);
					return 1;
				}

				debug("\tFiles read successfully!");

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
							debugERROR("\t\t" + base64ImagesReproducedWithWidth.length + " != " + base64ImagesOriginalWithWidth.length +"".red);
							debugERROR("\t\tBase64 img extracted: Unequal number of images on input papers. Aborting comparison.".red + "\n");
							return 1;
						}

						for (var i = 0; i < base64ImagesOriginalWithWidth.length; i++) {
							base64ImagesOriginal[i] = base64ImagesOriginalWithWidth[i].substr(0, base64ImagesOriginalWithWidth[i].length-16);
							base64ImagesReproduced[i] = base64ImagesReproducedWithWidth[i].substr(0, base64ImagesReproducedWithWidth[i].length-16);
						}

						setTimeout( function () {
							debugSlice("\t\tHTML files successfully sliced into two Arrays of Strings.".cyan);
							debugSlice("\t\tLengths:  Original: " + base64ImagesOriginal.length + ",  Reproduced: " + base64ImagesReproduced.length);
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

						debugSlice("\t\tLengths:  Original: " + base64ImagesOriginal.length + ",  Reproduced: " + base64ImagesReproduced.length);
						debugERROR("\t\tWriting Base64: The input HTML files do not contain the same number of images.".red + "\nPlease check your files again, especially the original file.");
					}
					else {
						debugSlice("\t\tbase64 files are being written for all Image Strings.");
						for (var i = 0; i < base64ImagesOriginal.length; i++) {
							var filenameA = 'tmp_base64_Original_' + i + '.txt';
							fs.writeFileSync(path.join(process.cwd(), filenameA), base64ImagesOriginal[i].substr(24, base64ImagesOriginal[i].length));
							exec("base64 -d " + filenameA + " > tmp_img_Original_" + i + ".png");
						}
						for (var j = 0; j < base64ImagesReproduced.length; j++) {
							var filenameB = 'tmp_base64_Reproduced_' + j + '.txt';
							fs.writeFileSync(path.join(process.cwd(), filenameB), base64ImagesReproduced[j].substr(24, base64ImagesReproduced[j].length));
							exec("base64 -d " + filenameB + " > tmp_img_Reproduced_" + j + ".png");
						}

						debugComp("\tStarting comparison".magenta);
						for (var k = 0; k < base64ImagesOriginal.length; k++) {
							compareImagesQuickNaive(k);
						}
					}
				}
				
				function reassembleHTMLfromComparedImagesAndText() {

					debugRe("\tReached Reassembly-Point".yellow);
					for (iterate = 0; iterate < arrayReproducedHTMLexcludingImages.length-1; iterate++) {

						finalHTMLoutputCompared += arrayReproducedHTMLexcludingImages[iterate];


						if (boolArrayImageDiffOrdered[iterate]) {
							debugRe("\tfound diff image #" + iterate);

							var base64DiffImage = fs.readFileSync(path.join(process.cwd(), "tmp_comp_base64_" + iterate + ".txt"), 'utf-8');
							debugRe("\tdiff image #"+iterate+" read");
							finalHTMLoutputCompared += "<p><img src=\"data:image/png;base64," + base64DiffImage;
							finalHTMLoutputCompared += base64ImagesReproducedWithWidth[iterate].substr(base64ImagesReproducedWithWidth[iterate].length-16, base64ImagesReproducedWithWidth[iterate].length-7);
							debugRe("\tdiff image #"+iterate+" integrated");

						}
						else {
							finalHTMLoutputCompared += "<p><img src=\"data:image/png;base64," + base64ImagesReproduced[iterate].substr(24, base64ImagesReproduced[iterate].length);
							finalHTMLoutputCompared += base64ImagesReproducedWithWidth[iterate].substr(base64ImagesReproducedWithWidth[iterate].length-16, base64ImagesReproducedWithWidth[iterate].length - 7);
						}

						if (iterate == arrayReproducedHTMLexcludingImages.length-2) {
							finalHTMLoutputCompared += arrayReproducedHTMLexcludingImages[arrayOriginalHTMLexcludingImages.length-1];
							debugRe("\tHTML stringified and reassembled.".yellow);
							if(outputName){
								fs.writeFile(path.join(process.cwd(), '/' + outputName.toString() + '.html'), finalHTMLoutputCompared, function (err, stdout, stderr) {
									if (err) {
										debugERROR("\t\tWriting diff HTML file failed.".red + err.message);
										return 1;
									}
									else {
										debugRe("\t"+ path.join("saved @ " + process.cwd() + "/" + outputName.toString() + ".html"));
										debug("\tDiff HTML created successfully!".green);
										console.log("");
										exec("rm tmp*.*");
									}
								});


							}
							else {
								fs.writeFile(path.join(process.cwd(), '/outputHTMLCompared.html'), finalHTMLoutputCompared, function (err, stdout, stderr) {
									if (err) {
										debugERROR("\t\tWriting diff HTML file failed.".red + err.message);
										return 1;
									}
									else {
										debugRe("\t" + path.join("saved @ " + process.cwd() + "/outputHTMLCompared.html"));
										debug("\tDiff HTML created successfully!".green);
										console.log("");
										exec("rm tmp*.*");
									}
								});
							}

						}

					}

				}

				function compareImagesQuickNaive(k) {
					debugComp("comparing %s", k);

					exec("diff tmp_img_Original_" + k + ".png tmp_img_Reproduced_" + k + ".png -s", function (stderr, stdout) {
						if(stderr == null) {
							// no comparison required, images are equal
							boolArrayImageDiffOrdered[k] = false;
							if( k == base64ImagesOriginal.length-1) {
								setTimeout( function () {
									debugComp("\tFinished comparison.".magenta)
									reassembleHTMLfromComparedImagesAndText();
								}, 5);
							}

							return;
						}


						debugComp("\tImage #" + k +":  " + stdout);
	
						differingImagePositions[differingImagesCount] = k;
						differingImagesCount += 1;

						var originalImgWidth, originalImgHeight, reproducedImgWidth, reproducedImgHeight;

						boolArrayImageDiffOrdered[k] = true;

						let get_Original_k_width = new Promise ( function (resolve, reject) {
							exec("convert tmp_img_Original_" + k + ".png -ping -format %w info:", function (err, stdout, stderr) {
								if (err) {
									reject("Getting width of original image #" + k + " failed: " + err + "".red);
								} else {
									originalImgWidth = stdout;
									resolve();
								}
							});
						});
						let get_Original_k_height = new Promise ( function (resolve, reject) {
							exec("convert tmp_img_Original_" + k + ".png -ping -format %h info:", function (err, stdout, stderr) {
								if (err) {
									reject("Getting height of original image #" + k + " failed: " + err + "".red);
								} else {
									originalImgHeight = stdout;
									resolve();
								}
							});
						});
						let get_Reproduced_k_width = new Promise ( function (resolve, reject) {
							exec("convert tmp_img_Reproduced_" + k + ".png -ping -format %w info:", function (err, stdout, stderr) {
								if (err) {
									reject("Getting width of reproduced image #" + k + " failed: " + err + "".red);
								} else {
									reproducedImgWidth = stdout;
									resolve();
								}
							});
						});
						let get_Reproduced_k_height = new Promise ( function (resolve, reject) {
							exec("convert tmp_img_Reproduced_" + k + ".png -ping -format %h info:", function (err, stdout, stderr) {
								if (err) {
									reject("Getting height of reproduced image #" + k + " failed: " + err + "");
								} else {
									reproducedImgHeight = stdout;
									resolve();
								}
							});
						});

						Promise.all(
								get_Original_k_width,
								get_Original_k_height,
								get_Reproduced_k_width,
								get_Reproduced_k_height)
							.then(null, 
								function (reason) {
									debugERROR("\t\t"+ reason.red) }
								)
							.then(resizeImages())
							.catch(debugERROR.bind(console));

						function resizeImages() {
							if((originalImgHeight+originalImgWidth) <= (reproducedImgHeight+reproducedImgWidth)) {
								exec("convert tmp_img_Original_" + k + ".png -resize " + reproducedImgWidth + "x" + reproducedImgWidth + "! -quality 100 tmp_img_Original_" + k + ".png")
							}
							else {
								exec("convert tmp_img_Reproduced_" + k + ".png -resize " + originalImgHeight + "x" + originalImgWidth + "! -quality 100 tmp_img_Reproduced_" + k + ".png")
							}

							setTimeout( function () {
								exec("compare tmp_img_Original_" + k + ".png tmp_img_Reproduced_" + k + ".png tmp_comp_imgOrigRep_" + k +".png", 
									function (err, stdout, stderr) {
										debugComp("Visually compared Image #%s: \nstdout: %s \nstderr: %s \nerr: %s", k, stdout, stderr, err);

										if(err) {
											debugERROR("%s", err.message);
											return;
										}

										exec("base64 tmp_comp_imgOrigRep_" + k +".png > tmp_comp_base64_" + k + ".txt", function (err, stdout, stderr) {
											debugComp("Writing base64 file for Image #%s: \nstdout: %s \nstderr: %s \nerr: %s", k, stdout, stderr, err);
											if (k == base64ImagesOriginal.length-1) {
												checkIfAllImagesAreDoneComparing();
											}
										});
									})
							}, 5);
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

						debugComp("\tFinished comparison.".magenta)
						reassembleHTMLfromComparedImagesAndText();
					}
					else {
						setTimeout(function () {
							checkIfAllImagesAreDoneComparing();
						}, 20);
					}
			}
				
				checkIfEncodedImagesAreExtracted();
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
