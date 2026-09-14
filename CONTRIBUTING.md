# Contributing

Thanks for helping improve **Mera Coach** (Expo / React Native coach app).

## Setup

```bash
bun install          # or: npm install
cp .env.example .env # set EXPO_PUBLIC_API_BASE_URL at minimum
bun start
```

See the root [README](README.md) for environment variables, scripts, and architecture.

## Before you open a PR

1. Keep changes focused — avoid unrelated refactors.
2. Run:

```bash
bun run typecheck
bun run lint
bun test
```

3. Use the PR template checklist.
4. Do not commit `.env`, keystores, or real credentials.

## Releases

Maintainers: follow [docs/RELEASING.md](docs/RELEASING.md). Version bumps must keep `package.json` and `app.json` `expo.version` aligned with tag `vX.Y.Z`.

## License

See [LICENSE](LICENSE).
