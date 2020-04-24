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
const debug = require('debug')('tester');
const sizeOf = require('image-size');

var rewire = require('rewire'); // for testing unexported functions, see https://stackoverflow.com/questions/14874208/how-to-access-and-test-an-internal-non-exports-function-in-a-node-js-module
var checkerCore = rewire('../lib/checker.js');

compareImages = checkerCore.__get__('compareImages');
extractImagesOutOfHTMLStringsAndCreateBuffers = checkerCore.__get__('extractImagesOutOfHTMLStringsAndCreateBuffers');
prepareImagesForComparison = checkerCore.__get__('prepareImagesForComparison');


describe('Testing image resizing', function () {

    describe('Testing Jimp', function () {
        var paperA = 'test/TestPapers_2/paper_9_img_A.html';
        var paperB = 'test/TestPapers_2/paper_9_img_D.html';

        var twoDimensionalArrayOfBuffers = [];
        var originalImageBuffer;
        var reproducedImageBuffer;

        try {
            fs.mkdirSync(path.join(os.tmpdir(), 'erc-checker'));
        } catch (e) { debug(e); }

        before(function (done) {
            //this.timeout(60000);
            let inputFiles = [fs.readFileSync(paperA, 'utf-8'), fs.readFileSync(paperB, 'utf-8')];

            extractImagesOutOfHTMLStringsAndCreateBuffers(inputFiles)
                .then(function (result) {

                    let dimensionsOriginal;
                    let dimensionsReproduced;

                    // two buffer of different size 
                    twoDimensionalArrayOfBuffers[0] = result[1];
                    originalImageBuffer = twoDimensionalArrayOfBuffers[0][0];
                    reproducedImageBuffer = twoDimensionalArrayOfBuffers[0][1];

                    dimensionsOriginal = sizeOf(originalImageBuffer);
                    dimensionsReproduced = sizeOf(reproducedImageBuffer);

                    done();
                });
        });

        it('should create a buffer matching the reference buffer', function (done) {
            prepareImagesForComparison(twoDimensionalArrayOfBuffers)
                .then(function (resizingResult) {

                    let reproducedImageBufferResized = resizingResult.images[0].reproducedImage.buffer;
                    let dimensionsReproducedImageBufferResized = sizeOf(reproducedImageBufferResized);

                    let testResizedBuffer = Buffer.from(JSON.parse(fs.readFileSync('./test/img/testResizedBuffer.json', 'utf-8')), 'base64');
                    let dimensionsTestResizedBuffer = sizeOf(testResizedBuffer);

                    if (reproducedImageBufferResized != undefined) {

                        assert.deepStrictEqual(dimensionsReproducedImageBufferResized, dimensionsTestResizedBuffer, 'The dimensions of the stored test buffer varries from the resulting buffer produced by the test.');
                        assert.deepStrictEqual(reproducedImageBufferResized, testResizedBuffer, 'Stored test buffer varries from the buffer produced during test.');
                        done();
                    }
                    else {
                        done(new Error("The test is not producing a valid buffer."))
                    }
                },
                    function (reason) {
                        debug("Error resizing images.".yellow);
                        done(new Error(reason));
                    }
                );
        });
    })

});