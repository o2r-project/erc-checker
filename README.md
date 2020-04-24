# erc-checker

[![Build Status](https://travis-ci.org/o2r-project/erc-checker.svg?branch=master)](https://travis-ci.org/o2r-project/erc-checker) [![Build status](https://ci.appveyor.com/api/projects/status/xbla7j4wpbwauk7p/branch/master?svg=true)](https://ci.appveyor.com/project/nuest/erc-checker-r035a/branch/master) [![npm](https://img.shields.io/npm/v/erc-checker.svg)](https://www.npmjs.com/package/erc-checker)

A JavaScript library and CLI tool for [ERC](https://github.com/o2r-project/erc-spec) result checking.  

The checker is part of the project Opening Reproducible Research ([o2r](http://o2r.info/)).
Its purpose is to verify the result of reproductions of scientific papers as part of the o2r reproducibility service by means of comparing the HTML of the original and reproduced article.

The checker runs on [NodeJS](https://nodejs.org/en/).
The tool implements a [NodeJS module](#node-module), which is a function returning a [JavaScript Promise](https://www.npmjs.com/package/promise). 
It further implements a [command line interface](#command-line-interface) (WORK IN PROGRESS).

The documentation is available at **[https://o2r.info/erc-checker/](https://o2r.info/erc-checker/)**.

## Contribute

All help is welcome: asking questions, providing documentation, testing, or even development.
See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

Please note that this project is released with a [Contributor Code of Conduct](CONDUCT.md).
By participating in this project you agree to abide by its terms.

## Publish a new release

```bash
# see npm version --help
npm version {major,minor,bugfix}
npm publish
```

## License

o2r checker is licensed under Apache License, Version 2.0, see file `LICENSE`.

Copyright (C) 2020 - o2r project. 

[![o2r](https://avatars3.githubusercontent.com/u/16774537?v=3&s=200)](https://o2r.info)
