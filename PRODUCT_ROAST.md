# ShipIt — Staff Engineer Engineering Audit

---

## 1. Executive Summary

| Dimension | Score | Notes |
|---|---|---|
| **Overall Engineering** | 4.5 / 10 | Solid concept, immature execution |
| **Production Readiness** | 2 / 10 | Multiple critical blockers |
| **Maintainability** | 5 / 10 | Clean structure, weak contracts |
| **Scalability** | 3 / 10 | Single-instance everything |
| **Security** | 2.5 / 10 | Active command injection vector |
| **Developer Experience** | 4 / 10 | Good build system, no tests or CI |

ShipIt demonstrates thoughtful architectural instincts — Redis-backed queue, isolated Docker builds, S3 artifact storage, and a clean monorepo layout. But it is not production-ready. There is an active command-injection vulnerability, no input validation library, no tests, no CI, no structured logging, no rate limiting, and a hardcoded localhost URL baked into a UI component. The gap between the architecture's ambition and the execution maturity is the defining finding.

---

## 2. Strengths

**1. Architectural clarity.** The deployment pipeline (GitHub → Redis queue → Docker build → S3 → subdomain proxy) maps cleanly to real infrastructure. The flow is understandable in a single read of `shipyard/src/index.ts`.

**2. Monorepo discipline.** Turborepo is configured correctly. `globalEnv`, `dependsOn`, and `persistent` task flags are all used appropriately. The `postinstall` Prisma generate hook prevents the most common new-checkout breakage.

**3. Shared package boundaries.** `@repo/db`, `@repo/auth`, and `@repo/shared` draw sensible dependency lines. The `exports` map on each package prevents accidental internal imports.

**4. Better-Auth integration.** Using better-auth for GitHub OAuth is a good choice. The `repo` scope on the GitHub strategy so the access token can clone private repos is a deliberate, correct decision. Auth middleware is a first-class concept, not an afterthought.

**5. Soft-delete consistency.** All three mutable models (`Project`, `Deployment`, `DeploymentLog`) have `isDeleted` flags, and query sites consistently filter them — the pattern is applied uniformly.

**6. Docker build isolation.** Running user code in a container with `AutoRemove: true` and a volume bind is the right primitive. The package manager detection (pnpm/yarn/npm sniffing) is a thoughtful UX detail.

**7. SPA routing in proxy.** The `index.html` fallback for unknown paths is the correct behaviour for static SPA hosting and was not accidentally omitted.

**8. Frontend tech choices.** Next.js App Router, React 19, Tailwind v4, shadcn/ui, and Framer Motion are current and appropriate. The `axios-instance.ts` env var guard (`throw new Error(...)` at module load time) is the right pattern and should be followed everywhere.

---

## 3. Weaknesses

**1. Active command injection.** User-supplied `buildCommand` and `installCommand` are interpolated into a shell string passed to `/bin/sh -c`. This is a pre-authentication RCE vector in anything that exposes the deployment API.

**2. Zero tests.** No unit, integration, or end-to-end tests exist anywhere in the repository. A build system that runs untested code in Docker containers has no safety net.

**3. No CI/CD pipeline.** There is no `.github/workflows/` directory. Every push deploys nothing and validates nothing automatically.

**4. Hardcoded `localhost:8001` in UI.** `deployment-table.tsx:118` constructs deployment URLs as `http://${deployment.id}.localhost:8001`. This link does not work in production and cannot be configured.

**5. GitHub token exposed in git URLs.** `clone-repo.ts` embeds the OAuth token in the repository URL as `https://oauth2:<token>@github.com/...`. This token can appear in git error messages, stack traces, and process listings.

**6. No input validation library.** Request bodies are destructured directly from `req.body` with no schema validation. `zod`, `joi`, or similar is entirely absent from all `package.json` files.

**7. Path traversal via `outputDir`.** User-supplied `outputDir` is joined with `path.join(buildPath, outputDir)` in `build-in-container.ts` without sanitization. A value of `../../etc` traverses outside the build directory.

**8. `any` types in Redis client.** `packages/shared/src/redis/client.ts` exports `RedisClient = any` and `redis: any`. This defeats TypeScript across every consumer of the queue.

**9. No structured logging.** All services use raw `console.log` / `console.error`. There is no log level, no correlation ID, no deployment ID in context, and no log aggregation path.

**10. No database indexes.** The Prisma schema has no `@@index` declarations. The most common queries — `projects by userId`, `deployments by projectId`, `logs by deploymentId` — all perform full-table scans.

**11. Single Redis instance, no failure handling.** Backend and shipyard silently continue if Redis connection fails at startup. Queue operations on a disconnected client produce unhandled rejections with no dead-letter queue.

**12. No rate limiting.** GitHub repo search, project creation, and deployment trigger endpoints have no throttling. All are reachable by any authenticated user with no per-user limits.

**13. CORS misconfigured.** `methods: ["*"]` in the Express CORS config allows `DELETE`, `TRACE`, and `CONNECT` from the frontend origin. Should whitelist specific methods.

**14. Missing security headers.** No `helmet` middleware. The API responds with no `X-Content-Type-Options`, `X-Frame-Options`, or `Content-Security-Policy`.

**15. No Docker Compose for local development.** Developers must manually provision PostgreSQL, Redis, and S3-compatible storage before a single line of app code runs. This breaks onboarding.

---

## 4. Top 20 Improvements (Ranked by Impact vs. Effort)

| # | Improvement | Severity | Effort | When |
|---|---|---|---|---|
| 1 | Fix command injection — use array exec form, never shell interpolation | Critical | Low | Before MVP |
| 2 | Add `zod` validation on all API request bodies | Critical | Medium | Before MVP |
| 3 | Fix path traversal in `outputDir` — strip `..` components, resolve inside `buildPath` | Critical | Low | Before MVP |
| 4 | Replace token-in-URL git auth with credential helper or `GIT_ASKPASS` env var | Critical | Medium | Before MVP |
| 5 | Add database indexes: `userId` on `Project`, `projectId` on `Deployment`, `deploymentId` on `DeploymentLog` | High | Low | Before MVP |
| 6 | Make deployment URL configurable — replace hardcoded `localhost:8001` with env var `BASE_URL` | High | Low | Before MVP |
| 7 | Add `Docker Compose` for local dev (Postgres, Redis, MinIO) | High | Medium | Before MVP |
| 8 | Add proper TypeScript types to `@repo/shared` Redis client — eliminate `any` | High | Low | Before MVP |
| 9 | Add `helmet` and fix `methods: ["*"]` in CORS | High | Low | Before MVP |
| 10 | Validate all required env vars at process startup (backend and shipyard) | High | Low | Before MVP |
| 11 | Add structured logging with Pino — include `deploymentId` and request ID in context | High | Medium | Before Production |
| 12 | Add rate limiting middleware (express-rate-limit) on project creation and deployment trigger | High | Low | Before Production |
| 13 | Add GitHub Actions CI — lint, type-check, build on every push | High | Medium | Before Production |
| 14 | Add deployment size limits and S3 upload parallelism (`Promise.all`) | Medium | Low | Before Production |
| 15 | Implement `ws-server` for real-time build log streaming | Medium | High | Before Production |
| 16 | Add integration tests for the deployment pipeline (happy path + failure path) | Medium | High | Before Production |
| 17 | Add AWS region to `.env.example` — remove hardcoded `ap-south-1` | Medium | Low | Before Production |
| 18 | Add dead-letter queue for failed deployments — retry or alert on stale QUEUED rows | Medium | Medium | Before Production |
| 19 | Add S3 lifecycle rules to expire artifacts from deleted deployments | Medium | Low | After Production |
| 20 | Add Prometheus metrics endpoint or OpenTelemetry instrumentation to backend and shipyard | Low | High | After Production |

---

## 5. Production Readiness Checklist

### Must Fix (blockers)

- [ ] Command injection in `apps/shipyard/src/build-in-container.ts` — shell interpolation of user-supplied `buildCommand` and `installCommand`
- [ ] Path traversal via `outputDir` — no sanitization before `path.join` in `build-in-container.ts`
- [ ] GitHub OAuth token embedded in git clone URL in `apps/shipyard/src/git/clone-repo.ts`
- [ ] No input validation on any API endpoint
- [ ] Hardcoded `localhost:8001` in `apps/web/app/projects/[projectId]/deployments/deployment-table.tsx:118`
- [ ] Missing database indexes on all foreign-key query columns
- [ ] Redis failure silently allows backend to serve requests with a broken queue

### Should Fix (before launch)

- [ ] Add `helmet` security headers middleware
- [ ] Fix CORS `methods: ["*"]` — whitelist GET, POST, PUT, DELETE
- [ ] Validate required env vars at startup in backend and shipyard
- [ ] Add rate limiting on project creation and deployment endpoints
- [ ] Replace `any` types in `@repo/shared` Redis client
- [ ] Add Docker Compose for local dev
- [ ] Add GitHub Actions CI (lint + type-check + build)
- [ ] Add request body size limits to Express (`express.json({ limit: '1mb' })`)
- [ ] Add structured logging with correlation IDs
- [ ] Make AWS region configurable via env var — remove hardcoded `ap-south-1`

### Nice to Have

- [ ] Sentry or equivalent for error tracking
- [ ] API response envelope standardization
- [ ] OpenAPI/Swagger spec
- [ ] Health check endpoints for shipyard and proxy (not just backend)
- [ ] Docker image pinned to digest instead of `node:20-alpine` tag
- [ ] Deployment cancellation support
- [ ] S3 artifact cleanup on project/deployment deletion
- [ ] Real-time build log streaming via WebSocket
- [ ] `pnpm audit` in CI

---

## 6. Refactoring Opportunities

**`build-in-container.ts` — split concerns.** This single file handles container creation, log streaming, output directory resolution, and S3 upload orchestration. Each is a distinct concern. Extract: `createBuildContainer()`, `streamContainerLogs()`, `resolveOutputDir()`, and the upload loop into `uploadBuildArtifacts()`.

**`proxy/src/index.ts` — split lookup from serving.** The route handler does subdomain parsing, database lookup, S3 key construction, and stream piping in one function. Extract `resolveDeploymentFromSubdomain(host)` → returns `{ deploymentId, prefix }` and `streamS3File(key, res)` as separate functions.

**`@repo/shared` Redis — eliminate the `any` exports.** Replace with `import type { RedisClientType } from 'redis'` and type the exports properly. Zero behavior change, full type safety downstream.

**`new-project.controller.ts` — split into two files.** The file contains two unrelated exported controllers: GitHub repo search and project creation. Split into `search-repos.controller.ts` and `create-project.controller.ts`.

**Next.js API routes — extract DB logic to service layer.** `app/api/projects/route.ts` and `app/api/projects/[projectId]/route.ts` call Prisma directly. The backend already has a `services/deployment.service.ts` convention. Add a `services/project.service.ts` to follow the same pattern.

---

## 7. Future Roadmap

### Phase 1 — MVP Completion

- Fix all three critical security issues (command injection, path traversal, token in URL)
- Add `zod` validation on all endpoints
- Add Docker Compose so the project boots in one command (`docker compose up`)
- Fix the hardcoded `localhost:8001` deployment URL with a `BASE_URL` env var
- Add database indexes for all foreign-key columns
- Add GitHub Actions CI with lint + typecheck

### Phase 2 — Production Ready

- Implement `ws-server` for real-time build log streaming to the frontend
- Add structured logging (Pino) with deployment ID context in shipyard
- Add rate limiting and request size limits
- Add Sentry error tracking
- Write integration tests for the deployment pipeline
- Add health check endpoints to all services
- Add S3 artifact cleanup on project/deployment deletion
- Make all infrastructure config (region, Docker image, port) env-var-driven
- Add dead-letter queue and stale-deployment recovery job

### Phase 3 — Scale to Thousands of Users

- Horizontal scaling for shipyard workers — multiple instances consuming the same Redis queue
- Replace single Redis with Redis Cluster or managed Redis (ElastiCache, Upstash)
- Add deployment concurrency limits per user (prevent one user monopolizing workers)
- S3 lifecycle policies to expire old deployment artifacts
- Add PostgreSQL read replica for list/search queries
- Add per-user storage quotas
- Implement deployment rollback (point to previous completed deployment's S3 prefix)
- Custom domain support (DNS CNAME → proxy)

### Phase 4 — Enterprise Quality

- Multi-region deployment (deploy to closest S3 region)
- OpenTelemetry instrumentation across all services
- Audit log (who deployed what, when, from which IP)
- SOC 2 readiness (encryption at rest, access controls, data retention policy)
- Webhook support for GitHub push-to-deploy
- Team/organization model — multiple users per project
- Environment variable injection per deployment (secrets stored encrypted, injected at build time)
- Build cache layer (skip rebuild if commit SHA unchanged)

---

## 8. Suggested Repository Improvements

**Folder structure**

The `apps/ws-server` app is a stub with a one-line body. Either remove it or add an issue reference so contributors understand its status. Stubs that look like real services confuse new contributors.

**Naming**

`apps/shipyard/src/build-in-container.ts` — the function exported is `buildInContainer`, which matches, but the file also owns S3 upload logic. Rename to `run-build.ts` or split.

The `new/` route and `new-project.controller.ts` naming is vague. Rename to `projects/new/` (web) and `create-project.controller.ts` (backend) to align with REST conventions.

**Documentation**

The `README.md` should include a one-command local setup, a diagram of the deployment pipeline, and the env var table. Architecture diagrams exist in `docs/` but are not linked from the README.

Add a `CONTRIBUTING.md` with the branch convention, PR process, and the commands to run before pushing (`pnpm lint && pnpm check-types`).

**CI/CD**

Add `.github/workflows/ci.yml` running install → lint → type-check → build on every push and pull request. Add `.github/workflows/security.yml` with `pnpm audit` and Dependabot or Renovate for automated dependency updates.

**Monitoring and logging**

Add `GET /health` to shipyard and proxy. Health checks should return Redis connectivity, DB connectivity, and Docker daemon status from shipyard. Without these a load balancer or orchestrator cannot determine whether a worker is alive.

**Testing**

Start with integration tests over unit tests. The most valuable test is: given a mock Git repo and a local Docker daemon, does a full build complete and produce S3 artifacts? This validates every layer except S3 (which can use LocalStack or MinIO in CI).

**Security tooling**

Add `pnpm audit` to the pre-commit hook alongside `format`. Add `gitleaks` or `trufflehog` to CI to prevent accidental secret commits.

**Automation**

The `.husky/pre-commit` only runs `pnpm format`. Add `pnpm lint && pnpm check-types` so type errors are caught before push, not discovered in CI.

---

## 9. Open Source Readiness

**Current state: not ready.**

A new contributor landing on this repository today faces:

- No `docker compose up` equivalent — they must manually provision three external services before anything runs
- No test suite to verify their change didn't break anything
- No CI to give feedback on a PR
- A security vulnerability in `build-in-container.ts` they might accidentally trigger while testing
- A hardcoded URL (`localhost:8001`) that silently makes deployed links dead in any non-local environment
- `ws-server` that looks implemented but does nothing

**What would make it feel professional:**

1. **One-command setup.** `docker compose up` starts Postgres, Redis, and MinIO. `pnpm dev` starts all apps. The README shows this in the first code block.

2. **A working local demo.** A `docker compose --profile demo up` that seeds sample data and runs the full pipeline locally.

3. **Issue templates.** `.github/ISSUE_TEMPLATE/bug_report.md` and `feature_request.md`. Signals that contributions are organized and expected.

4. **PR template.** `.github/pull_request_template.md` with checklist: passes lint, passes type-check, has a test.

5. **A `CONTRIBUTING.md`** explaining the monorepo structure, which package owns what, and how to run a subset of apps during development.

6. **Architecture diagram in the README.** The `docs/` directory exists but is not linked. The pipeline diagram should be visible above the fold.

7. **Fix the security issues before public release.** Command injection in a user-facing deployment tool is not an acceptable known issue for an open-source project. It will be found, reported loudly, and become the project's public identity.

Once the critical issues are resolved and Docker Compose is added, ShipIt has a genuinely compelling architecture that would attract contributors. A self-hosted Vercel alternative is a real gap in the open-source ecosystem, and this codebase is closer to filling it than most attempts.
