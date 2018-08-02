'use strict';
const   fs      = require('fs'),
        path    = require('path'),
        deglob  = require('deglob');
        Promise = require('promise');

function globWithXignore (glob_opts) {

    /**
     * glob_opts SHOULD include:
     *      .comparisonSetBaseDir       String  path to directory for which to create the glob
     *      .ignoreFile                 String  name of custom ignore file (e.g. ".ercignore")
     *      .checkFileTypes             Array   List of File Types as Suffixes, to be included in glob (not case sensitive)
     *      .findRoot                   Bool    set true to look for next `package.json` in parent dirs and set it´s dir as Root for glob
     *                                          set false to avoid this behaviour and create glob from .comparisonSetBaseDir
     */

    //
    let regexToFilterCheckfileList = "^(.*\\.(";
    glob_opts.checkFileTypes.forEach(fileType => regexToFilterCheckfileList += fileType.toString() + "|");
    regexToFilterCheckfileList = regexToFilterCheckfileList.slice(0, regexToFilterCheckfileList.length - 1).concat("))$");

    function filterFiles (arrayOfFilePaths) {
        return arrayOfFilePaths.filter((file) => new RegExp(regexToFilterCheckfileList, 'gim').test(file));
    }

    return new Promise(function (resolve, reject) {

        try {

            // check if there is an .ercignore file for the Comparison Set
            let ignoreFile = path.join(glob_opts.comparisonSetBaseDir, glob_opts.ignoreFile);
            try {
                fs.accessSync(ignoreFile);
            }
            catch (e) {
                ignoreFile = undefined;
            }


            // erc-checker works with absolute paths, so set `findRoot` to false; path in opts.cwd is Root
            var opts = {
                cwd: glob_opts.comparisonSetBaseDir,
                useGitIgnore: true,
                gitIgnoreFile: glob_opts.ignoreFile,
                findRoot: glob_opts.findRoot
            };

            deglob(["**/*"], opts, function (err, files) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(filterFiles(files));
                }
            });
        }
        catch (err) {
            reject(err);
        }
    });
}
/**
 * Expose `globWithXignore`
 */

module.exports = {
    globWithXignore : globWithXignore
};

