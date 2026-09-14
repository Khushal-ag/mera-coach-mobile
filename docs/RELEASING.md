# Releasing Mera Coach

Production path: **GitHub → CI checks → EAS production build → GitHub Release**.

## Versioning

Keep these in sync for every public release:

| Location       | Field          | Example  |
| -------------- | -------------- | -------- |
| `package.json` | `version`      | `1.0.0`  |
| `app.json`     | `expo.version` | `1.0.0`  |
| Git tag        | `vX.Y.Z`       | `v1.0.0` |

Native store build numbers:

- **Android** `versionCode` and **iOS** `buildNumber` in `app.json` are starting values.
- EAS profile `production` / `production-apk` sets `autoIncrement: true` with `cli.appVersionSource: "remote"`, so EAS bumps remote build numbers on each cloud build.

Use **semver**:

- **MAJOR** — breaking product / API contract changes for coaches
- **MINOR** — new features (backward compatible)
- **PATCH** — fixes and small polish

## EAS profiles (`eas.json`)

| Profile          | Purpose                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `development`    | Dev client, internal                                                    |
| `preview`        | Internal channel; Android **APK**                                       |
| `production`     | Store builds (Android **AAB** by default, iOS store IPA) + `eas submit` |
| `production-apk` | Extends `production` with Android **APK** for GitHub Release downloads  |

## Secrets & env

### GitHub Actions

| Secret       | Required for     | Purpose                                                                                      |
| ------------ | ---------------- | -------------------------------------------------------------------------------------------- |
| `EXPO_TOKEN` | Release workflow | Authenticates EAS CLI (`eas build`). Create at [expo.dev](https://expo.dev) → Access tokens. |

`GITHUB_TOKEN` is provided automatically for creating/updating Releases.

### EAS project env (build-time)

Set on the Expo project (EAS Secrets / environment for production), **not** in the repo:

| Variable                         | Required | Purpose                                                                               |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_BASE_URL`       | Yes      | API + `/document` media host (must not be localhost for store/GitHub builds)          |
| `EXPO_PUBLIC_WEB_BASE_URL`       | No       | Public site for feedback SMS links (defaults to `https://mera-coach.com` in app code) |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | No       | Hosted privacy URL for store listings                                                 |

Also complete once:

1. `eas login` and `eas init` (writes `extra.eas.projectId` into `app.json`).
2. Android keystore + Apple credentials via EAS credentials (or local `eas credentials`).

## Cut a release

1. Ensure `main` is green (CI workflow).
2. Bump `package.json` `version` and `app.json` `expo.version` to the same `X.Y.Z`.
3. Commit on `main`.
4. Tag and push:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Or, after the tag exists on the remote, run **Actions → Release → Run workflow** with that tag and a platform choice (`android` / `ios` / `all`). Manual dispatch does **not** create tags (avoids double-triggering).

5. The Release workflow:
   - Re-runs typecheck, lint, tests
   - Builds Android with `production-apk` (when selected) and attaches the APK to the GitHub Release
   - Optionally builds iOS with `production` (TestFlight / App Store path — IPA is **not** attached for sideloading)

## Store submit (manual after EAS build)

```bash
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

Requires Play Console / App Store Connect listings (privacy URL, screenshots, content rating, etc.).

## Release notes

The workflow writes a structured body (version table, download notes, recent commits). For a custom blurb, edit the GitHub Release after publish, or start from `.github/release-template.md`.
