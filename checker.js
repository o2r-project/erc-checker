/**
 * Created by timmimim on 12.04.17.
 *
 * This tool compares 2 input files.
 *
 */
var fs = require('fs');

var compareHTML = function (fileA, fileB) {
	var htmlStringA = fs.readFileSync(fileA, function (err) {
		if (err) {
			console.log("Unable to read file as String. Something has gone wrong. </br> Maybe check your input path.");
			
		}
	})
}

module.exports = {
	compareHTML: compareHTML()
}