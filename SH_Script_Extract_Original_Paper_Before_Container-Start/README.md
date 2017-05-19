## Author: Timm Kühnel
## with:   o2r - Opening Reproductive Research

## date created: Fr. 12.05.2017
## Version: 1.0.0

####################################################################
##### 	 Bash Script to extract a certain file from an ERC    ######
#####   (following the ERC specification of the o2r project)  ######
####################################################################

./recover_original_paper_from_image.sh $1 $2 [$3]

Parameters:
$1:  Specify the ID / unique name of an ERC as a String
	i.e.:  "NameofERC" / "id"

$2:  Pass the location of the ERC within your file system
	IF the path includes spaces, it needs to be passed as a String!
	i.e.:  "path/to/\ ERC/"

$3:  Optional: 	If the Paper / target file is called anything else than main.html, 
	the file name may be passed here. 
	!: Note that, as with the path, a file name including spaces must be passed
	   as a String!

The tool will create in it's own base directory two directories:

a) temporaryContent:  The targeted ERC's image.tar file will be extracted  into 
	              this directory temporarily;
	              Temporary files will be kept in a directory named after the 
	              passed ERC id / name.
 	              When execution finished, all temp-files will be deleted.

b) original_papers:   The extracted Paper / target file will be saved into this directory,
	              within a directory named after the passed ERC name / id.

Tool uses unix cl tools  [tar, find, cp].
