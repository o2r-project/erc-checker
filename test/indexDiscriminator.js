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
const expect = require('chai').expect;
const debug = require('debug')('tester');
const colors = require('colors');

const checker = require('../index').ercChecker;

describe('Testing erc-checker', function () {

	describe('Compare HTML function', function () {
		it('called with two invalid paths should return metadata containing an Error', function () {
			let testStringA = "path/to/nothing.html",
				testStringB = "path/to/more/nothing.html";

			checker(testStringA, testStringB)
				.then( function (resolve) {
					expect(resolve).to.equal(undefined)
				},
				function (rejectMetadata) {
					expect(rejectMetadata.errorsEncountered[0]).to.not.equal(0);
				})
		});

		it('called with only one invalid path should return metadata containing an Error', function () {
			let testStringA = "path/to/nothing.html",
				testStringB = "test/TestPapers_1/testPaper_1_shortened_a.html";

			checker(testStringA, testStringB)
				.then(function(resolve) {
					expect(resolve).to.equal(undefined);
				},
				function (rejectMetadata) {
					expect(rejectMetadata.errorsEncountered[0]).to.not.equal(0);
				})
		});

		it('called with equal papers should return Promise state *resolved* with metadata containing no Errors, but also value 0 for differences', function (done) {
			let testStringA = "test/TestPapers_1/testPaper_1_shortened_a.html",
				testStringB = "test/TestPapers_1/testPaper_1_shortened_a.html";

			checker(testStringA, testStringB)
				.then(function (resolve) {
						if ( resolve.differencesFound == false && resolve.errorsEncountered[0] == null) {done()}
						else { done(new Error ("Failed to handle eqial papers"))}
				},
				function (reject) {
					throw new Error (reject);
				})
		});
	})
});