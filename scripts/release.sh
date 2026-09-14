#!/usr/bin/env bash
# Tag-and-push release for Mera Coach (CI builds Android APK via GitHub Actions).
# iOS is not part of the release pipeline yet (no Apple Developer account).
# Usage:
#   bun run release
#   ./scripts/release.sh
#   ./scripts/release.sh --bump 1.0.1
#   ./scripts/release.sh 1.0.1          # same as --bump
#   ./scripts/release.sh --allow-branch
#   ./scripts/release.sh --local-apk    # optional: also run eas build (Android) locally
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ALLOW_BRANCH=0
LOCAL_APK=0
BUMP_VERSION=""

usage() {
  cat <<'USAGE'
Usage: ./scripts/release.sh [options] [X.Y.Z]

Default: validate versions, then create and push annotated tag vX.Y.Z
from the current package.json / app.json version (must already match).

Options:
  --bump X.Y.Z     Update package.json + app.json, commit, push main, then tag
  X.Y.Z            Same as --bump X.Y.Z
  --allow-branch   Allow releasing from a branch other than main
  --local-apk      After pushing the tag, also run: eas build -p android --profile production-apk
  -h, --help       Show this help

Requires: clean working tree, main in sync with origin (unless --allow-branch),
and EXPO_TOKEN set as a GitHub Actions secret for the Release workflow
(Android APK only).
USAGE
}

die() {
  echo "error: $*" >&2
  exit 1
}

is_semver() {
  [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
}

read_pkg_version() {
  # Prefer node/bun if present; fall back to sed
  if command -v node >/dev/null 2>&1; then
    node -e "console.log(require('./package.json').version)"
  elif command -v bun >/dev/null 2>&1; then
    bun -e "console.log(require('./package.json').version)"
  else
    sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' package.json | head -1
  fi
}

read_app_version() {
  if command -v node >/dev/null 2>&1; then
    node -e "console.log(require('./app.json').expo.version)"
  elif command -v bun >/dev/null 2>&1; then
    bun -e "console.log(require('./app.json').expo.version)"
  else
    # app.json nests version under expo; match the first "version" under expo block
    awk '
      /"expo"[[:space:]]*:/ { in_expo=1 }
      in_expo && /"version"[[:space:]]*:/ {
        if (match($0, /"version"[[:space:]]*:[[:space:]]*"([^"]+)"/, m)) { print m[1]; exit }
      }
    ' app.json
  fi
}

set_pkg_version() {
  local ver="$1"
  if command -v node >/dev/null 2>&1; then
    node -e "
      const fs=require('fs');
      const p=JSON.parse(fs.readFileSync('package.json','utf8'));
      p.version=process.argv[1];
      fs.writeFileSync('package.json', JSON.stringify(p,null,2)+'\n');
    " "$ver"
  elif command -v bun >/dev/null 2>&1; then
    bun -e "
      const fs=require('fs');
      const p=JSON.parse(fs.readFileSync('package.json','utf8'));
      p.version=process.argv[1];
      fs.writeFileSync('package.json', JSON.stringify(p,null,2)+'\n');
    " "$ver"
  else
    die "need node or bun to bump package.json version"
  fi
}

set_app_version() {
  local ver="$1"
  if command -v node >/dev/null 2>&1; then
    node -e "
      const fs=require('fs');
      const p=JSON.parse(fs.readFileSync('app.json','utf8'));
      if (!p.expo) throw new Error('app.json missing expo');
      p.expo.version=process.argv[1];
      fs.writeFileSync('app.json', JSON.stringify(p,null,2)+'\n');
    " "$ver"
  elif command -v bun >/dev/null 2>&1; then
    bun -e "
      const fs=require('fs');
      const p=JSON.parse(fs.readFileSync('app.json','utf8'));
      if (!p.expo) throw new Error('app.json missing expo');
      p.expo.version=process.argv[1];
      fs.writeFileSync('app.json', JSON.stringify(p,null,2)+'\n');
    " "$ver"
  else
    die "need node or bun to bump app.json version"
  fi
}

github_repo_web() {
  local url
  url="$(git remote get-url origin 2>/dev/null || true)"
  # git@github.com:owner/repo.git or https://github.com/owner/repo.git
  url="${url%.git}"
  url="${url#git@github.com:}"
  url="${url#https://github.com/}"
  url="${url#ssh://git@github.com/}"
  echo "https://github.com/${url}"
}

# --- parse args ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --allow-branch)
      ALLOW_BRANCH=1
      shift
      ;;
    --local-apk)
      LOCAL_APK=1
      shift
      ;;
    --bump)
      shift
      [[ $# -gt 0 ]] || die "--bump requires X.Y.Z"
      BUMP_VERSION="$1"
      shift
      ;;
    -*)
      die "unknown option: $1 (try --help)"
      ;;
    *)
      if is_semver "$1"; then
        BUMP_VERSION="$1"
        shift
      else
        die "unexpected argument: $1 (expected semver X.Y.Z)"
      fi
      ;;
  esac
done

if [[ -n "$BUMP_VERSION" ]] && ! is_semver "$BUMP_VERSION"; then
  die "version must be semver X.Y.Z (got: $BUMP_VERSION)"
fi

# --- preflight ---
command -v git >/dev/null 2>&1 || die "git is required"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" != "main" && "$ALLOW_BRANCH" -eq 0 ]]; then
  die "must be on main (currently: $BRANCH). Re-run with --allow-branch to override."
fi

if [[ -n "$(git status --porcelain)" ]]; then
  die "working tree is dirty. Commit or stash changes before releasing."
fi

echo "Fetching origin..."
git fetch origin --tags --quiet

# Ensure branch tracks remote and is not ahead/behind
if [[ "$BRANCH" == "main" ]] || [[ "$ALLOW_BRANCH" -eq 0 ]]; then
  UPSTREAM="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
  if [[ -z "$UPSTREAM" ]]; then
    die "no upstream for $BRANCH. Push main first: git push -u origin main"
  fi
  LOCAL="$(git rev-parse HEAD)"
  REMOTE="$(git rev-parse '@{u}')"
  BASE="$(git merge-base HEAD '@{u}')"
  if [[ "$LOCAL" != "$REMOTE" ]]; then
    if [[ "$LOCAL" == "$BASE" ]]; then
      die "branch is behind $UPSTREAM. Pull (or rebase) before releasing."
    elif [[ "$REMOTE" == "$BASE" ]]; then
      die "branch is ahead of $UPSTREAM. Push main first: git push origin $BRANCH"
    else
      die "branch and $UPSTREAM have diverged. Sync before releasing."
    fi
  fi
fi

# --- optional bump ---
if [[ -n "$BUMP_VERSION" ]]; then
  echo "Bumping version to $BUMP_VERSION..."
  set_pkg_version "$BUMP_VERSION"
  set_app_version "$BUMP_VERSION"
  git add package.json app.json
  git commit -m "chore: release v${BUMP_VERSION}"
  echo "Pushing $BRANCH..."
  git push origin "$BRANCH"
fi

# --- validate versions match ---
PKG_VER="$(read_pkg_version)"
APP_VER="$(read_app_version)"

[[ -n "$PKG_VER" ]] || die "could not read package.json version"
[[ -n "$APP_VER" ]] || die "could not read app.json expo.version"

if [[ "$PKG_VER" != "$APP_VER" ]]; then
  die "version mismatch: package.json=$PKG_VER app.json expo.version=$APP_VER (they must match)"
fi

if ! is_semver "$PKG_VER"; then
  die "version must be semver X.Y.Z (got: $PKG_VER)"
fi

TAG="v${PKG_VER}"
REPO_WEB="$(github_repo_web)"

# --- tag ---
if git rev-parse "$TAG" >/dev/null 2>&1; then
  # Tag exists locally — ensure it points at HEAD or refuse
  TAG_COMMIT="$(git rev-parse "$TAG^{}")"
  HEAD_COMMIT="$(git rev-parse HEAD)"
  if [[ "$TAG_COMMIT" != "$HEAD_COMMIT" ]]; then
    die "tag $TAG already exists but points to a different commit"
  fi
  echo "Tag $TAG already exists locally (same commit)."
else
  echo "Creating annotated tag $TAG..."
  git tag -a "$TAG" -m "Release $TAG"
fi

# Check remote tag
if git ls-remote --exit-code --tags origin "refs/tags/$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG already on origin."
else
  echo "Pushing tag $TAG to origin (triggers Release workflow)..."
  git push origin "$TAG"
fi

if [[ "$LOCAL_APK" -eq 1 ]]; then
  if ! command -v eas >/dev/null 2>&1; then
    die "--local-apk requires eas-cli (npx eas-cli or npm i -g eas-cli)"
  fi
  echo "Running local EAS Android APK build (production-apk)..."
  eas build -p android --profile production-apk --non-interactive
fi

cat <<OUT

Release $TAG pushed (Android APK via Release workflow).

Next:
  • Actions (Release workflow): ${REPO_WEB}/actions/workflows/release.yml
  • Releases page:             ${REPO_WEB}/releases

Reminder: GitHub Actions needs the EXPO_TOKEN secret set for EAS Android builds
(expo.dev → Access tokens → repo Settings → Secrets → Actions).

OUT
