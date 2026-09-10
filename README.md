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

| Variable                         | Required | Purpose                                                                   |
| -------------------------------- | -------- | ------------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_BASE_URL`       | Yes      | API base URL                                                              |
| `EXPO_PUBLIC_WEB_BASE_URL`       | No       | Public site for feedback SMS links (defaults to `https://mera-coach.com`) |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | No       | Privacy policy URL (e.g. Play Console)                                    |
| `EXPO_PUBLIC_USE_MVP_MOCKS`      | No       | Demo packages / events / gallery when API is empty (default `true`)       |

See `.env.example`. For EAS production builds, set these as EAS secrets.

### MVP demo mocks

With `EXPO_PUBLIC_USE_MVP_MOCKS` enabled (default when unset), the app seeds sample packages / events / gallery and saves edits to on-device storage so Edit Packages / Events / Gallery and the public profile stay in sync for UI review. Set `EXPO_PUBLIC_USE_MVP_MOCKS=false` to show empty sections when the API returns none. Restart Expo after changing the flag.

## Scripts

| Script                      | Description              |
| --------------------------- | ------------------------ |
| `bun start`                 | Expo dev server          |
| `bun run ios` / `android`   | Native run               |
| `bun run web`               | Expo web                 |
| `bun run lint`              | ESLint                   |
| `bun test`                  | Jest (`src/__tests__`)   |
| `bun run fmt` / `fmt:check` | Prettier                 |
| `bun run doctor`            | `expo-doctor`            |
| `bun run prebuild`          | Generate native projects |

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
  data/         Static content + MVP demo mocks
  screens/      App screens
  navigation/   React Navigation trees
  utils/        Validation, BMI, SMS, parsers
```
