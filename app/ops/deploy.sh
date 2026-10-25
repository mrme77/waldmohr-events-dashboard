#!/usr/bin/env bash
# Publish changed commits only; record success after rsync so failures retry.
# Optional arguments: repository, publish destination, operations directory.
set -euo pipefail

REPO="${1:-$HOME/Desktop/waldmohr-events-dashboard}"
DEST="${2:-/var/www/waldmohr}"
OPS="${3:-$HOME/dashboard-ops}"
LOCK="$OPS/deploy.lock"
PUBLISHED="$OPS/published-commit"
DEPENDENCIES="$OPS/dependency-fingerprint"

exec 9>"$LOCK"
flock -n 9 || exit 0
cd "$REPO"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Local changes detected. Deployment skipped." >&2
  exit 1
fi

git fetch origin main
git merge --ff-only origin/main
NEW_COMMIT="$(git rev-parse HEAD)"
LAST_PUBLISHED=""
if [[ -f "$PUBLISHED" ]]; then
  LAST_PUBLISHED="$(cat "$PUBLISHED")"
fi

if [[ "$NEW_COMMIT" == "$LAST_PUBLISHED" && -f "$DEST/index.html" ]]; then
  echo "Already published $NEW_COMMIT. No build needed: $(date -Is)"
  exit 0
fi

cd "$REPO/app"
# Include runtime versions and npm configuration because they affect installation.
FINGERPRINT="$(
  {
    sha256sum package.json package-lock.json || exit 1
    for config in .npmrc ../.npmrc; do
      if [[ -f "$config" ]]; then sha256sum "$config" || exit 1; fi
    done
    node --version || exit 1
    npm --version || exit 1
    printf '%s\n' "${NODE_ENV:-}" "${NPM_CONFIG_OMIT:-}" "${NPM_CONFIG_INCLUDE:-}"
  } | sha256sum
)"
LAST_DEPENDENCIES=""
if [[ -f "$DEPENDENCIES" ]]; then
  LAST_DEPENDENCIES="$(cat "$DEPENDENCIES")"
fi

if [[ "$FINGERPRINT" != "$LAST_DEPENDENCIES" || ! -f node_modules/.package-lock.json || ! -x node_modules/.bin/vite || ! -x node_modules/.bin/tsc ]]; then
  npm ci
  printf '%s\n' "$FINGERPRINT" > "$DEPENDENCIES.tmp"
  mv "$DEPENDENCIES.tmp" "$DEPENDENCIES"
else
  echo "Dependency inputs unchanged; reusing node_modules."
fi

npm run validate
npm run build
rsync -a --exclude='family.json' "$REPO/app/dist/" "$DEST/"

printf '%s\n' "$NEW_COMMIT" > "$PUBLISHED.tmp"
mv "$PUBLISHED.tmp" "$PUBLISHED"

if ! XDG_RUNTIME_DIR=/run/user/1000 \
     WAYLAND_DISPLAY=wayland-0 \
     /usr/bin/wtype -M ctrl -M shift r -m shift -m ctrl; then
  echo "WARNING: Deployment succeeded, but Chromium did not accept the refresh keystroke." >&2
fi

echo "Deployment completed: $(date -Is)"
