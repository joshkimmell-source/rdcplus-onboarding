#!/usr/bin/env sh
# Build both prototypes and publish them to the gh-pages branch:
#   /            landing page (site/index.html)
#   /agent/      agent workspace onboarding
#   /consumer/   consumer onboarding
# GitHub can't build this repo itself (@rdc-npm packages live in internal
# Artifactory), so we build locally and push only the output.
set -e

ROOT=$(cd "$(dirname "$0")/.." && pwd)
REMOTE=$(git -C "$ROOT" remote get-url origin)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

for app in agent consumer; do
  (cd "$ROOT/$app" && npm run build)
  mkdir -p "$TMP/$app"
  cp -R "$ROOT/$app/dist/." "$TMP/$app"
done
cp "$ROOT/site/index.html" "$TMP/index.html"
touch "$TMP/.nojekyll"

cd "$TMP"
git init -q -b gh-pages
git add -A
git commit -qm "Deploy built prototypes"
git push -f "$REMOTE" gh-pages
