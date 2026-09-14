# Mera Coach

Coach mobile app for [Mera Coach](https://mera-coach.com) — Expo / React Native (iOS & Android).

Coaches can manage clients, run BMI checkups, generate diet plans, and maintain a public profile. Prospective clients can browse coaches and send enquiries without signing in.

## Stack

- Expo SDK 57, React Native, TypeScript
- React Navigation, TanStack Query
- Bun (preferred) or npm

## Setup

```bash
bun install          # or: npm install
cp .env.example .env # edit values as needed
bun start            # or: npm start
```

Then press `i` / `a` for iOS / Android simulator, or scan the QR code with Expo Go.

Native builds (dev client / store):

```bash
bun run ios
bun run android
# or: bun run prebuild
```

## Environment

| Variable                         | Required | Purpose                                        |
| -------------------------------- | -------- | ---------------------------------------------- |
| `EXPO_PUBLIC_API_BASE_URL`       | Yes      | API base URL (including Document + image URLs) |
| `EXPO_PUBLIC_WEB_BASE_URL`       | No       | Public site for feedback SMS links             |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | No       | Privacy policy URL (e.g. Play Console)         |

Photos (gallery, logo, profile, progress, packages, events) upload and resolve against the same `EXPO_PUBLIC_API_BASE_URL` host (`/document/...` under that API’s wwwroot). For cloud images, point `API_BASE` at the deployed Azure API. A local API serves its own local wwwroot unless the API is configured for shared storage.

See `.env.example` for variable names. For EAS production builds, set these as EAS secrets / project env (do **not** leave `EXPO_PUBLIC_API_BASE_URL` pointing at localhost).

### MVP persistence (API)

Requires API DB scripts:

- `AlterTable_MstCoach_AddReferrerPackagesEvents.sql` — `ReferrerMobile`, `PackagesJson`, `EventsJson`
- `CreateTable_ClientFeedback.sql` — feedback from the web form

Feedback SMS opens `{EXPO_PUBLIC_WEB_BASE_URL}/feedback?coachCode=&clientCode=` (web page + `POST /v1/Coach/feedback`).

## Scripts

| Script                      | Description                 |
| --------------------------- | --------------------------- |
| `bun start`                 | Expo dev server             |
| `bun run ios` / `android`   | Native run                  |
| `bun run web`               | Expo web                    |
| `bun run lint`              | ESLint                      |
| `bun run typecheck`         | TypeScript (`tsc --noEmit`) |
| `bun test`                  | Jest (`src/__tests__`)      |
| `bun run fmt` / `fmt:check` | Prettier                    |
| `bun run doctor`            | `expo-doctor`               |
| `bun run prebuild`          | Generate native projects    |

## Publishing (EAS)

1. `eas login` then `eas init` (writes `extra.eas.projectId` into `app.json`).
2. Set EAS secrets for the production profile: `EXPO_PUBLIC_API_BASE_URL` (Azure API), optionally `EXPO_PUBLIC_WEB_BASE_URL` and `EXPO_PUBLIC_PRIVACY_POLICY_URL`.
3. Internal / TestFlight-style: `eas build --profile preview` (Android APK) or `eas build --profile production --platform ios`.
4. Store submit: `eas submit --profile production` after Apple / Play credentials and listings (privacy URL, screenshots, content rating) are ready.

`ios.config.usesNonExemptEncryption` is `false` (HTTPS-only). Production `autoIncrement` bumps remote build numbers.

## Features

**Public (unauthenticated)**

- Browse coaches by category / location
- Coach public profile (bio, gallery, packages, events when returned by the API)
- Enquiry and BMI lead forms

**Coach (signed in)**

- Dashboard, leads, clients, due checkups
- Add / edit clients, BMI assessments & reports, diet plans & PDFs
- Edit profile (photo, logo, services, address)
- Manage photo gallery, packages, and events from Profile (separate screens)
- Request client feedback via SMS (opens the native SMS app with a web feedback link)

## Project layout

```
src/
  api/          HTTP client + endpoint modules
  auth/         Secure session storage
  components/   Shared UI
  data/         Static content
  screens/      App screens
  navigation/   React Navigation trees
  utils/        Validation, BMI, SMS, parsers
```
