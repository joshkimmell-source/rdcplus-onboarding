#!/usr/bin/env sh
# Build both prototypes and publish them to the gh-pages branch:
#   /            landing page (site/index.html)
#   /agent/      agent workspace onboarding
#   /agent-walkthrough/  agent onboarding, in-product walkthrough direction
#   /consumer/   consumer onboarding
# GitHub can't build this repo itself (@rdc-npm packages live in internal
# Artifactory), so we build locally and push only the output.
#
# Defaults publish all three apps plus the landing page to this repo's gh-pages.
# Overrides (used by `npm run deploy:test`):
#   DEPLOY_APPS    space-separated apps to publish. When set, there is no landing page,
#                  so the site root does not resolve to a working page.
#   DEPLOY_REMOTE  where to push (default: this repo's origin)
#   DEPLOY_BRANCH  branch to push (default: gh-pages)
set -e

ROOT=$(cd "$(dirname "$0")/.." && pwd)
REMOTE=${DEPLOY_REMOTE:-$(git -C "$ROOT" remote get-url origin)}
BRANCH=${DEPLOY_BRANCH:-gh-pages}
APPS=${DEPLOY_APPS:-agent agent-walkthrough consumer}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

for app in $APPS; do
  (cd "$ROOT/$app" && npm run build)
  mkdir -p "$TMP/$app"
  cp -R "$ROOT/$app/dist/." "$TMP/$app"
done
if [ -z "$DEPLOY_APPS" ]; then cp "$ROOT/site/index.html" "$TMP/index.html"; fi
touch "$TMP/.nojekyll"

cd "$TMP"
git init -q -b "$BRANCH"
git add -A
git commit -qm "Deploy built prototypes"
git push -f "$REMOTE" "$BRANCH"
