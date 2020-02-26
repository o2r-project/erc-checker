#!/usr/bin/env bash
set -o errexit -o nounset

# Get curent commit revision
rev=$(git rev-parse --short HEAD)

# Initialize gh-pages checkout
mkdir -p site
(
  cd site
  git init
  git config user.name "${GH_USER_NAME}"
  git config user.email "${GH_USER_EMAIL}"
  git remote add upstream "https://${GH_TOKEN}@github.com/${GH_SLUG}"
  git fetch upstream
  git reset upstream/gh-pages
)

# Build the documentation
mkdocs build --clean --verbose

(
  cd site
  # Replace current build version and date
  CURRENT_VERSION=$(git log --pretty=format:'%h' -n 1)
  CURRENT_DATE=$(git show -s --format=%ci $CURRENT_VERSION)
  echo $CURRENT_VERSION "@" $CURRENT_DATE
  sed -i "s/@@VERSION@@/$CURRENT_VERSION/g" index.html
  sed -i "s/@@TIMESTAMP@@/$CURRENT_DATE/g" index.html
)

# Commit and push the documentation to gh-pages
(
  cd site
  touch .
  git add -A .
  git commit -m "Rebuild pages at ${rev}"
  git push -q upstream HEAD:gh-pages
)
