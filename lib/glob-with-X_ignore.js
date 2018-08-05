'use strict';
const fs = require('fs'),
    path = require('path'),
    deglob = require('deglob');
const debug = require('debug')('deglob');

Promise = require('promise');

function globWithXignore(glob_opts) {
    /**
     * glob_opts SHOULD include:
     *      .comparisonSetBaseDir       String  path to directory for which to create the glob
     *      .ignoreFile                 String  name of custom ignore file (e.g. ".ercignore")
     *      .checkFileTypes             Array   List of File Types as Suffixes, to be included in glob (not case sensitive)
     *      .findRoot                   Bool    set true to look for next `package.json` in parent dirs and set it´s dir as Root for glob
     *                                          set false to avoid this behaviour and create glob from .comparisonSetBaseDir
     */

    let regexToFilterCheckfileList = "^(.*\\.(";
    glob_opts.checkFileTypes.forEach(fileType => regexToFilterCheckfileList += fileType.toString() + "|");
    regexToFilterCheckfileList = regexToFilterCheckfileList.slice(0, regexToFilterCheckfileList.length - 1).concat("))$");

    return new Promise(function (resolve, reject) {
        debug("Creating file list for check using options %o and filter regex %o", glob_opts, regexToFilterCheckfileList)

        // check if there is an ignore file for the Comparison Set
        if (glob_opts.ignoreFile) {
            try {
                let ignoreFileFullPath = path.join(glob_opts.comparisonSetBaseDir, glob_opts.ignoreFile);
                fs.accessSync(ignoreFileFullPath);
                debug("ignore file exists at %s", ignoreFileFullPath);
            }
            catch (e) {
                debug("No ignore file found at %s", path.join(glob_opts.comparisonSetBaseDir, glob_opts.ignoreFile));
            }
        }
        // erc-checker works with absolute paths, so set `findRoot` to false; path in opts.cwd is Root
        var opts = {
            cwd: glob_opts.comparisonSetBaseDir,
            useGitIgnore: true,
            gitIgnoreFile: glob_opts.ignoreFile,
            findRoot: glob_opts.findRoot
        };

        debug("Deglobbing with %o", opts);
        deglob(["**/*"], opts, function (err, files) {
            if (err) {
                reject(err);
            }
            else {
                let fileList = files
                    .filter((file) => new RegExp(regexToFilterCheckfileList, 'gim')
                        .test(file));
                debug("Deglobbed file list: %o", fileList);
                resolve(fileList);
            }
        });
    });
}

module.exports = {
    globWithXignore: globWithXignore
};

