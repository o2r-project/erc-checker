# Glob with X-Ignore File

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