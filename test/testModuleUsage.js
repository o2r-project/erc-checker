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

const checker = require('../index').ercChecker;

describe('Using ERC-Checker as node-module', function () {
	let testStringA = "test/TestPapers_1/testPaper_1_shortened_a.html",
		testStringB = "test/TestPapers_1/testPaper_1_shortened_b.html",
		testStringC = "test/TestPapers_2/paper_9_img_A.html",
		testStringD = "test/TestPapers_2/paper_9_img_B.html",
		testStringE = "test/TestPapers_2/paper_9_img_C.html",
		testStringF = "./path/to/nothing";

	it('should return a Promise', function () {


		let checkObject1 = checker(testStringA, testStringB)
			.then(function (resolve) {
			}, function (reason) {
			});
		expect(checkObject1.then()).to.not.equal(undefined);

		let checkObject2 = checker(testStringA, testStringA)
			.then(function (resolve) {
			}, function (reason) {
			});
		expect(checkObject2.then()).to.not.equal(undefined);
	});

	describe('Returned Promise should be *rejected* and Metadata in reject statement should contain Error message, when ERC-Checker', function () {

		it('is called with one or both invalid paths', function () {
			checker(testStringA, testStringF)
				.then(function (resolve) {
					expect(resolve).to.equal(null);
				}, function (reason) {
					expect(reason.errorsEncountered[0]).to.not.equal(null);
				});
			checker(testStringF, testStringA)
				.then(function (resolve) {
					expect(resolve).to.equal(null);
				}, function (reason) {
					expect(reason.errorsEncountered[0]).to.not.equal(null);
				});
			checker(testStringF, testStringF)
				.then(function (resolve) {
					expect(resolve).to.equal(null);
				}, function (reason) {
					expect(reason.errorsEncountered[0]).to.not.equal(null);
				});
		});

		it('is called on papers containing a differing number of images', function () {
			checker(testStringA, testStringC)
				.then(function (resolve) {
						expect(resolve).to.equal(null)
					},
					function (rejectMetadata) {
						expect(rejectMetadata.errorsEncountered[0]).to.not.equal(null);
					});
			checker(testStringC, testStringA)
				.then(function (resolve) {
						expect(resolve).to.equal(null)
					},
					function (rejectMetadata) {
						expect(rejectMetadata.errorsEncountered[0]).to.not.equal(null);
					});
		})
	});

	describe('Returned Promise object should be *resolved* and include a Metadata object, which ', function () {

		describe('for two equal input papers', function () {
			it('should contain no errors, and a parameter {"checkSuccessful" == true}, i.e. no differences found', function (done) {
				checker(testStringC, testStringC)
					.then(function (metadata) {
							if (metadata.checkSuccessful === true && metadata.errorsEncountered[0] == null) { done() }
							else { done(new Error ("Wrong result."))};
						},
						function (reject) {
							console.log(reject);
							expect(reject).to.equal(null);
						});
			});
		});

		describe('for two differing papers containing 2 images each', function () {
			it('should contain no errors, and a parameter {"checkSuccessful" == false}, i.e. differences exist, plus an Array of image comparison results with a length 2', function (done) {
				this.timeout(0);
				checker(testStringA, testStringB, "test_2Img_OnlySecondDiffering")
					.then(
						function (metadata) {
							if (metadata.checkSuccessful == false
								&& metadata.errorsEncountered[0] == null
								&& metadata.errorsEncountered.length == 0
								&& metadata.images.length == 2
								&& metadata.images[0].compareResults.differences == 0
								&& metadata.images[1].compareResults.differences != 0)
							{
								done();
							}
							else {
								let meta = metadata;
								meta.resultHTML = null;
								debug(meta.yellow);
								done(new Error("Wrong result.", meta));
							}
						},
						function (reason) {
							done(new Error(reason));
						}
					)
			});
		});

		describe('for two papers containing 9 of 9 differing images', function () {
			it('should contain no errors, and a parameter {"checkSuccessful" == false}, i.e. differences exist, plus an Array of image comparison results with a length of 9', function (done) {
				this.timeout(0);
				checker(testStringD, testStringC, "test_9Img_9Differing")
					.then(
						function (metadata) {

							let compResults = true;

							for (let image of metadata.images) {
								if (image.compareResults.differences == 0) compResults = false;
							}

							if (metadata.checkSuccessful == false
								&& metadata.errorsEncountered[0] == null
								&& metadata.errorsEncountered.length == 0
								&& metadata.images.length == 9
								&& compResults == true) {
								done()
							}
							else {
								let meta = metadata;
								meta.resultHTML = null;
								debug(meta.yellow);
								done(new Error("Wrong result.", meta));
							}
						},
						function (reason) {
							done(new Error(reason));
						}
					)
			});
		});

		describe('for a paper containing 9 images with only the first image differing', function () {
			it('should contain no errors, and a parameter {"checkSuccessful" == false}, i.e. differences exist, plus an Array of image comparison results with a length 9, of which only the first entry describes differences', function (done) {
				this.timeout(0);
				checker(testStringD, testStringE, "test_9Img_1Differing")
					.then(
						function (metadata) {
							let compareResults = true;
							metadata.images.map( function (current, index) {
								if (index == 0) {
									compareResults = (current.compareResults.differences != 0);
								}
								else {
									compareResults = (current.compareResults.differences == 0);
								}
							});

							if(metadata.checkSuccessful == false
								&& metadata.errorsEncountered[0] == null
								&& metadata.errorsEncountered.length == 0
								&& metadata.images.length == 9
								&& compareResults == true)
							{
								done();
							}
							else {
								let meta = metadata;
								meta.resultHTML = '';
								debug(meta)
								done( new Error ("Wrong result.") );
							}
						}
					)
			});
		})
	});
});