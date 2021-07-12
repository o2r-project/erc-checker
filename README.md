# erc-checker

![badge for workflow status](https://github.com/o2r-project/erc-checker/actions/workflows/site_build.yml/badge.svg) [![Build status](https://ci.appveyor.com/api/projects/status/xbla7j4wpbwauk7p/branch/master?svg=true)](https://ci.appveyor.com/project/nuest/erc-checker-r035a/branch/master) [![npm](https://img.shields.io/npm/v/erc-checker.svg)](https://www.npmjs.com/package/erc-checker) [![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active) [![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.2203843.svg)](https://doi.org/10.5281/zenodo.2203843) [![SWH](https://archive.softwareheritage.org/badge/swh:1:dir:a67e6dcbe3a1b5b38aad94fea4095324cd09607a/)](https://archive.softwareheritage.org/swh:1:dir:a67e6dcbe3a1b5b38aad94fea4095324cd09607a;origin=https://github.com/o2r-project/erc-checker.git;visit=swh:1:snp:e3d5cd96bdcee333417ea2192584060bef2a77ac;anchor=swh:1:rev:41e32824d581e763c58004e498c1bf1f343ef6c7;path=//)

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

Add version tag locally, e.g., `v.1.2.3`, and push to remotes.
Then create a new release on GitHub.

## How to cite

To cite this software please use

> _Nüst, Daniel, 2018. Reproducibility Service for Executable Research Compendia: Technical Specifications and Reference Implementation. Zenodo. doi:[10.5281/zenodo.2203843](https://doi.org/10.5281/zenodo.2203843)_

## License

o2r checker is licensed under Apache License, Version 2.0, see file `LICENSE`.

Copyright (C) 2020 - o2r project. 

[![o2r](https://avatars3.githubusercontent.com/u/16774537?v=3&s=200)](https://o2r.info)
