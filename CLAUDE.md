# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

ShipIt is a self-hosted Vercel-like deployment platform. Users connect GitHub repos, trigger deployments, and get a live URL served from S3. It is a pnpm monorepo managed with Turborepo.

## Commands

```bash
# Install dependencies
pnpm install

# Run all apps in dev mode
pnpm dev

# Run a single app
pnpm --filter backend dev
pnpm --filter web dev
pnpm --filter shipyard dev
pnpm --filter proxy dev

# Lint all packages
pnpm lint

# Type-check all packages
pnpm check-types

# Build all
pnpm build

# Database
pnpm db:migrate        # run migrations (prisma migrate dev)
pnpm db:push           # push schema without migration
pnpm db:studio         # open Prisma Studio
pnpm --filter @repo/db run db:generate   # regenerate Prisma client
```

There are no tests in this project yet.

## Architecture

### Deployment flow

1. User authenticates via GitHub OAuth (better-auth stores GitHub access token in `account.accessToken`)
2. User creates a project by searching repos via Octokit and saving to `Project` table
3. Triggering a deploy creates a `Deployment` row (status: `QUEUED`) and pushes its ID onto a Redis queue
4. **Shipyard** worker dequeues the ID → clones the repo using the stored GitHub token → builds inside a Docker container (`node:20-alpine`) → uploads all output files to S3
5. **Proxy** server maps incoming subdomains to a deployment, fetches files from S3, and serves them — with `index.html` fallback for SPAs

### Apps

| App         | Port | Purpose                                      |
| ----------- | ---- | -------------------------------------------- |
| `web`       | 3000 | Next.js frontend                             |
| `backend`   | 3002 | Express REST API + better-auth               |
| `shipyard`  | —    | Background Docker/S3 build worker            |
| `ws-server` | 3003 | Streams live build logs over WebSocket       |
| `proxy`     | 8001 | Subdomain → S3 asset server                  |

### Packages

- **`@repo/db`** — Prisma client (PostgreSQL via `@prisma/adapter-pg`). Exports a singleton `prisma` instance from `src/index.ts`. Generated client lands in `packages/db/generated/prisma`.
- **`@repo/auth`** — better-auth config. Exports `./server` (auth instance) and `./client` (client-side auth). GitHub scope includes `repo` so the access token can clone private repos.
- **`@repo/shared`** — Redis client factory and typed queue/pub-sub helpers. Always use `connectRedis`/`disconnectRedis` wrappers rather than the raw client. Enqueue and consume build jobs through `enqueueBuild` / `reserveBuild` / `ackBuild` / `recoverStaleBuilds` (`redis/queue.ts`) — never `lPush`/`brPop` the queue key directly, or the crash-recovery guarantee is lost. Build output flows through `publishDeploymentLog` / `subscribeDeploymentLogs` (`redis/logs.ts`).

### Key data models

- `User` → `Project` (one-to-many)
- `Project` → `Deployment` (one-to-many); projects and deployments use soft-delete (`isDeleted`)
- `Deployment` → `DeploymentLog` (one-to-many)
- `Account.accessToken` holds the GitHub OAuth token used by Shipyard to clone repos

### Auth middleware

`apps/backend/src/middlewares/auth.middleware.ts` verifies the better-auth session cookie and attaches `SessionUser` to `req.user`. All `/api/v1/*` routes except health require this middleware.

### Proxy routing

The proxy reads the subdomain from the incoming `Host` header. If it looks like a deployment ID it fetches that deployment's files; otherwise it finds the latest `COMPLETED` deployment for the project with that ID/name. Files are piped directly from S3 with correct MIME types.

## Environment Variables

Defined in `.env.example` at the root. Turborepo forwards all of them globally (see `turbo.json` `globalEnv`).

| Variable                                                                        | Used by                               |
| ------------------------------------------------------------------------------- | ------------------------------------- |
| `DATABASE_URL`                                                                  | `@repo/db`                            |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`                                        | `@repo/auth`, `backend`, `web`        |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`                                     | `@repo/auth`                          |
| `NEXT_PUBLIC_API_BASE_URL`                                                      | `web`                                 |
| `REDIS_URL`                                                                     | `@repo/shared`, `backend`, `shipyard` |
| `AWS_ACCESS_KEY` / `AWS_SECRET_ACCESS_KEY` / `AWS_ENDPOINT` / `AWS_BUCKET_NAME` | `shipyard`, `proxy`                   |

## Conventions

- All apps are `"type": "module"` — use ESM imports, not CommonJS `require`.
- Module resolution is `NodeNext` across all packages. Import paths inside packages must use explicit `.js` extensions even for `.ts` source files.
- `@repo/db` is imported via its `exports` map entry (`"."`) which resolves to `./src/index.ts` at dev time — no build step needed for the shared packages.
- Prisma client is generated to `packages/db/generated/prisma` (not the default location). Import it from `@repo/db`.
- Soft-delete pattern: set `isDeleted: true` rather than removing rows for `Project`, `Deployment`, and `DeploymentLog`.
- The `Account.accessToken` comment in schema marks it as important for Octokit — do not remove this field or its mapping.

## Pitfalls

- **Prisma generate must run before builds.** The `postinstall` script and the `generate` turbo task handle this, but if types are missing after checkout run `pnpm --filter @repo/db run db:generate`.
- **Redis must be running** before starting `backend` or `shipyard` — both call `connectRedis()` at startup.
- **Docker must be running** on the Shipyard host — it calls the Docker daemon via `dockerode` to spin up build containers.
- **S3-compatible storage required** — `AWS_ENDPOINT` supports any S3-compatible service (Cloudflare R2, MinIO, etc.); the bucket must be pre-created.
- **Static hosting only.** The proxy pipes files out of S3 — there is no Node runtime. A Next.js project only deploys if built with `output: "export"` (which emits `out/`); a build that produces only `.next` fails on purpose in `build-in-container.ts`.
- **The build queue is single-worker.** `recoverStaleBuilds()` requeues everything on the processing list at startup, so a second concurrent worker would steal in-flight jobs.
