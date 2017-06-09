# 	Bash Script to extract a certain file from an ERC    
##   following the ERC specification of the o2r project



**_Syntax:_**

`./extract_original_paper_from_ERC.sh $1 $2 [$3]`

There is no --help option implemented currently.

Parameters:

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

This script uses the following unix cl tools : `tar`, `find`, `cp`.

## License
o2r checker is licensed under Apache License, Version 2.0, see file LICENSE.

Copyright (C) 2016 - o2r project.


|  _Author_: | Timm Kühnel |
| -----------------|-------------|
|  _with_: | o2r - Opening Reproductive Research |
| _date created_: | Fr. 12.05.2017 |
| _Version_:| 1.0.0 |
