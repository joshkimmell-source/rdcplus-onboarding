#!/usr/bin/env sh
# Publish the built prototype in dist/ to the gh-pages branch.
# GitHub can't build this repo itself (@rdc-npm packages live in internal
# Artifactory), so we build locally and push only the output.
set -e

REMOTE=$(git remote get-url origin)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

cp -R dist/. "$TMP"
touch "$TMP/.nojekyll"

cd "$TMP"
git init -q -b gh-pages
git add -A
git commit -qm "Deploy built prototype"
git push -f "$REMOTE" gh-pages
