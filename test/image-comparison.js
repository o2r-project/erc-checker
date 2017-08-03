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

var rewire = require('rewire'); // for testing unexported functions, see https://stackoverflow.com/questions/14874208/how-to-access-and-test-an-internal-non-exports-function-in-a-node-js-module
var app = rewire('../checker.js');

describe('Testing image comparison', function () {

	describe('Compare with blink-diff', function () {
		it('makes image comparison', function () {
			let testStringA = "path/to/nothing.html",
				testStringB = "path/to/more/nothing.html";
			debug("Test run with invalid path Strings: \n".cyan, testStringA.cyan, ",",  testStringB.cyan);
			expect(checker(testStringA, testStringB)).to.not.equal(0);
			debug(checker(testStringA, testStringB));

stringifyHTMLandCompare("/home/timmimim/ownCloud/o2r-data/Hilfskräfte/Kühnel/Checker/erc-checker/test/TestPapers_2/paper_9_img_A.html",
						"/home/timmimim/ownCloud/o2r-data/Hilfskräfte/Kühnel/Checker/erc-checker/test/TestPapers_2/paper_9_img_C.html");


		});
	})

});