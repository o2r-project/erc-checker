# Contributing

We welcome [contributions of all kinds](https://opensource.guide/how-to-contribute/), be it general feedback, code, tests, or documentation.
This guide documents development steps both for newcomers and maintainers of the package `erc-checker`.

When contributing to this repository, please first discuss the change you wish to make via an [issue on GitHub](https://github.com/o2r-project/erc-checker/issues) before starting your work.
While you're there, please check out the [existing issues](https://github.com/o2r-project/erc-checker/issues)  where the development ist planned, for related or similar ideas and features.

**Please note we have a [code of conduct](CONDUCT.md), please follow it in all your interactions with the project.**

## How to get started

The following steps assume you are familiar with JavaScript package development using the [npm](https://www.npmjs.com/) registry.
If not, it could be worth familiarising yourself with the [npm documentation on packages and modules](https://docs.npmjs.com/packages-and-modules/).
When you start working on an issue, feel free to be frank about your skillset - we're happy to get you started from whatever level you begin on.

When you want to contribute code or docs, first [fork](https://help.github.com/en/articles/fork-a-repo), then clone the repo:

```bash
git clone https://github.com/<your username>/erc-checker.git
```

You should add the main repository as a remote so you know what's going on:

```bash
git add remote upstream https://github.com/o2r-project/erc-checker
```

Install the package from source and make sure the tests pass:

```bash
npm install
npm test
```

## Contribute JavaScript code

- Create a new feature branch from the current `master` branch with a short name resembling the feature you work on
- Make your change, be it a new feature, a bugfix, or new tests
- Add documentation for your change
- Add tests for your change
- Make the tests pass
- Add yourself to the contributor list in `package.json` if you're not there yet
- Increment the version in `package.json`, see [semantic versioning]()
  - Increase the _minor version_ for new features
  - Increase the _bugfix version_ for bugfixes only
  - Increase the _major version_ for breaking changes
- Push your feature branch to your fork and [submit a pull request](https://help.github.com/en/articles/about-pull-requests) to the upstream's `master` branch.
  - Please be patient until maintainers review your pull request.
    We may suggest some changes or improvements or alternatives.
    Feel free to ping `@nuest` if you don't hear anything after a few days.

## Contribute documentation

Documentation is build based on Markdown files in the `/docs` directory and rendered into static HTML pages with [mkdocs]() using Travis CI (see `.travis.yml`).

**View docs locally** using Python 3:

```bash
# Activate a Python 3 virtual environment
# mkvirtualenv erc-checker-docs --python=python3.7
workon erc-checker-docs

# Install required tools:
pip install mkdocs mkdocs-cinder pymdown-extensions pygments

# Run a local server rendering the docs
mkdocs serve --verbose
```

Now view the page at [http://127.0.0.1:8000/](http://127.0.0.1:8000/)

Other commands:

```bash
cd docs/

mkdocs build --clean --verbose
```

## Online documentation

The online documentation is automatically built by Travis CI, see file `.travis.yml`.
For background on the personal access token see [https://github.com/o2r-project/erc-spec#automated-builds](https://github.com/o2r-project/erc-spec#automated-builds).

## Development hints

For debugging purposes: When running the checker with a NodeJS environment variable `DEV` set true, the result AND reject metadata will include an absolute path to the temp-directory used during the check.

## Publish a new release

1. Update dependencies and make sure tests still work
1. Make the release
   ```bash
   # see npm version --help
   npm version {major,minor,bugfix}
   npm publish
   ```
1. Check the information on npm: https://www.npmjs.com/package/erc-checker
1. Add release notes on GitHub: https://github.com/o2r-project/erc-checker/releases
