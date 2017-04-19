/**
 * Created by timmimim on 12.04.17.
 *
 * This tool compares 2 input files.
 *
 */
var fs = require('fs');

// RegEx to find all img tags
var allImgTagsAsStrings = /<p><img (.*)\/><\/p>/g;

var compareHTML = function (fileA, fileB) {

	// read text-based HTML files as Strings
	// if either one is unreadable, log & set a corresponding boolean
	var readableA, readableB = true;
	var htmlStringA = fs.readFileSync(fileA, function (err) {
		if (err) {
			console.log("Unable to read the first (original) file as String. Something has gone wrong. </br> Maybe check your input path.");
			readableA = false;
		}
	})
	var htmlStringB = fs.readFileSync(fileB, function (err) {
		if (err) {
			console.log("Unable to read the second (reproduced) file as String. Something has gone wrong. </br> Maybe check the input path or consult our service for troubleshooting.");
			readableB = false;
		}
	})

	// if either file is unreadable, throw an error to end execution
	if (!(readableA && readableB)) {
		throw new ReferenceError("Error reading target files: One of the files to be compared is not readable. Please check their content and path. </br></br> If you cannot resolve the cause of the issue, please consult our service.");
	}

	// actual comparison starts HERE!



}


function getContentsOfImageTags(stringifiedHTML) {

	var arrayOfMatches = stringifiedHTML.match(allImgTagsAsStrings);
	console(arrayOfMatches);
	return arrayOfMatches;

}

module.exports = {
	compareHTML: compareHTML()
}