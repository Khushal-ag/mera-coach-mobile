#!/usr/bin/env bash
# One command: build the Android bundle on EAS and submit it to Google Play Internal testing.
# Usage:
#   bun run ship:android            # ship the current version (EAS raises the versionCode)
#   bun run ship:android 1.0.2      # bump package.json + app.json to 1.0.2 first
# Needs: `bunx eas-cli login` once, and the Google Play service account key uploaded to EAS
# (see docs/RELEASING.md, "One command to Play").
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="${1:-}"
if [[ -n "$VERSION" ]]; then
  [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "error: version must be X.Y.Z (got: $VERSION)" >&2; exit 1; }
  node -e "
    const fs = require('fs');
    for (const [file, edit] of [
      ['package.json', p => { p.version = process.argv[1]; }],
      ['app.json', p => { p.expo.version = process.argv[1]; }],
    ]) {
      const json = JSON.parse(fs.readFileSync(file, 'utf8'));
      edit(json);
      fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n');
    }
  " "$VERSION"
  echo "Version set to $VERSION in package.json and app.json."
fi

CURRENT="$(node -p "require('./app.json').expo.version")"
echo "Building and submitting Mera Coach $CURRENT to Google Play (internal testing)..."

# --auto-submit sends the finished bundle to the track in eas.json (submit.production.android.track).
bunx eas-cli build --platform android --profile production --auto-submit --non-interactive

echo "Done. The release appears under Test and release > Internal testing in Play Console."
if [[ -n "$VERSION" ]]; then
  echo "Remember to commit the version bump: git add package.json app.json && git commit -m 'Release $VERSION'"
fi
