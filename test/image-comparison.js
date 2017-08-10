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
const assert = require('chai').assert;
const expect = require('chai').expect;
const debug = require('debug')('tester');
const colors = require('colors');

var rewire = require('rewire'); // for testing unexported functions, see https://stackoverflow.com/questions/14874208/how-to-access-and-test-an-internal-non-exports-function-in-a-node-js-module
var app = rewire('../checker.js');

runBlinkDiff = app.__get__('runBlinkDiff');
sliceImagesOutOfHTMLStringsAndCreateBuffers = app.__get__('sliceImagesOutOfHTMLStringsAndCreateBuffers');

describe.only('Testing image comparison', function () {

	describe('Compare with blink-diff', function () {
		var paperA = 'test/TestPapers_2/paper_9_img_A.html';
		var paperB = 'test/TestPapers_2/paper_9_img_C.html';

		var imageA, imageB;
		before(function (done) {
			let inputFiles = [fs.readFileSync(paperA, 'utf-8'), fs.readFileSync(paperB, 'utf-8')];

			sliceImagesOutOfHTMLStringsAndCreateBuffers(inputFiles).then(function (result) {
				var originalImageBuffers = result[0],
					reproducedImageBuffers = result[1];

				imageA = originalImageBuffers[0];
				imageB = reproducedImageBuffers[0];

				done();
			});
		})

		it('makes image comparison', function (done) {
			runBlinkDiff(imageA, imageB, function (diff, diff_result) {

				console.log(diff);
				//diff._imageOutput.writeImageSync('/tmp/testoutput.png');
				var b = diff._imageOutput.getBlob();

				// FIXME implement test against created file

				// TODO remove temp test file

				done();
			});
		});
	})

});