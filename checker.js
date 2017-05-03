/**
 * Created by timmimim on 19.04.17.
 */

var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

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
			console.log("  Unable to read the first (original) file as String. Something has gone wrong. \n \n  Maybe check your input path.");
			// throw new TypeError("File not readable as Text");
		}
		else {
			fs.readFile(reproducedPaperHTML, 'utf-8', function (err, dataReproduced) {
				console.log("File read successfully!");

				var originalStringSpacedBetweenImages = dataOriginal.replace(/<img/g, " \n<img");
				var reproducedStringSpacedBetweenImages = dataReproduced.replace(/<img/g, " \n<img");

				var base64ImagesOriginalWithWidth = getContentsOfImageTags(originalStringSpacedBetweenImages);
				var base64ImagesReproducedWithWidth = getContentsOfImageTags(reproducedStringSpacedBetweenImages);
				var base64ImagesOriginal = [], base64ImagesReproduced = [];

				var finalHTMLoutputCompared = "";

				function checkIfEncodedImagesAreExtracted() {
					if (base64ImagesOriginalWithWidth != null && base64ImagesReproducedWithWidth != null) {

						if (base64ImagesReproducedWithWidth.length != base64ImagesOriginalWithWidth.length) {
							console.log("Unequal number of images on input papers. Aborting comparison. \n" + base64ImagesReproducedWithWidth.length + " " + base64ImagesOriginalWithWidth.length);
							return;
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
						throw new Error ([0, "The input HTML files do not contain the same number of images.\n\nPlease check your files again, especially the original file."]);
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
					console.log("Lengths:  A: " + base64ImagesOriginal.length + ",  B: " + base64ImagesReproduced.length);

					for (var k = 0; k < base64ImagesOriginal.length; k++) {
						compareImagesQuickNaive(k);
					}

				}
				
				function reassembleHTMLfromComparedImagesAndText() {

					console.log("Reached Reassembly-Point")
					for (iterate = 0; iterate < arrayReproducedHTMLexcludingImages.length-1; iterate++) {

						finalHTMLoutputCompared += arrayReproducedHTMLexcludingImages[iterate];


						if (boolArrayImageDiffOrdered[iterate]) {
							console.log("found diff image");

							var base64DiffImage = fs.readFileSync(path.join(process.cwd(), "tmp_comp_base64_" + iterate + ".txt"), 'utf-8');
							console.log("diff image read");
							finalHTMLoutputCompared += "<p><img src=\"data:image/png;base64," + base64DiffImage;
							finalHTMLoutputCompared += base64ImagesReproducedWithWidth[iterate].substr(base64ImagesReproducedWithWidth[iterate].length-16, base64ImagesReproducedWithWidth[iterate].length-7);
							console.log("diff image integrated");

						}
						else {
							finalHTMLoutputCompared += "<p><img src=\"data:image/png;base64," + base64ImagesReproduced[iterate].substr(24, base64ImagesReproduced[iterate].length);
							finalHTMLoutputCompared += base64ImagesReproducedWithWidth[iterate].substr(base64ImagesReproducedWithWidth[iterate].length-16, base64ImagesReproducedWithWidth[iterate].length - 7);
						}

						if (iterate == arrayReproducedHTMLexcludingImages.length-2) {
							finalHTMLoutputCompared += arrayReproducedHTMLexcludingImages[arrayOriginalHTMLexcludingImages.length-1];
							if(outputName){
								fs.writeFileSync(path.join(process.cwd(), '/' + outputName.toString() + '.html'), finalHTMLoutputCompared);
								console.log(path.join(process.cwd() + "/" + outputName.toString() + ".html  ist der Speicherort."));

								fs.stat(path.join(process.cwd(), '/' + outputName.toString() + '.html'), function(err, stat) {
									if (err) {
										console.log("Writing diff HTML file failed. Sorry about that..\n" + err);
									}
									else {
										console.log("Diff HTML created successfully!");
										exec("rm tmp*.*");
									}
								});
							}
							else {
								fs.writeFileSync(path.join(process.cwd(), '/outputHTMLCompared.html'), finalHTMLoutputCompared);
								console.log(path.join(process.cwd() + "/outputHTMLCompared.html  ist der Speicherort."));

								fs.stat(path.join(process.cwd(), '/outputHTMLCompared.html'), function(err, stat) {
									if (err) {
										console.log("Writing diff HTML file failed. Sorry about that..\n" + err);
									}
									else {
										console.log("Diff HTML created successfully!");
										exec("rm tmp*.*");
									}
								});
							}



						}

					}

				}

				function compareImagesQuickNaive(k) {
					exec("diff tmp_img_Original_" + k + ".png tmp_img_Reproduced_" + k + ".png -s", function (stderr, stdout) {

						console.log("Diff Image #" + k + ": " + stderr);

						if (stderr != null) {

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
											console.log("Image #" + k + " wird verglichen.");
											console.log("Visually compared Image #" + k + "; child_process exit message:\n"+ stdout + "" + stderr + "" + err);

											exec("base64 tmp_comp_imgOrigRep_" + k +".png > tmp_comp_base64_" + k + ".txt", function (stdout, stderr, err) {
												console.log("Writing base64-File for Image #" + k  + ": " + stdout + "" + stderr + "" + err);
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
						if (stderr) {
							console.log("Image #" + k +":  " + stdout);
						}
					})
				}

				function checkIfAllImagesAreDoneComparing() {
					var countFound = 0;
					for ( var numImage = 0; numImage < base64ImagesOriginal.length; numImage++ ) {
						try {
							var checkIfFileExists = fs.statSync(path.join(process.cwd(), "tmp_comp_base64_" + numImage + ".txt"));
						}
						catch (e) {
							countFound -= 1;
						}
						finally {
							countFound += 1;
						}
					}
					if (countFound == base64ImagesOriginal.length) {
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

	console.log("logger\n\n");
}


function getContentsOfImageTags(stringifiedHTML) {

	return stringifiedHTML.match(allImgTagsAsStrings).map(function (finding) {
		return finding.substr(8, finding.length);
	});
}


module.exports = {
	compareHTML: stringifyHTMLandCompare
};