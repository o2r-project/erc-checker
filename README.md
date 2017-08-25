# erc-checker

A JavaScript library and CLI tool for [ERC](https://github.com/o2r-project/erc-spec) metadata, execution, and result checking.  

 
The erc-checker is part of the [o2r-project](http://www.o2r.info/). Its purpose is to verify the o2r-platform's reproduction automatism for scientific papers in HTML format. 

The erc-checker runs on [NodeJS](https://nodejs.org/en/). The tool implements a [NodeJS module](#node-module), which is a function returning a [JavaScript Promise](https://www.npmjs.com/package/promise). 

It further implements a [command line interface](#command-line-interface) (WORK IN PROGRESS). 



-------------------------------------------------

## NodeJS module usage

The erc-checker's `index.js` exports an object called `ercChecker`. This object contains a function that takes two paths to HTML files and optional further parameters, and returns a JavaScript Promise. 

#### Current functional scope

The ERC-Checker requires two valid paths as input. These MUST be either
 - pointing to locally stored HTML files (_Original_ and _Reproduced_ paper), or
 - pointing to a directory which MUST contain a "_Original_" and a "_Reproduced_" subdirectory holding an HTML paper each, i.e.:
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
 
    ___Note___: HTML files in directories are NOT REQUIRED to be named "_main.html_". However, erc-checker will pick the first `.html`file found _in alphabetical order_. 
 
The tool will compare both HTML files for images only. The images __MUST__ be __base64__-encoded, and encapsulated in an HTML img tag, as generated automatically when rendering an .Rmd file into HTML format. 

For more information on the nature of ERC HTML papers, see the _testPapers_ provided in the `test/` directory, the documentations for [RMarkdown](http://rmarkdown.rstudio.com/), [knitr](https://yihui.name/knitr/), and the [ERC specification](https://github.com/o2r-project/erc-spec) of the o2r-project.

If both HTML papers contain an equal number of images, erc-checker writes a new HTML files containing the results of the comparison between all images in the input files, as created by `blink-diff` (_by Yahoo_), as well as, currently, the text of the first (original) paper. 

Further parameters (in order): 
  - [String]  optional third path for the output created
  - [String]  an ID for the current check, necessary when performing multiple parallel checks
  - [Boolean] flag: create parent directories for output (if false and directories of path not yet created, output will not be created) 
  - [Boolean] flag: silence loggers
  - [Boolean] flag: save metadata (same directory and file-name as result html output)

#### Errors
Any Errors during execution cause the returned JSPromise to be __rejected__. Errors will be caught and
 - logged out to the console
 - saved in a check metadata JSON object, which is returned as _rejection argument_ as such:
 ```
     ﻿{
     	"differencesFound": ... ,
     	"text":"not implemented yet",
     	"numberOfImages": ... ,
     	"images": [ ... ],
     	"resultHTML": ... ,
        "timeOfCheck": {      // dates as milliseconds since 01.01.1970 00:00:00 UTC (UNIX time)
             "start": Number,
             "end": Number
        },
        "errorsEncountered": [ <Error description> ] 
     }
  ```
Metadata may contain a varying amount of data, depending on where in the process an Error occurred.

Externally caused Errors will occur, if:
- paths to files / directoy are invalid
- output path does not exist, and createParentDirectories flag is not set
- papers contain an unequal number of images
- base64-encoded image invalid / broken
- 

    
#### Returns
The ercChecker function returns a JSPromise. 

If execution is successful, the Promise will be __resolved__, containing a check metadata JSON object as such:
 ```
    ﻿{
    	"differencesFound": Boolean,
    	"text":"not implemented yet",
    	"numberOfImages": Number,
    	"images": [	
    		{
    			"imageIndex": Number,
    			"prepResult": Number, // represents status code, see below
    			"compareResults":	{
    				"differences": Number,
    				"dimension": Number
    			}
    		}, ...
    	],
    	"resultHTML": String, // contains the entire result HTML, 
    	                      // with images swapped for diff-Images where differences were found;
    	                      // currently contains text from 'Original' paper
    	                      
        "timeOfCheck": {      // dates as milliseconds since 01.01.1970 00:00:00 UTC (UNIX time)
            "start": Number,
            "end": Number
        },
        "errorsEncountered": [] 
    }
 ```

prepResult codes (for images of same index in paper):
- 0: images equal
- 1: images do not differ in size
- 2: images differed in size -- resized for comparison
- 3: images differed in size -- not resized for comparison


### How to use the ERC-Checker module

```javascript
const checker = require('<path>/<to>/erc-checker/index').ercChecker;  // import the ercChecker module, which is a function

// head: checker(originalHTML, reproducedHTML, outputPath, checkID, createParentDirectoriesInOutputPath, silenceDebuggers, saveMetadata);    
```

The ercChecker function will return a Promise, which will be resolved on successful execution, or rejected on Error.

Thus, while the Checker will run asynchronously, it can be chained in a controlled fashion.
It can be used as such: 

```javascript
    // use with direct file paths:
    let pathToFileA = "path/to/fileA.html",
        pathToFileB = "path/to/fileB.html",
        outputPath = "optional/output/path/and/new/[filename]";   // output will be named [filename].html (and [filename].json)
    
    // example
    checker(pathToFileA, pathToFileB, outputPath, "exampleCheckFiles", true, false, true)
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
```

```javascript
    // use with directories
    let parentDir = "path/to/directory";
    
    // leave second parameter empty to use first path as directory
    checker(parentDir, null, null, "exampleCheckDir", false, true, false)
        .then( /*...*/ );
        
    // in this example, no files will be written, and Debug loggers are silenced
```




#### Debug

To receive command line outputs from the erc-checker's node module, please set the environment variable DEBUG first.  
E.g. if your project uses the module, start it as such:
 ```bash
    $  DEBUG=* node yourProject.js
 ```
 
 Find available DEBUG Loggers [below](#debug-loggers).
 
-------------------------------------------------

### Command Line Interface (WORK IN PROGRESS)

#### Installation
1. Navigate to the erc-checker base directory
2. Run `npm install -g` (you will need to be root) to use the checker tool from CLI, or just run `npm install`

#### Usage

```bash
erc-checker [options] <originalHTML> <reproducedHTML> [-o <output>]
```

```bash
<originalHTML>		Relative or absolute location of the Original HTML file to be compared.
<reproducedHTML>	Relative or absolute location of the Reproduced HTML file to be compared.
```

##### Options:

```bash
-h, --help                  output usage information
                               
-o, --output <outputPath>   desired output location and file name 
    			            as String or standard path input.
    			            Accepts absolute and relative paths alike.

-p, --parents               automatically create parent directories for output path
                               
-q, --quiet                 quiet mode, silencing DEBUG logs entirely
```

##### Debug

To _debug_ this tool, set a environment variable **DEBUG**.
   
Example:
   
```bash
DEBUG=* erc-checker [option] <path_original> <path_reproduced> [-o <output>]
```

Find available DEBUG loggers [below](#debug-loggers).

-------------------------------------------------

### Debug Loggers

Available DEBUG loggers are:

* index:checkRequestHandling  *
* index:ERROR  *
* checker:general *
* checker:slice
* checker:compare
* checker:reassemble
* checker:ERROR  *

\* default when used as CLI

----------------------------------------------------

### Dependencies 
* **[node](nodejs.org)** v6.11.0 or compatible
* **[npm](http://npmjs.com/)**
  * [base64-arraybuffer](https://www.npmjs.com/package/base64-arraybuffer) (^0.1.5)
  * [blink-diff](https://www.npmjs.com/package/blink-diff) (^1.0.13)
  * [chai](https://www.npmjs.com/package/chai) (^4.0.2)
  * [colors](https://www.npmjs.com/package/colors) (^1.1.2)
  * [commander](https://www.npmjs.com/package/commander) (^2.9.0)
  * [debug](https://www.npmjs.com/package/debug) (^2.6.8)
  * [image-size](https://www.npmjs.com/package/image-size) (^0.6.0)
  * [leven](https://www.npmjs.com/package/leven) (^2.1.0)
  * [levenshtein](https://www.npmjs.com/package/levenshtein) (^1.0.5)
  * [mocha](https://www.npmjs.com/package/mocha) (^3.4.2)
  * [promise](https://www.npmjs.com/package/promise) (^7.1.1)
  * [rewire](https://www.npmjs.com/package/rewire) (^2.5.2)
  * [sharp](https://www.npmjs.com/package/sharp) (^0.18.2)

## License

o2r checker is licensed under Apache License, Version 2.0, see file LICENSE.

Copyright (C) 2016 - o2r project. 

![o2r](https://avatars3.githubusercontent.com/u/16774537?v=3&s=200)