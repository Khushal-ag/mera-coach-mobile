# Releasing Mera Coach

Production path: **GitHub → CI checks → EAS Android APK → GitHub Release**.

iOS store / TestFlight builds are **not** part of the release pipeline yet (no Apple Developer account). The app still runs on the iOS Simulator / Expo Go for development.

## Versioning

Keep these in sync for every public release:

| Location       | Field          | Example  |
| -------------- | -------------- | -------- |
| `package.json` | `version`      | `1.0.0`  |
| `app.json`     | `expo.version` | `1.0.0`  |
| Git tag        | `vX.Y.Z`       | `v1.0.0` |

Native store build numbers:

- **Android** `versionCode` (and **iOS** `buildNumber` when iOS shipping resumes) in `app.json` are starting values.
- EAS profile `production` / `production-apk` sets `autoIncrement: true` with `cli.appVersionSource: "remote"`, so EAS bumps remote build numbers on each cloud build.

Use **semver**:

- **MAJOR** — breaking product / API contract changes for coaches
- **MINOR** — new features (backward compatible)
- **PATCH** — fixes and small polish

## One command to Play (internal testing)

```bash
bun run ship:android            # build and send the current version
bun run ship:android 1.0.2      # bump package.json + app.json to 1.0.2 first
```

This runs `eas build --platform android --profile production --auto-submit`. EAS builds the bundle, raises the Android `versionCode` itself (`autoIncrement`), and uploads it to the track in `eas.json` (`submit.production.android.track`, set to `internal`). Nothing is downloaded or uploaded by hand. Commit the version bump afterwards.

The track is fixed to `internal` in `eas.json`, so this command cannot reach production by accident. To promote a tested build, use **Promote release** in Play Console, or run a one-off `eas submit --platform android --profile production --track production`.

### One-time setup: Google Play service account key

EAS needs permission to upload on your behalf. This is how it knows which Play account to use.

1. Google Cloud Console: create or pick a project, enable **Google Play Android Developer API**.
2. IAM & Admin, Service accounts: create a service account, then Keys, Add key, JSON. Download the file.
3. Play Console, **Users and permissions**, invite the service account email. Give it access to Mera Coach with the **Release to testing tracks** permission (plus **Release apps to production** only if you later want to automate that). Play can take up to a day to activate it.
4. Upload the key to EAS once, so it never lives in the repo: `bunx eas-cli credentials`, then Android, production, **Google Service Account**, **Manage your Google Service Account Key for Play Store Submissions**, upload the JSON. Delete the local copy afterwards.

Run `bun run ship:android` once Play has activated the account. If the first run says the service account has no access, wait and retry.

Play must already have an upload of this app (it does). The first-ever upload of a new app cannot be automated.

The GitHub Release APK flow below is separate. A sideloaded APK does not get the in-app update prompt.

## EAS profiles (`eas.json`)

| Profile          | Purpose                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| `development`    | Dev client, internal                                                   |
| `preview`        | Internal channel; Android **APK**                                      |
| `production`     | Store builds (Android **AAB** by default; iOS when credentials exist)  |
| `production-apk` | Extends `production` with Android **APK** for GitHub Release downloads |

Release CI always uses `production-apk` on **Android only**.

## Secrets & env

### GitHub Actions

| Secret       | Required for     | Purpose                                                                                      |
| ------------ | ---------------- | -------------------------------------------------------------------------------------------- |
| `EXPO_TOKEN` | Release workflow | Authenticates EAS CLI (`eas build`). Create at [expo.dev](https://expo.dev) → Access tokens. |

`GITHUB_TOKEN` is provided automatically for creating/updating Releases.

### EAS project env (build-time)

Set on the Expo project (EAS Secrets / environment for production), **not** in the repo:

| Variable                            | Required | Purpose                                                                                            |
| ----------------------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_BASE_URL`          | Yes      | API + `/document` media host (must not be localhost for store/GitHub builds)                       |
| `EXPO_PUBLIC_WEB_BASE_URL`          | No       | Public site for feedback SMS links (defaults to `https://mera-coach.com` in app code)              |
| `EXPO_PUBLIC_PAYMENT_URL`           | No       | Pay Now website checkout (defaults to `{WEB_BASE_URL}/premium`; coach id is appended)              |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL`    | No       | Hosted privacy URL for store listings                                                              |
| `EXPO_PUBLIC_SUBSCRIPTION_REQUIRED` | No       | `yes`, `true`, or `1` blocks unpaid coaches from Add Client. Off for `no`, `false`, `0`, or unset. |

Also complete once:

1. `eas login` and `eas init` (writes `extra.eas.projectId` into `app.json`).
2. Android keystore via EAS credentials (or local `eas credentials`). Apple credentials only when an Apple Developer account is available.

## Cut a release

One-command path (preferred): after versions match on a clean `main` that is pushed to origin:

```bash
bun run release
# or: ./scripts/release.sh
# bump + commit + push main + tag: ./scripts/release.sh --bump X.Y.Z
```

The script validates `package.json` / `app.json` versions, creates annotated tag `vX.Y.Z`, and pushes it to trigger the Release workflow (Android APK only). Requires `EXPO_TOKEN` as a GitHub Actions secret. See `./scripts/release.sh --help`.

Manual path:

1. Ensure `main` is green (CI workflow).
2. Bump `package.json` `version` and `app.json` `expo.version` to the same `X.Y.Z`.
3. Commit on `main`.
4. Tag and push:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Or, after the tag exists on the remote, run **Actions → Release → Run workflow** with that tag. Manual dispatch does **not** create tags (avoids double-triggering).

5. The Release workflow:
   - Re-runs typecheck, lint, tests
   - Builds Android with `production-apk` and attaches the APK to the GitHub Release

## Android-only build (local)

```bash
eas build --platform android --profile production-apk
```

## Store submit (manual after EAS build)

```bash
eas submit --platform android --profile production
```

Requires a Play Console listing (privacy URL, screenshots, content rating, etc.).

iOS submit (`eas submit --platform ios`) is deferred until an Apple Developer account and App Store Connect listing exist.

## Release notes

The workflow writes a structured body (version table, Android download notes, recent commits). For a custom blurb, edit the GitHub Release after publish, or start from `.github/release-template.md`.

## In-app update prompt

Profile shows an "Update available" card (and a dot on the Profile tab) when the store has a newer version. It uses `expo-in-app-updates`:

- **Android:** Google Play in-app updates. Only answers for installs that came from Google Play. A sideloaded APK from GitHub Releases never sees a prompt, because Play does not know about it.
- **iOS:** looks the app up in the App Store. Set `ios.infoPlist.AppStoreID` in `app.json` once the listing exists (optional, saves a lookup).
- Publishing a new version to the store is all that is needed. There is nothing to configure in the API.
- The card also shows "Update ready, Restart now" when an over-the-air JavaScript update has been downloaded (`expo-updates`, production channel).

`expo-in-app-updates` is a **native module**. The first build that contains it must be a new store build with a bumped version (for example 1.0.1). Because `runtimeVersion` follows `appVersion`, do not publish an OTA update from this code to installs of 1.0.0. The app loads the module defensively, so an older build without it keeps working and just never shows the card.

To test on Android:

1. Release a build that contains the module to Internal testing (for example `1.0.1`, versionCode 15) and install it on a phone **from the Play Store link**, signed in with a tester account.
2. Upload a newer build (for example `1.0.2`, versionCode 16) to the same track.
3. Open the installed app and go to Profile. The card and the Profile tab dot appear once Play has the new version. Play can take from a few minutes to a few hours to tell the phone; opening the Play Store app and pulling to refresh can speed it up.

The update flow is Play's own overlay. It will not appear on emulators without Google Play, on sideloaded APKs, or on the same version code that is already installed.
