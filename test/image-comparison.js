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
const os = require('os');
const assert = require('chai').assert;
const expect = require('chai').expect;
const debug = require('debug')('tester');
const colors = require('colors');

var rewire = require('rewire'); // for testing unexported functions, see https://stackoverflow.com/questions/14874208/how-to-access-and-test-an-internal-non-exports-function-in-a-node-js-module
var checkerCore = rewire('../checker.js');

runBlinkDiff = checkerCore.__get__('runBlinkDiff');
sliceImagesOutOfHTMLStringsAndCreateBuffers = checkerCore.__get__('sliceImagesOutOfHTMLStringsAndCreateBuffers');

describe('Testing image comparison', function () {

	describe('Comparison via blink-diff', function () {
		var paperA = 'test/TestPapers_2/paper_9_img_A.html';
		var paperB = 'test/TestPapers_2/paper_9_img_C.html';

		var images;

		var tempDirectoryForDiffImages = path.join(os.tmpdir(), 'erc-checker/diffImages');
		try {
			fs.mkdirSync(path.join(os.tmpdir(), 'erc-checker'));
		}catch (e) {}
		try {
			fs.mkdirSync(tempDirectoryForDiffImages);
		}catch (e) {}

		before(function (done) {

			let inputFiles = [fs.readFileSync(paperA, 'utf-8'), fs.readFileSync(paperB, 'utf-8')];

			sliceImagesOutOfHTMLStringsAndCreateBuffers(inputFiles).then(function (result) {
				var originalImageBuffers = result[0],
					reproducedImageBuffers = result[1];

				images = [{
					originalImage: {
						buffer: originalImageBuffers[0]
					},
					reproducedImage: {
						buffer: reproducedImageBuffers[0]
					}
				}];
				done();
			});
		});

		it('should create a file matching the reference file', function (done) {

			runBlinkDiff(images)
				.then(
					function (resolve) {
						let result = resolve.diffImages;

						if(result != undefined && result.length === images.length && result[0].buffer instanceof Buffer) {
							let testImage = fs.readFileSync("./test/img/testDiffImg.png"),
								newDiffImage = fs.readFileSync(path.join(os.tmpdir(), "erc-checker/diffImages/diffImage0.png"));

							try {fs.unlinkSync(path.join(os.tmpdir(), "erc-checker/diffImages/diffImage0.png"));} catch (e){console.log(e)}

							if (testImage.equals(newDiffImage)) {
								done();
							}
							else{
								done(new Error ("Diff Image differs from provided test image."));
							}
						}
						else {
							try {
								fs.unlinkSync(path.join(os.tmpdir(), "erc-checker/diffImages/diffImage0.png"));
							}
							catch(e) {}
							done(new Error ("Wrong result."))
						}
					},
					function (reason) {
						console.log("Error comparing images.".yellow)
						done(new Error (reason));
					}
				);
		});
	})

});