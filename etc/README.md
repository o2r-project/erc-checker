# 	Bash Script to extract a certain file from an ERC    
##   following the ERC specification of the o2r project

### Dependencies:
* tar 	- The GNU version of the tar archiving utility in Unix/Linux
* find 	- Unix/Linux tool to search for files in a directory hierarchy 
* cp 	- Unix/Linux tool to copy one or more files to another location

**_Syntax:_**

`./extract_original_paper_from_ERC.sh $1 $2 [$3]`

There is no --help option implemented currently.


### Parameters:

*  **$1** : specifies the ID / unique name of an ERC as a String
   * i.e.:  "NameofERC" / "id"

*  **$2** : pass the location of the ERC within your file system
   * IF the path includes spaces, it needs to be passed as a String!
   * i.e.:  "path/to/\ ERC/"
   * file path may be absolute, or relative to the current working directory from which the bash script is called.
   	* Absolute: "~/path/to/image.tar" 
	* Calling script from its own directory: e.g. "../../../path/to/image.tar"
	* Calling script from another directory: Go back as far a necessary from current working directory, then navigate to "path/to/image.tar"

*  **$3** (optional) : 	If the Paper / target file is called anything else than main.html, 
	the file name may be passed here. 
   * !: Note that, as with the path, a file name including spaces must be passed
	   as a String!



The tool will create, _in the current working directory from which it is called_, two directories:

* **_temporaryContent_**:  The targeted ERC's image.tar file will be extracted  into 
	              this directory temporarily;
	              Temporary files will be kept in a directory named after the 
	              passed ERC id / name.
 	              When execution finished, all temp-files will be deleted.

* **_original\_papers_**:   The extracted Paper / target file will be saved into this directory,
	              within a directory named after the passed ERC name / id.
		      
		      
# Glob with Ignore File

Create a Glob, i.e. List of relative paths for a specific directory, with respect to an ignore file similar to `.gitignore`.

#### Funtionality

This node module exports a single function, `globWithXignore()`, which uses a single config object as a parameter.

It returns an Array of stringified file paths, relative to a specifiable base directory. 
The file endings of any file included in this List of Paths match the file endings specified in the config object. 
The List excludes all files, file types and (sub-)directories specified in an `ignore` file, using the same mechanics as `.gitignore`.  

##### Config object

```javascript
    let glob_opts = {
         comparisonSetBaseDir:  String,     // path to directory for which to create the glob
         ignoreFile:  String,               // name of custom ignore file (e.g. ".ercignore")
         checkFileTypes:  [],               // List of File Types as Suffixes, to be included in glob (not case sensitive)
         findRoot:  Boolean                 // set true to look for next `package.json` in parent dirs and set it´s dir as Root for glob
                                            // set false to avoid this behaviour and create glob from .comparisonSetBaseDir
    }
```

## License
o2r checker is licensed under Apache License, Version 2.0, see file LICENSE.

Copyright (C) 2016 - o2r project.


|  _Author_: | Timm Kühnel |
| -----------------|-------------|
|  _with_: | o2r - Opening Reproductive Research |
| _date created_: | Fr. 12.05.2017 |
| _Version_:| 1.0.0 |
