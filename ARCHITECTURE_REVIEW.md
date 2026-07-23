# Architecture Review & TODO — ShipIt

**Verdict:** Architecture is right (API enqueues → worker builds in container → S3 → proxy
serves by subdomain). Solid foundation, ~60% built. Not production-ready yet. Everything
below is an additive fix — no rewrite needed.

---

## 🔴 P0 — Fix now (may be broken today)

- [x] **Storage config mismatch.** ~~`aws.ts:9` has `endpoint` commented out + region hardcoded
      `ap-south-1` (uploads to real AWS), but proxy `index.ts:13` uses `AWS_ENDPOINT`.~~ ✅ Fixed:
      single `createS3Client()`/`getBucketName()` in `@repo/shared/aws/s3`, used by both shipyard
      and proxy. Endpoint + region now driven consistently from env (`AWS_ENDPOINT`, `AWS_REGION`).

## 🟠 P1 — Stops the worker from wedging

- [x] **Build timeout.** ~~`container.wait()` blocks forever.~~ ✅ Fixed: `BUILD_TIMEOUT_MS`
      (default 10 min) stops/kills the container and fails the build.
- [x] **Container resource limits.** ✅ Fixed: `HostConfig` now caps Memory (2 GiB), CPU
      (2 cores via `NanoCpus`), and `PidsLimit` (512). (Network left open — builds need it for installs.)
- [x] **No cleanup.** ✅ Fixed: `finally` block in the worker loop `rmSync`s the clone dir after
      every build (success or failure).

## 🟡 P2 — Security

- [x] **GitHub token leaks into build container.** ~~Token embedded in git remote URL;
      `.git/config` bind-mounted into a container running arbitrary build commands.~~ ✅ Fixed:
      after clone, `remote set-url origin` resets the remote to the clean (token-less) URL.

## 🟢 P3 — Missing product surface

- [~] **Build logs go nowhere.** ✅ Logs are now **persisted** to the `DeploymentLog` table from
  the build stream. ⏳ Still TODO: **live streaming** over `ws-server` (still a stub) and an
  API/UI to read them.
- [ ] **Backend routes barely wired.** Only `GET/POST /api/v1/new` exist
      (`backend/src/index.ts:56`). `DeploymentService` written but never mounted. → Add
      list-projects, deployment-status, redeploy, delete endpoints.
- [ ] **Next.js can't actually deploy.** Proxy serves raw static files; `.next` needs a Node
      server. `NEXTJS` enum implies support that doesn't exist. → Support `next export`/static
      only, or add a runtime.

## ⚪ Minor / cleanup

- [ ] Redundant status update: worker sets `CLONING`, then `cloneRepo` sets it again.
- [ ] `cors({ methods: ["*"] })` is invalid — use an array of methods.
- [ ] `any`-typed Redis clients throw away type safety across `@repo/shared`.
- [ ] `brPop` has no delivery guarantee if the worker dies mid-build (job already popped).

---

### What's already solid (don't touch)

- Queue-decoupled worker + clean status state machine (`shipyard/src/index.ts`)
- Package-manager auto-detection + output-dir fallback (`build-in-container.ts`)
- Monorepo hygiene: Turborepo, `@repo/*` packages, ESM+NodeNext, soft-delete, better-auth `repo` scope
- Proxy SPA `index.html` fallback
