# erc-checker

A JavaScript library and CLI tool for [ERC](https://github.com/o2r-project/erc-spec) metadata, execution, and result checking.  

 
The erc-checker is part of the [o2r-project](http://www.o2r.info/). Its purpose is to verify the o2r-platform's reproduction automatism for scientific papers in HTML format. 

The erc-checker runs on [NodeJS](https://nodejs.org/en/). The tool implements a [command line interface](#command-line-interface). It can also be used as a [NodeJS module](#node-module). 

**Note:**  
This tool is being developed and tested on Linux Ubuntu 14.04 LTS. It has not yet been tested on any other OS.  
It should, however, perform on all Linux systems that have `diffutils` installed (default). 

The index.js is currently not functional, only the node-module `compareHTML`, which is exported from `checker.js`, can be used.

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

* **other**
  * [diff/diffutils](https://wiki.ubuntuusers.de/diff/) - Unix/Linux tool to find differences in files 

-------------------------------------------------

### Current Usability

Currently, the erc-checker tool is capable of taking two input paths pointing to locally stored HTML files, an 'original' and a 'reproduced' paper, and an optional third path for the output created (**current version: directories in path must exist in advance!**).  
The tool will compare both HTML files for images only. The images MUST be __base64__-encoded, and encapsulated in an HTML img-Tag, as generated automatically when rendering an .Rmd file into HTML format. 

For more information on the nature of ERC HTML papers, see the _testPapers_ provided in the `test/` directory, the documentations for [RMarkdown](http://rmarkdown.rstudio.com/), [knitr](https://yihui.name/knitr/), and the [ERC specification](https://github.com/o2r-project/erc-spec) of the o2r-project.

If both HTML papers contain an equal number of images, erc-checker writes a new HTML files containing the results of the comparison between all images in the input files, as created by `blink-diff` (_by Yahoo_), as well as, currently, the text of the first (original) paper. 

-------------------------------------------------

### Command Line Interface

#### Installation
1. Navigate to the erc-checker base directory
2. Run `npm install -g` (you will need to be root) to use the checker tool from CLI, or just run `npm install`

#### Usage

``` bash
erc-checker [options] <originalHTML> <reproducedHTML> [-o <output>]
```

``` bash
<originalHTML>		Relative or absolute location of the Original HTML file to be compared.
<reproducedHTML>	Relative or absolute location of the Reproduced HTML file to be compared.
```

##### Options:

``` bash
-h, --help                  output usage information
                               
-o, --output <outputPath>   desired output location and file name 
    			            as String or standard path input.
    			            Accepts absolute and relative paths alike.
                               
-q, --quiet                 quiet mode, silencing DEBUG logs entirely
```

##### Debug

To _debug_ this tool, set a environment variable **DEBUG**.
   
Example:
   
``` bash
DEBUG=* erc-checker [option] <path_original> <path_reproduced> [-o <output>]
```

Find available DEBUG loggers [below](#debug-loggers).


-------------------------------------------------

### Node module

The erc-checker's `index.js` exports an object called `ercChecker`. This object contain a function that takes two paths to HTML files and an optional path defining an output location. 

#### Usage

``` javascript
const checker = require('path/to/erc-checker/index').ercChecker;  // import the ercChecker module

let pathToFileA = "path/to/fileA.html",
    pathToFileB = "path/to/fileB.html",
    outputPath = "optional/output/path/and/new/[filename]";   // output will be named [filename].html

checker(pathToFileA, pathToFileB [, outputPath]);   // create an HTML diff-file, optionally at [outputPath] 
```

Currently, the ercChecker module will send valid status codes in response 
when both input files are equal, or if they cannot be compared (e.g. unequal number of images).

However, in the current version, there is no status code returned on successful or unsuccessful comparison.
This will be fixed in the future.

##### Debug

To receive command line outputs from the erc-checker's node module, please set the environment variable DEBUG first.  
E.g. if your project uses the module, start it as such:
 ``` bash
    $  DEBUG=* node yourProject.js
 ```
 
 Find available DEBUG Loggers [below](#debug-loggers).

-------------------------------------------------

## Debug Loggers

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

## License

o2r checker is licensed under Apache License, Version 2.0, see file LICENSE.

Copyright (C) 2016 - o2r project. 

![o2r](https://avatars3.githubusercontent.com/u/16774537?v=3&s=200)