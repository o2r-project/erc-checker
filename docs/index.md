# erc-checker

A JavaScript library and CLI tool for [ERC](https://o2r-info/erc-spec) execution and result checking.  
The checker is part of the project [o2r](https://o2r.info/).

## Installation

**From npm**

```bash
npm install erc-checker
```

**From source**

Install the current development version directly from GitHub:
 
`npm install --save git+https://github.com/o2r-project/erc-checker.git`

Alternatively, the git repository may be cloned and packed into an npm package locally using the following console commands. 

```bash
git clone https://github.com/o2r-project/erc-checker.git
cd erc-checker
npm pack          
```

The `npm pack` command creates a tarball named `erc-checker-x.y.z.tgz` in the same directory.
This resulting tarball is a fully functioning npm package.
It may then be installed into any project with:

```bash
npm install /path/to/tarball/erc-checker-x.y.z.tgz`
```

## Usage

The the menu on the left for documentation about usage [as a CLI tool](cli.md) and [as a JavaScript module](module.md).

## Support

Please [open an issue on GitHub](https://github.com/o2r-project/erc-checker/issues) if you have any questions.

## Credits

This software is developed by the members of the DFG-funded project Opening Reproducible Research.
`erc-checker` is part of the reference implementations of a reproducibility service based on ERCs.

[![Opening Reproducible Research](/img/o2r-logo.png)](https://o2r.info)

To cite this software please use

> _Nüst, Daniel, 2018. Reproducibility Service for Executable Research Compendia: Technical Specifications and Reference Implementation. Zenodo. doi:[10.5281/zenodo.2203844](http://doi.org/10.5281/zenodo.2203844)_

For a complete list of publications, posters, presentations, and software projects from th2 o2r project please visit [https://o2r.info/results/](https://o2r.info/results/).

## License

![CC-0 Button](https://licensebuttons.net/p/zero/1.0/88x31.png)

The erc-checker documentation is licensed under [Creative Commons CC0 1.0 Universal License](https://creativecommons.org/publicdomain/zero/1.0/), see file `LICENSE`.
To the extent possible under law, the people who associated CC0 with this work have waived all copyright and related or neighboring rights to this work.
This work is published from: Germany.

<div class="buildinfo">Build @@VERSION@@ @ @@TIMESTAMP@@</div>
