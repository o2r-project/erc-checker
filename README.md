# erc-checker

![Travis CI](https://travis-ci.org/Timmimim/erc-checker.svg?branch=master)

 - [NodeJS module usage](#nodejs-module-usage)
   - [Installation](#installation)
   - [Current functional scope](#current-functional-scope)
   - [Errors](#errors)
   - [Returns](#returns)
   - [Development](#development)
   - [Usage](#how-to-use-the-checker-module)
   - [Debug](#debug)
 - [Debug Loggers](#debug-loggers)
 - [License](#license)

-------------------------------------------------

A JavaScript library and CLI tool for [ERC](https://github.com/o2r-project/erc-spec) metadata, execution, and result checking.  

The checker is part of the [o2r-project](http://www.o2r.info/). Its purpose is to verify the o2r-platform's reproduction automatism for scientific papers in HTML format. 

The checker runs on [NodeJS](https://nodejs.org/en/). The tool implements a [NodeJS module](#node-module), which is a function returning a [JavaScript Promise](https://www.npmjs.com/package/promise). 

It further implements a [command line interface](#command-line-interface) (WORK IN PROGRESS). 

-------------------------------------------------

## NodeJS module usage

The checker's `index.js` exports an object called `ercChecker`. This object contains a function that takes two paths to HTML files and optional further parameters, and returns a JavaScript Promise. 

#### Installation

The erc-checker is currently not featured as an official npm module in the [node package repository](https://www.npmjs.com/). 

Instead, it is best installed directly from GitHub:
 
`npm install --save git+https://github.com/o2r-project/erc-checker.git`

Alternatively, the git repository may be cloned and packed into an npm package locally using the following console commands. 

```bash
    $  git clone https://github.com/o2r-project/erc-checker.git
    $  cd erc-checker
    $  npm pack          
```

The `npm pack` command creates a tarball named `erc-checker-x.y.z.tgz` (x.y.z represents current version) in the same directory 

This resulting tarball is a fully functioning npm package. It may then be installed into any project with:

```bash
    $  npm install --save /path/to/tarball/erc-checker-x.y.z.tgz`
```

#### Current functional scope

The checker is executed with a `config` object (`JSON`).

```javascript

    var config = {
    	directoryMode: Boolean, 			// default: false --- read papers from directories automatically?  (false: paths for both papers MUST be specified; true: path to directory MUST be specified)
    	pathToMainDirectory: String,
    	pathToOriginalHTML: String,
    	pathToReproducedHTML: String,
    	saveFilesOutputPath: String,		// necessary if diff-HTML or check metadata should be saved
    	saveDiffHTML: Boolean,              // default: false
    	outFileName: String,                // choose a name for diff-HTML (defaults to "diffHTML.html")
    	saveMetadataJSON: Boolean,          // default: false
    	createParentDirectories: Boolean, 	// default: false --- IF outputPath does not yet exist, this flag MUST be set true; otherwise, the check fails
    	comparisonSetBaseDir: String,       // base directory of repository to be checked, used to create a file list (glob)
        checkFileTypes: [String],			// case insensitive list of file endings to be included; currently defaults to ["htm", "html"]
    	quiet: Boolean                      // default: false
    };

```


___Note:___ optional parameters may be left out of the config object when not used. In this case, defaults apply.

In directory mode, individual path parameters will be ignored. Otherwise, main directory path will be ignored.
 
One of the following configurations __MUST__ be made
 - `directoryMode = false` and `pathToOriginalHTML` && `pathToReproducedHTML` valid paths to HTML files, _or_
 - `directoryMode = true` && `pathToMainDirectory` valid path to a directory structure as seen below:
 
      ```
         target_directory    
         │
         └───original
         │    │   main.html
         |    │   someOther.html
         │   
         └───reproduced
              │   main.html
      ```
 
    In `directoryMode`, there __MUST__ be two subdirectories, `original` and `reproduced`.
    
    ___Note___: HTML files in directories are NOT REQUIRED to be named "_main.html_". However, the checker will pick the first `.html`file found _in alphabetical order_ . 
 
The tool will compare both HTML files for images only. The images __MUST__ be __base64__-encoded, and encapsulated in an HTML img tag, as generated automatically when rendering an .Rmd file into HTML format. 

If both HTML papers contain an equal number of images, the checker may write a new HTML file, containing the results of the comparison between all images in the input files, as created by [`blink-diff`](http://yahoo.github.io/blink-diff/), as well as highlighted text differences between both Papers. 

Further parameters (in order): 
  - `saveFilesOutputPath: String` : third path for file output; necessary if either parameter `saveDiffHTML` or `saveMetadataJSON` is set, otherwise ignored
  - `saveDiffHTML: Boolean` : save diffHTML file to output directory
  - `outFileName: String` : choose a custom name for diffHTML (default is "diffHTML.html")
  - `saveMetadataJSON: Boolean` : save metadata.json to output directory
  - `createParentDirectories: Boolean` : create parent directories for output (if false and directories of path not yet created, output will not be created) 
  - `comparisonSetBaseDir: String`: path to the base directory of the repository to be checked, may be absolute or relative
  - `checkFileTypes: [String]`:	case insensitive list of file endings to be included in the comparison set for the check
  - `quiet: Boolean` : silence loggers

#### Errors
Any errors during execution cause the returned JSPromise to be __rejected__. Errors will be caught and
 - logged out to the console
 - saved in a check metadata JSON object, which is returned as _rejection argument_:
 ```javascript
     ﻿{
     	"checkSuccessful": ... ,
     	"images": [ ... ],
     	"display": {
     	    "diff": "[merged diff-HTML]"
     	},
        "start": Date,
        "end": Date,
        "errors": [ <Error description> ] 
     }
  ```
Metadata may contain a varying amount of data, depending on where in the process an error occurred.

Externally caused errors will occur, if:
- paths to files / directory are invalid
- output path does not exist, and createParentDirectories flag is not set
- papers contain an unequal number of images
- base64-encoded image invalid / broken

    
#### Returns
The `ercChecker` function returns a JSPromise. 

If execution is successful, the Promise will be __resolved__, containing a check metadata JSON object:
 ```javascript
    ﻿{
    	"checkSuccessful": Boolean,
    	"images": [	
    		{
    			"imageIndex": Number,
    			"resizeOperationCode": Number, // represents status code, see below
    			"compareResults":	{
    				"differences": Number,
    				"dimension": Number
    			}
    		}, ...
    	],
    	"display": {
    	    "diff": String // contains the entire result HTML, 
    	                    // with images swapped for diff-Images where differences were found;
    	                    // contains merged text of both papers, with differences highlighted
        },
        "comparisonSet": [String],  // contains relative paths of all files with file type ending 
                                     // matching the specified in config file using the `checkFileTypes` attribute              
        "start": Number,
        "end": Number,
        "errors": [] 
    }
 ```

prepResult codes (for images of same index in paper):
- 0: images do not differ in size
- 1: images differed in size -- resized for comparison
- 2: images differed in size -- not resized for comparison

##### Development
For debugging purposes: When running the checker with a NodeJS environment variable `DEV` set true, the result AND reject metadata will include an absolute path to the temp-directory used during the check.

### How to use the checker module

```javascript
const checker = require('<path>/<to>/erc-checker/index').ercChecker;  // import the ercChecker module, which is a function

// head: checker(config);    
```

The `ercChecker` function will return a Promise, which will be resolved on successful execution, or rejected on error.

Thus, while the Checker will run asynchronously, it can be chained in a controlled fashion.
It can be used as follows: 

```javascript
    // use with direct file paths: 
    let config = {
        directoryMode: false, 
        pathToOriginalHTML: "path/to/fileA.html",
        pathToReproducedHTML: "path/to/fileB.html",
        saveFilesOutputPath: "/optional/output/path/",
        saveDiffHTML: true,
        outFileName: "customNameForDiff.html",
        saveMetadataJSON: true,
        createParentDirectories: true,
        comparisonSetBaseDir: "/path/of/files/toBeChecked",
        checkFileTypes: ["htm", "html"],				// case insensitive list of file endings to be included
        quiet: false
    }
    
    // example
    checker(config)
        .then(
            // successfully resolved: result contains metadata object
            function (resolveMetadata) {
                //handle result 
            },
            // an Error occured, Promise rejected
            function (rejectMetadata) {
                // handle result
            }
        );
        
    // in this example, independent of result handling, there will be files for resulting HTML and Metadata JSON saved to specified output location
    // file names:  customNameForDiff.html , metadata.json 
```

```javascript
    // use with directories
     let config = {
            directoryMode: true, 
            pathToMainDirectory: "path/to/directory",
            quiet: true
        }
    
    // example
    checker(config)
        .then( /*...*/ );
        
    // in this example, no files will be written, and Debug loggers are silenced
```


__Note:__ The checker will automatically remove all temporary files on termination. To prevent this, set an environment variable `DEV=true`.


#### Debug

Enable debugging by setting an environment variable **DEBUG**.
E.g.:
 ```bash
    $  DEBUG=* node yourProject.js
 ```
 
 Find available DEBUG loggers [below](#debug-loggers).

-------------------------------------------------

### Debug loggers

Available DEBUG loggers are:

* index:checkRequestHandling  *
* index:ERROR  *
* checker:general *
* checker:slice
* checker:compare
* checker:reassemble
* checker:ERROR  *

For debugging tests, use 'tester'.

\* default when used as CLI

## License

o2r checker is licensed under Apache License, Version 2.0, see file LICENSE.

Copyright (C) 2018 - o2r project. 

![o2r](https://avatars3.githubusercontent.com/u/16774537?v=3&s=200)
