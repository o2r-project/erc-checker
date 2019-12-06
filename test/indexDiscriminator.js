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

const assert = require('chai').assert;
const debug = require('debug')('tester');
const colors = require('colors');

const checker = require('../index').ercChecker;

var checkConfig = {
	directoryMode: false, 			// read papers from directories automatically?  (false: paths for both papers MUST be specified
	pathToMainDirectory: "",
	pathToOriginalHTML: "",
	pathToReproducedHTML: "",
	saveFilesOutputPath: "",		// necessary if diff-HTML or check metadata should be saved
	saveDiffHTML: false,
	ercID: "",
	saveMetadataJSON: false,
	createParentDirectories: false, 	// IF outputPath does not yet exist, this flag MUST be set true; otherwise, the check fails
	quiet: false,
	comparisonSetBaseDir: "."
};

describe('Testing erc-checker', function () {

	describe('Compare HTML function', function () {
		it('called with two invalid paths should return metadata containing an Error', function () {
			let config = Object.assign({}, checkConfig);
			config.pathToOriginalHTML = "path/to/nothing.html";
			config.pathToReproducedHTML = "path/to/more/nothing.html";

			return checker(config)
				.then(function (resolve) {
					assert.isUndefined(resolve);
				}, function (rejectMetadata) {
					assert.isNotEmpty(rejectMetadata.errors);
					assert.include(JSON.stringify(rejectMetadata.errors), "wrong path here");
					assert.include(JSON.stringify(rejectMetadata.errors), "no such file");
					assert.include(JSON.stringify(rejectMetadata.errors), config.pathToOriginalHTML);
				});
		}).timeout(10000);

		it('called with only one invalid path should return metadata containing an Error', function () {
			let config = Object.assign({}, checkConfig);
			config.comparisonSetBaseDir = ".";
			config.pathToOriginalHTML = "test/TestPapers_1/testPaper_1_shortened_a.html";
			config.pathToReproducedHTML = "path/to/nothing.html";

			return checker(config)
				.then(function (resolve) {
					assert.isUndefined(resolve);
				}, function (rejectMetadata) {
					assert.isNotEmpty(rejectMetadata.errors);
					assert.include(JSON.stringify(rejectMetadata.errors), "wrong path here");
					assert.include(JSON.stringify(rejectMetadata.errors), config.pathToReproducedHTML);
					assert.notInclude(JSON.stringify(rejectMetadata.errors), config.pathToOriginalHTML);
				});
		}).timeout(10000);

		it('called with equal papers should return Promise state *resolved* with metadata containing no Errors, but also value 0 for differences', function () {
			let config = Object.assign({}, checkConfig);
			config.pathToOriginalHTML = "test/TestPapers_1/testPaper_1_shortened_a.html";
			config.pathToReproducedHTML = "test/TestPapers_1/testPaper_1_shortened_a.html";

			return checker(config)
				.then(function (resolve) {
					assert.isTrue(resolve.checkSuccessful);
					assert.isEmpty(resolve.errors);
				}, function (reject) {
					assert.ifError(reject);
				});
		}).timeout(10000);
	})
});