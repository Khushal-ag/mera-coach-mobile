<div align="center">

<img src="assets/brand/logo-full.png" width="240" height="194" alt="Mera Coach — Guide · Support · Transform" />

# Mera Coach

**Get found by clients. Run the practice that follows.**

Visitors discover coaches and reach out.<br />
Coaches manage clients, deliver assessments, and keep the public listing that brings leads in.

[![Latest Release][badge-latest-release]][release-latest]
&nbsp;
[![Website][badge-website]][website]
&nbsp;
[![Releases][badge-releases]][releases]

[![CI][badge-ci]][actions-ci]
[![Release][badge-release-version]][releases]
![Android][badge-platforms]

<br />

<img src="docs/screenshots/dashboard.png" width="400" alt="Coach dashboard — clients, leads, due checkups, and Add Client" />

<sub><b>Dashboard</b> — the practice at a glance</sub>

</div>

---

## One place for the coaching journey

|        | Journey            | What happens                                                                       |
| ------ | ------------------ | ---------------------------------------------------------------------------------- |
| **01** | **Discover**       | Marketing hero, then explore — banner, categories, features, Check Your BMI — no sign-in required |
| **02** | **Convert**        | Enquiry & BMI lead forms; WhatsApp when the coach has shared a number                                |
| **03** | **Manage**         | Tabs: Dashboard, Packages, Events, Profile. Clients, leads, and due checkups sit under Dashboard    |
| **04** | **Deliver**        | Assessment wizard → BMI report & multi-meal diet · PDF share · feedback SMS                          |
| **05** | **Build presence** | Packages, Events, and Photo gallery each open a list; add or create is its own screen               |

Mobile app for [mera-coach.com][website] · Expo · Android releases now (iOS later) · API via `EXPO_PUBLIC_API_BASE_URL` (photos & PDFs on the same host)

---

## Product showcase

### Discover

<table>
  <tr>
    <td align="center" width="50%">
      <img src="docs/screenshots/explore.png" width="340" alt="Explore — coaching categories, features, and a BMI check" />
      <br />
      <sub><b>Explore</b><br />Second home page — banner, categories, features, Check Your BMI</sub>
    </td>
    <td align="center" width="50%">
      <img src="docs/screenshots/find-coach.png" width="340" alt="Find Your Coach — search, city and rating filters, and coach result cards" />
      <br />
      <sub><b>Find a Coach</b><br />Search, city, and rating. Circle pages stay up even on one page</sub>
    </td>
  </tr>
</table>

### Manage

<div align="center">
  <img src="docs/screenshots/client-detail.png" width="360" alt="Client detail with body metrics, goals, and checkup, BMI, diet, and feedback actions" />
  <br />
  <sub><b>Client detail</b><br />One client — metrics, goals, next actions</sub>
</div>

### Deliver

<div align="center">
  <img src="docs/screenshots/bmi-report.png" width="360" alt="BMI report with body composition summary, goal progress, history, and PDF download" />
  <br />
  <sub><b>BMI report</b><br />Assessment made shareable — composition, history, PDF</sub>
</div>

### Build presence

<div align="center">
  <img src="docs/screenshots/profile.png" width="360" alt="Profile — coach summary, with Photo gallery, Packages, and Events" />
  <br />
  <sub><b>Profile</b><br />Account hub. Photo gallery, Packages, and Events each start as a list</sub>
</div>

<p align="center"><sub>iOS Simulator · light mode</sub></p>

---

## How it works

1. **Explore & find** — Open the app as a visitor. Home is two pages: a marketing hero (Get Started, Find a Coach), then explore — banner, coach categories from the API, features, and Check Your BMI. Find a Coach filters by search, city, and rating.
2. **Reach out** — Send an enquiry from a coach’s public page, or a BMI lead from Check Your BMI. Open WhatsApp when a mobile number is available. The profile shows one photo; side arrows move between coaches in the browse list.
3. **Coach sign-in** — Register or log in. On return, unlock with MPIN. Land on Dashboard.
4. **Run the practice** — Signed-in tabs are Dashboard, Packages, Events, and Profile. Dashboard tracks clients, enquiry leads, and due checkups. Add a client to start an assessment.
5. **Assess & deliver** — Body stats → lifestyle → goals → BMI → multi-meal diet. Share BMI and diet PDFs. Ask for feedback via SMS (links to the site).
6. **Shape the listing** — Packages, Events, and Photo gallery open a list first. Add or create (Package Creation, Add Event, Add Gallery) is a separate screen with a back button.

---

## Features

| Area                      | What you get                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Discovery**             | Two-page public home · categories from the API · Check Your BMI · Find a Coach (city, rating, search) without signing in |
| **Practice hub**          | Tabs: Dashboard, Packages, Events, Profile · clients, leads, checkups due                                              |
| **Assessment & delivery** | Add-client wizard · BMI report with history · multi-meal diet plan · PDF download & share · feedback SMS               |
| **Public presence**       | One coach photo, arrows through the browse list · gallery, packages, and events as lists · enquiry & BMI leads · WhatsApp when available |
| **Account**               | Coach register / login · MPIN · password change · privacy & terms · support via `hello@mera-coach.com`   |

---

## Why Mera Coach

- **Discovery and delivery share one product** — visitors browse; coaches work the same app after sign-in.
- **Assessment that finishes the job** — body stats through BMI and diet, with PDFs coaches can share.
- **A listing that brings work in** — Packages, Events, and Photo gallery are lists you add to; enquiries and WhatsApp close the loop.
- **Thoughtful mobile UX** — Montserrat headings, Poppins body text, teal, terracotta, and mint, wave header on in-app screens (Dashboard uses its own header)

---

## Design

| Role      | Token        | Value     |
| --------- | ------------ | --------- |
| Primary   | `primary`    | `#d05c26` |
| Secondary | `secondary`  | `#178676` |
| Accent    | `accent`     | `#e8a317` |
| Surface   | `background` | `#f5f7f5` |

Primary is terracotta, secondary is teal, and the surface is mint. Those names and the hex values are `Colors` in `src/constants/theme.ts`.

**Type** — Montserrat headings (`headingFont`) · Poppins body text (`bodyFont`)

**Chrome** — In-app screens use the wave header: back when the screen is pushed, title, and home. Tab roots (Packages, Events, Profile) have title and home, no back. Dashboard does not use the wave header.

**Lists** — Find a Coach uses a circle page control and keeps it visible even on one page. Client, lead, checkup, event, and package lists use a square page control.

**System** — Shared components (`AppButton`, `EmptyState`, `ReloadState`, `StickyFooter`, `WaveScreenHeader`) · 44pt touch targets · empty / error / reload states · sticky footers for primary CTAs · accessibility labels on interactive controls

**Tokens** — `src/constants/theme.ts` · light UI only (`userInterfaceStyle: light`)

---

## Download Mera Coach

| Channel                         | What you get                                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **[GitHub Releases][releases]** | Android **APK** after a tag `vX.Y.Z` and a successful [Release][workflow-release] run — none published yet |
| **iOS**                         | Not distributed yet (Apple Developer account required). Simulator / Expo Go still work for development     |
| Google Play                     | Not linked here yet — use `eas submit --platform android` when a Play listing is ready                     |

Prefer Releases APK assets or the official Play listing once published. No fabricated store URLs.

<div align="center">

[![Android APK via Releases][badge-apk]][releases]

</div>

---

## Tech

| Layer      | Choice                                                      |
| ---------- | ----------------------------------------------------------- |
| App        | Expo 57 · React Native 0.86 · React 19 · TypeScript         |
| Navigation | React Navigation (native stack + bottom tabs)               |
| Data       | TanStack Query · typed API modules under `src/api/`         |
| Session    | `expo-secure-store`                                         |
| Media      | Image picker · document upload · PDF share (`expo-sharing`) |
| Build      | EAS Build · Bun                                             |
| Quality    | ESLint · Prettier · Jest (`jest-expo`)                      |

### Architecture

```mermaid
flowchart LR
  subgraph visitors [Visitors]
    Hero[Marketing hero] --> Explore
    Hero --> FindCoach[Find a Coach]
    Explore --> FindCoach
    Explore --> Bmi[Check Your BMI]
    FindCoach --> PublicPage[Coach profile]
    PublicPage --> Leads[Enquiry / BMI lead]
  end
  subgraph coaches [Coaches]
    Auth[Login / Register / MPIN] --> Tabs["Dashboard · Packages · Events · Profile"]
    Tabs --> Clients
    Tabs --> Listing["Gallery · Packages · Events lists"]
    Clients --> Assess[Assessment · BMI · Diet · PDF]
  end
  App[Mera Coach app] --> API["REST API + /document"]
  Explore -.-> App
  Auth -.-> App
```

<details>
<summary><b>Project layout</b></summary>

```
src/
  api/           HTTP client & domain APIs
  auth/          Session (SecureStore)
  components/    Shared UI
  navigation/    Root stack + tabs (Dashboard, Packages, Events, Profile)
  screens/       home, auth, dashboard, clients, checkups, profile, publicCoach, addClient
assets/brand/    Logo mark, wordmark, full lockup
docs/            RELEASING.md · screenshots/
```

</details>

---

## Quick start

**Need:** Bun (or Node 20+) · Expo Go or iOS / Android simulator

```bash
git clone https://github.com/Khushal-ag/mera-coach-mobile.git
cd mera-coach-mobile
bun install
cp .env.example .env   # set EXPO_PUBLIC_API_BASE_URL
bun start              # then i / a / Expo Go QR
```

| Variable                         | Required | Purpose                                              |
| -------------------------------- | -------- | ---------------------------------------------------- |
| `EXPO_PUBLIC_API_BASE_URL`       | Yes      | REST + `/document` media                             |
| `EXPO_PUBLIC_WEB_BASE_URL`       | No       | Feedback SMS site (default `https://mera-coach.com`) |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | No       | Store listing privacy URL                            |

Never commit real `.env` values. Support: `hello@mera-coach.com`

<details>
<summary><b>Scripts</b></summary>

| Command                                           | Description     |
| ------------------------------------------------- | --------------- |
| `bun start`                                       | Expo dev server |
| `bun run ios` / `bun run android`                 | Native run      |
| `bun run typecheck` · `bun run lint` · `bun test` | CI checks       |
| `bun run fmt`                                     | Prettier        |
| `bun run doctor`                                  | `expo-doctor`   |

</details>

---

## Releases

Production path: **tag `vX.Y.Z` → CI checks → EAS Android APK → GitHub Release**.

- Version rule: `package.json` = `app.json` `expo.version` = tag `vX.Y.Z`
- Android: `production-apk` → APK on the GitHub Release
- iOS distribution: deferred until an Apple Developer account exists
- Full guide: [`docs/RELEASING.md`][doc-releasing]

<details>
<summary><b>EAS builds (local)</b></summary>

```bash
eas login
eas build --profile preview --platform android        # internal APK
eas build --profile production --platform android     # store AAB
eas build --profile production-apk --platform android # GitHub APK
```

</details>

---

## Contributing

See [`CONTRIBUTING.md`][doc-contributing]. Keep PRs focused; run typecheck, lint, and tests before opening.

---

## License

MIT — see [`LICENSE`][doc-license].

---

<div align="center">

<img src="assets/brand/logo-mark.png" width="64" height="65" alt="Mera Coach mark" />

<sub>Built for coaches on [mera-coach.com][website]</sub>

</div>

<!-- Link & asset references -->

<!-- Brand / logos (hero/footer use HTML <img width/height>; refs kept for reuse) -->

[logo-full]: assets/brand/logo-full.png
[logo-mark]: assets/brand/logo-mark.png

<!-- Screenshots (paths; showcase uses HTML <img width> for sizing on GitHub) -->

[shot-explore]: docs/screenshots/explore.png
[shot-find-coach]: docs/screenshots/find-coach.png
[shot-dashboard]: docs/screenshots/dashboard.png
[shot-client-detail]: docs/screenshots/client-detail.png
[shot-bmi-report]: docs/screenshots/bmi-report.png
[shot-profile]: docs/screenshots/profile.png

<!-- Product / web -->

[website]: https://mera-coach.com

<!-- Badges -->

[badge-latest-release]: https://img.shields.io/badge/Latest_Release-Download-1b4332?style=for-the-badge
[badge-website]: https://img.shields.io/badge/Website-mera--coach.com-c04b2b?style=for-the-badge
[badge-releases]: https://img.shields.io/badge/Releases-All_builds-c9882a?style=for-the-badge
[badge-ci]: https://github.com/Khushal-ag/mera-coach-mobile/actions/workflows/ci.yml/badge.svg
[badge-release-version]: https://img.shields.io/github/v/release/Khushal-ag/mera-coach-mobile?include_prereleases&label=release
[badge-platforms]: https://img.shields.io/badge/Android-lightgrey
[badge-apk]: https://img.shields.io/badge/Android_APK-via_GitHub_Releases-1b4332?style=for-the-badge

<!-- GitHub (repo, releases, issues, actions) -->

[release-latest]: https://github.com/Khushal-ag/mera-coach-mobile/releases/latest
[releases]: https://github.com/Khushal-ag/mera-coach-mobile/releases
[actions-ci]: https://github.com/Khushal-ag/mera-coach-mobile/actions/workflows/ci.yml

<!-- Docs -->

[workflow-release]: .github/workflows/release.yml
[doc-releasing]: docs/RELEASING.md
[doc-contributing]: CONTRIBUTING.md
[doc-license]: LICENSE
