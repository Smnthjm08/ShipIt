# Architecture Review & TODO — ShipIt

**Verdict:** Architecture is right (API enqueues → worker builds in container → S3 → proxy
serves by subdomain). Solid foundation, ~60% built. Not production-ready yet. Everything
below is an additive fix — no rewrite needed.

**Status:** every item below is now done. What's deliberately *not* solved, and would be the
next round of work:

- No Node runtime — the platform is static-hosting only, so `NODE`-framework projects and
  non-exported Next.js apps can't be served. The failure is now loud instead of silent.
- Single worker assumed. Job recovery reclaims the processing list wholesale, which would steal
  in-flight jobs from a second worker.
- Builds still run as root in the container with an open network; resource caps are in place but
  this is not a hardened sandbox.
- Still no tests.

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

- [x] **Build logs go nowhere.** ✅ Fixed end to end: build output is demuxed from the Docker
      stream, batched into `DeploymentLog`, **and** published to Redis pub/sub
      (`@repo/shared/redis/logs`). `ws-server` is now a real WebSocket server
      (`ws://…/deployments/:id/logs`) that authenticates the better-auth session, checks
      ownership, replays the backlog and streams live lines. The deployment page renders them,
      falling back to polling `GET /api/v1/deployments/:id/logs` if the socket drops.
- [x] **Backend routes barely wired.** ✅ Fixed: routes moved to `backend/src/routes/index.ts`
      with list/get/delete projects, list/redeploy deployments, deployment status, logs, and
      delete. `DeploymentService` is mounted and every query is ownership-scoped to the session
      user. `installCommand`/`rootDir` were also being silently dropped on project create — fixed.
- [x] **Next.js can't actually deploy.** ✅ Fixed by being honest instead of pretending:
      `.next` was removed from the output-dir fallbacks, and a build that produces only `.next`
      now fails with a message telling the user to set `output: "export"`. `NEXTJS` defaults the
      output dir to `out/`, and the create-project form warns up front that server components,
      API routes and ISR won't work. Adding a Node runtime is still the open alternative.

## ⚪ Minor / cleanup

- [x] Redundant status update: worker sets `CLONING`, then `cloneRepo` sets it again. ✅ Fixed —
      status transitions belong to the worker loop; `cloneRepo` no longer writes status.
- [x] `cors({ methods: ["*"] })` is invalid — use an array of methods. ✅ Fixed.
- [x] `any`-typed Redis clients throw away type safety across `@repo/shared`. ✅ Fixed — all four
      clients are typed `RedisClient`.
- [x] `brPop` has no delivery guarantee if the worker dies mid-build (job already popped).
      ✅ Fixed: `reserveBuild()` uses `BLMOVE` onto a processing list, `ackBuild()` clears it on a
      terminal status, and `recoverStaleBuilds()` requeues orphans at worker startup. Single-worker
      assumption is documented in `queue.ts`.

---

### What's already solid (don't touch)

- Queue-decoupled worker + clean status state machine (`shipyard/src/index.ts`)
- Package-manager auto-detection + output-dir fallback (`build-in-container.ts`)
- Monorepo hygiene: Turborepo, `@repo/*` packages, ESM+NodeNext, soft-delete, better-auth `repo` scope
- Proxy SPA `index.html` fallback
