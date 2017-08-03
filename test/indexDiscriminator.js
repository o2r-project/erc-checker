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

//const checker = require('../index').ercChecker;

describe.skip('Testing erc-checker', function () {

	describe('Compare HTML function', function () {
		it('called with invalid path', function () {
			let testStringA = "path/to/nothing.html",
				testStringB = "path/to/more/nothing.html";
			debug("Test run with invalid path Strings: \n".cyan, testStringA.cyan, ",",  testStringB.cyan);
			expect(checker(testStringA, testStringB)).to.not.equal(0);
			debug(checker(testStringA, testStringB));
		});

		it('called with only one invalid path', function () {
			let testStringA = "path/to/nothing.html",
				testStringB = "test/TestPapers_1/testPaper_1_shortened_a.html";
			debug("Test run with invalid path Strings: \n".cyan, testStringA.cyan, ",",  testStringB.cyan);
			expect(checker(testStringA, testStringB)).to.not.equal(0);
			debug(checker(testStringA, testStringB));
		});

		it('comparing papers with equal images reaches diff tool', function () {
			let testStringA = "test/TestPapers_1/testPaper_1_shortened_a.html",
				testStringB = "test/TestPapers_1/testPaper_1_shortened_b.html";
			debug("Test run with invalid path Strings: \n".cyan, testStringA.cyan, ",",  testStringB.cyan);
			expect(checker(testStringA, testStringB)).to.equal(0);
			debug(checker(testStringA, testStringB));
		});
	})

});