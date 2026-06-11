# Branch Strategy — API, Web & Mobile

This repo is a single monorepo (`apps/api`, `apps/web`, `apps/mobile`, shared `packages/`
and `prisma/`). All three apps live in every branch's working tree, but each branch
has a distinct *role*. This doc explains what each branch is for, what gets deployed
from it, and how the three apps relate on each one.

## `main` — Production

- The source of truth for what's live for real users.
- `apps/api` → deployed to the production Render service.
- `apps/web` → deployed to the production Vercel project (Production environment).
- `apps/mobile` → not deployed from here directly; production mobile builds are cut
  via EAS from a tagged commit on this branch (or `staging` once it's stable).
- Only merge into `main` once changes have been verified on `staging`.

## `staging` — Active development (API + Web)

- Day-to-day development branch for `apps/api` and `apps/web`.
- `apps/api` → deployed to the staging Render service (staging DB).
- `apps/web` → deployed as a Vercel Preview, pointed at the staging API
  (`API_ORIGIN` / `NEXT_PUBLIC_API_URL` set to the staging API URL in Vercel's
  Preview env vars for this branch).
- `apps/mobile` also exists here (kept in sync via merges/cherry-picks from
  `native-expo-foundation`) so the mobile app always has a working copy of the
  latest API contract — but mobile isn't *built/deployed* from this branch.
- This is the branch most backend/web feature work should target.

## `native-expo-foundation` — Mobile app development

- Active development branch for `apps/mobile` (Expo / React Native).
- Started as a sync of `staging` (so it has the same `apps/api`/`apps/web` code),
  plus the mobile app added on top.
- `apps/mobile` → not deployed via Vercel/Render. It's built/distributed through
  **EAS Build** (dev/preview/production profiles) and **EAS Submit** to the
  Play Store / App Store. OTA JS updates go through **EAS Update**.
- `apps/web`'s `vercel.json` has an `ignoreCommand` that skips the Vercel build
  entirely on this branch unless a commit actually touches `apps/web` or
  `packages/shared` — so pure-mobile commits don't trigger (or fail) a web
  preview build.
- The mobile app talks to the **same backend API** as web — `EXPO_PUBLIC_API_URL`
  in `apps/mobile/.env*` points at the staging (or production) Render API URL
  depending on the EAS build profile.
- Periodically rebase/sync this branch from `staging` to pick up backend/web
  fixes (e.g. new endpoints the mobile app needs), via merge or cherry-pick —
  same as was done for the pickup-points route wiring fix.

## How the three apps connect across branches

| | `apps/api` | `apps/web` | `apps/mobile` |
|---|---|---|---|
| **main** | Production Render | Production Vercel | EAS production builds (from tagged commits) |
| **staging** | Staging Render | Staging Vercel preview | present, kept in sync, not deployed |
| **native-expo-foundation** | same code as staging, not separately deployed | same code as staging, web build skipped via `ignoreCommand` unless web changed | EAS dev/preview builds |

In short: **API and Web have a normal CI/CD pipeline (Render + Vercel) driven by
`main`/`staging`. Mobile has a separate pipeline (EAS) driven by
`native-expo-foundation`, but always consumes the same API as web.**
