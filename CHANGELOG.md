# Changelog

All notable changes to this project will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

## [0.6.0] - 2026-06-07 — Unit Tests & Coverage

### Added

**Tests:**
- `auth.service.spec.ts` — 14 tests (register, login, logout, refresh, JWT)
- `auth.controller.spec.ts` — 4 tests (register, login, logout, refresh endpoints)
- `jwt.guard.spec.ts` — 5 tests (token extraction, validation, error handling)
- `files.service.spec.ts` — 28 tests (upload, list, delete, password, anonymous, tags, history)
- `download.service.spec.ts` — 13 tests (link creation, token usage, revocation)
- `download.controller.spec.ts` — 4 tests (CRUD + public download)

**Documentation:**
- `docs/testing/TESTING.md` — Full testing strategy document

### Changed

**Configuration:**
- `backend/package.json`: `collectCoverageFrom` now targets business logic (`*.service.ts`, `*.controller.ts`, `*.guard.ts`)
- `backend/package.json`: `coverageThreshold` set to 70% statements/lines, 50% branches, 60% functions

**Metrics:**
- 68 tests, 6 suites, all passing
- 72.82% statement coverage (threshold: 70%)

## [0.5.4] - 2026-06-07 — Fix Presigned URL Signature

### Fixed

**Backend:**
- Fix `SignatureDoesNotMatch` error on download links: v0.5.3 replaced hostname AFTER signature computation
- Create separate `publicClient: S3Client` configured with `MINIO_PUBLIC_URL` for presigned URL generation
- Signature now computed with correct public hostname (`localhost:9000`) from the start

**Architecture:**
- `client` (internal) → upload, delete, bucket ops via `minio:9000`
- `publicClient` (public) → presigned URLs via `localhost:9000`

### Tests
- ✅ 21/21 E2E tests pass (Playwright)

**GitHub:** Issue #31 → PR #32 (squash merged)

---

## [0.5.3] - 2026-06-07 — Fix NaN MB + Broken Download Links

### Fixed

**Frontend:**
- Fix file size display "NaN MB": use `sizeBytes` field instead of `size`, convert BigInt string via `Number()`

**Backend:**
- Fix broken download links: presigned URLs used Docker internal hostname `minio:9000`
- Add `MINIO_PUBLIC_URL` env var to replace internal hostname with public URL in presigned URLs

**Infrastructure:**
- Expose MinIO S3 API port `9000` in docker-compose for browser-accessible presigned URLs

**Variables d'environnement:**
- `MINIO_PUBLIC_URL` (optional, default: none) — Public URL for MinIO presigned URLs (e.g. `http://localhost:9000`)

### Tests
- ✅ 21/21 E2E tests pass (Playwright)

---

## [0.5.2] - 2026-06-07 — JWT userId Fix + E2E 21/21

### Fixed

**Backend:**
- Fix JWT guard: map `payload.sub` → `request.user.userId` (uploaded files had `userId: null`)

**Frontend:**
- Fix `expiresInSeconds` → `ttlSeconds` in `DashboardPage.tsx` (matching `CreateLinkDto` backend DTO)

**E2E Tests:**
- Dashboard page object: add `waitForLoaded()` to avoid race conditions on file list rendering
- US02: use API-based approach for link generation test + `maxRedirects: 0` for download (MinIO internal hostname)
- US05: add `waitForLoaded()` before checking table headers
- US10: use `maxRedirects: 0` to avoid following redirect to internal MinIO hostname
- Fix `expiresInSeconds` → `ttlSeconds` in US02 and US10

### Added

**Documentation:**
- Add `docs/testing/08-e2e-testing.md` — complete E2E test plan (US01–US10, 21 test cases)

**Test Results:** 17/21 → **21/21 passing** ✅

**GitHub:** Issue #27, PR #28 (squash merged, labels: bug, testing)

## [0.5.1] - 2026-06-07 — E2E Infra Fixes

### Fixed

**Backend:**
- Fix BigInt JSON serialization in `main.ts` (Prisma returns BigInt for `sizeBytes` field, crashed `JSON.stringify`)
- Add optional `name` field to `RegisterDto` (frontend sends it, backend was rejecting with 400)

**E2E Tests:**
- Fix auth fixture: register redirects to `/login`, not `/dashboard`
- Add `registerAndLogin` helper for tests needing authenticated user
- Replace `registerUser` → `registerAndLogin` in all 10 specs
- Fix US06 stats test to use proper auth flow

**Infrastructure:**
- Prisma `db push`: created missing database tables (no migrations directory existed)

**Test Results:** 2/20 → **17/21 passing**

**GitHub:** PR #25 (squash merged, labels: fix, testing)

## [0.5.0] - 2026-05-31 — E2E Tests Playwright

### Added

**Features:**
- 10 Playwright test specs covering US01-US10 (21 test cases total)
- Page objects: LoginPage, RegisterPage, DashboardPage, UploadPage
- Auth fixture with unique-email user generation
- Playwright config targeting https://localhost with self-signed cert bypass

**Tests:**
- US01: File upload (authenticated) + redirect guard (2 tests)
- US02: Download link generation + public access (2 tests)
- US03: Registration + duplicate email + short password (3 tests)
- US04: Login + wrong password + logout (3 tests)
- US05: File list empty state + file display + metadata (3 tests)
- US06: User statistics via API (1 test)
- US07: Password protection set/remove (2 tests)
- US08: Anonymous upload via API (1 test)
- US09: Tags add/normalize/reject >10 (3 tests)
- US10: Download history recording (1 test)

**Dépendances:**
- `@playwright/test` >= 1.x (e2e directory)

**GitHub:** Issue #23 → PR #24 (squash merged, label: testing)

## [0.4.4] - 2026-05-31 — Frontend UI Pages

### Added

**Features:**
- 5 functional pages: Login, Register, Dashboard, Upload, Download
- Axios client with JWT interceptor + auto-refresh on 401
- AuthProvider context + useAuth hook
- Navbar + PrivateRoute components
- Protected routes (dashboard, upload) redirect to login

**GitHub:** Issue #21 → PR #22 (squash merged, label: feature)

## [0.4.3] - 2026-05-31 — US07-US10: Advanced Features

### Added

**Features :**
- US07: Password-protected files (bcrypt hash, set/remove via PUT/DELETE)
- US08: Anonymous upload (POST /api/files/anonymous, public, 1-day expiry)
- US09: File tagging (upsert tags, max 10 per file, normalized lowercase)
- US10: Download history (last 100 events with IP + User-Agent)

**Routes :**
- `PUT /api/files/:id/password` — Set file password (JWT required)
- `DELETE /api/files/:id/password` — Remove file password (JWT required)
- `POST /api/files/anonymous` — Anonymous upload (public)
- `PUT /api/files/:id/tags` — Set file tags (JWT required)
- `GET /api/files/:id/tags` — Get file tags (JWT required)
- `GET /api/files/:id/history` — Download history (JWT required)

**Database :**
- `DownloadHistory` model (id, fileId, tokenId, downloadedAt, ipAddress, userAgent)
- Relations: File → DownloadHistory, DownloadToken → DownloadHistory

**Documentation :**
- `docs/backend/07-advanced-features.md` — Full US07-US10 documentation

**GitHub :** Issue #13 → PR #17 (squash merged)

## [0.4.2] - 2026-05-31 — US05+US06: Paginated File List & Stats

### Added

**Features :**
- US05: Paginated file list with sorting (page, limit, sortBy, order)
- US06: User file statistics endpoint (fileCount, deletedCount, totalSizeBytes, activeLinks)
- ListFilesDto with class-validator + class-transformer validation

**Routes :**
- `GET /api/files?page=1&limit=20&sortBy=createdAt&order=desc` — Paginated list (JWT required)
- `GET /api/files/stats` — User file statistics (JWT required)

**GitHub :** Issue #12 → PR #16 (squash merged)

## [0.4.1] - 2026-05-31 — US02: Download Links

### Added

**Features :**
- US02: Temporary secure download links for file sharing without authentication
- DownloadService: createLink, findByFile, revokeLink, useToken (302 redirect to MinIO presigned URL)
- DownloadController: 3 JWT-protected routes + 1 public route
- Prisma schema: `maxDownloads` field added to DownloadToken

**Routes :**
- `POST /api/files/:id/links` — Generate download token (JWT required)
- `GET /api/files/:id/links` — List active tokens (JWT required)
- `DELETE /api/files/:id/links/:tokenId` — Revoke token (JWT required)
- `GET /api/download/:token` — Public download (302 → MinIO presigned URL)

**Variables d'environnement :**
- `DOWNLOAD_LINK_TTL_SECONDS` (optionnelle, défaut: `86400`)

**Tests :**
- 10 unit tests for DownloadService (create, TTL, expiry, revoke, maxDownloads, file deleted)

**Documentation :**
- `docs/backend/06-download-links.md` — Full DownloadModule documentation

**GitHub :** Issue #11 → PR #15 (squash merged)

## [0.4.0] - 2026-05-31 — US01: File Upload (GitHub Copilot + Human Review)

### Added

**Features :**
- US01: File upload with MinIO (S3-compatible) storage
- MinioService: upload, delete, getPresignedUrl, auto bucket creation
- FilesService: uploadFile, findAllByUser, findOne, remove (soft-delete)
- FilesController: 4 JWT-protected REST routes

**Routes :**
- `POST /api/files/upload` — Upload file (multipart/form-data, JWT required)
- `GET /api/files` — List user files (JWT required)
- `GET /api/files/:id` — File metadata (JWT required)
- `DELETE /api/files/:id` — Delete file from MinIO + soft-delete in DB (JWT required)

**Variables d'environnement :**
- `MINIO_ENDPOINT` (obligatoire, défaut: `minio`)
- `MINIO_PORT` (optionnelle, défaut: `9000`)
- `MINIO_ACCESS_KEY` (obligatoire)
- `MINIO_SECRET_KEY` (obligatoire)
- `MINIO_BUCKET` (optionnelle, défaut: `datashare`)
- `MINIO_USE_SSL` (optionnelle, défaut: `false`)
- `MAX_FILE_SIZE_BYTES` (optionnelle, défaut: `1073741824` = 1GB)
- `FILE_EXPIRY_DAYS_DEFAULT` (optionnelle, défaut: `7`)

**Dépendances :**
- `@aws-sdk/client-s3` >= 3.x
- `@aws-sdk/s3-request-presigner` >= 3.x
- `@types/multer` (dev)

**AI Usage :**
- Code generated by GitHub Copilot (4 prompts)
- 5 human review corrections documented in `docs/ai-usage/us01-supervision-log.md`

**Tests :**
- 10 unit tests for FilesService (upload, list, findOne, remove + error cases)

**Documentation :**
- `docs/ai-usage/us01-copilot-prompts.md` — Prompts used
- `docs/ai-usage/us01-supervision-log.md` — Supervision & corrections log

**GitHub :** Issue #10 → PR #14 (squash merged)

## [0.3.1] - 2026-05-31 — Fix: TypeScript strict typing for auth

### Fixed
- `auth.service.ts`: non-null assertion on `config.get<string>('JWT_SECRET')!` (TS2769)
- `jwt.guard.ts`: same fix for `jwt.verify()` call
- Added `@nestjs/config` as explicit dependency in `package.json`
- All 10 auth tests pass — `auth.service.ts` at 100% statement coverage

## [0.3.0] - 2026-05-31 — Step 3: US03+US04 Authentication

### Added

**Backend Modules:**
- `PrismaModule`: global DB service (`prisma.service.ts`, `prisma.module.ts`)
- `AuthModule`: 4 REST endpoints (register, login, logout, refresh)
- `JwtGuard`: reusable guard for protected routes (extracts + validates JWT)

**Auth Routes:**
- `POST /api/auth/register` — create account (bcrypt hash, email validation)
- `POST /api/auth/login` — authenticate, emit JWT access token + HttpOnly refresh cookie
- `POST /api/auth/logout` — revoke refresh token (requires JWT)
- `POST /api/auth/refresh` — renew access token via cookie (token rotation)

**DTOs & Validation:**
- `RegisterDto`: email (IsEmail), password (MinLength 8)
- `LoginDto`: email (IsEmail), password (IsString)
- class-validator + class-transformer for input validation

**Token Strategy:**
- Access token: JWT HS256, payload `{sub, email}`, TTL 15min
- Refresh token: UUID v4, bcrypt hash in DB, HttpOnly cookie, TTL 7 days
- Token rotation on each refresh (old token revoked)

**Tests:**
- `auth.service.spec.ts`: 10 unit tests (register, login, logout, refresh)
- Covers: success paths, duplicate email, wrong password, token expiry

**Documentation:**
- `docs/backend/05-auth.md`: full AuthModule documentation (routes, strategy, diagrams, tests)

**GitHub:**
- Issue #6: `[AUTH] Step 3 — US03+US04 : User registration & authentication`
- PR: `feature/step3-auth` → `main`

## [0.2.0] - 2026-05-31 — Step 2: Infrastructure & App Init

### Added

**Infrastructure:**
- `infra/docker-compose.yml`: 5 services (nginx, frontend, backend, postgres, minio)
- `infra/nginx/nginx.conf`: Reverse proxy with TLS termination, routing `/` → React, `/api/` → NestJS
- Named volumes: `postgres-data`, `minio-data` (data persistence)
- Bridge network: `datashare-net` (internal communication)
- Healthchecks: `postgres` (pg_isready), `minio` (mc ready)
- `Makefile`: shortcuts (`make up`, `make down`, `make reset`, `make certs`, `make logs`)

**Backend (NestJS):**
- `backend/Dockerfile`: Node 20 Alpine, npm install, Prisma generate, build
- `backend/package.json`: NestJS 10.x + Prisma 5.x + bcrypt + JWT deps
- `backend/src/main.ts`: Bootstrap with CORS, global prefix `/api`, Swagger docs
- `backend/src/app.controller.ts`: `GET /health` endpoint
- `backend/prisma/schema.prisma`: 6 entities (User, File, DownloadToken, RefreshToken, Tag, FileTag)

**Frontend (React/Vite):**
- `frontend/Dockerfile`: Node 20 Alpine, Vite dev server
- `frontend/package.json`: React 18 + React Router 6 + Axios
- `frontend/src/App.tsx`: Router with 5 routes (/, /login, /register, /dashboard, /upload)

**Configuration:**
- `.env.example`: 18 environment variables documented

**Variables d'environnement ajoutées:**
- `DATABASE_URL` (obligatoire) — PostgreSQL connection string
- `POSTGRES_USER` (obligatoire) — Database user
- `POSTGRES_PASSWORD` (obligatoire) — Database password
- `POSTGRES_DB` (obligatoire) — Database name
- `JWT_SECRET` (obligatoire) — HMAC-SHA256 signing secret (min 32 chars)
- `JWT_EXPIRES_IN` (optionnelle, défaut: `15m`) — Access token TTL
- `REFRESH_TOKEN_EXPIRES_IN` (optionnelle, défaut: `7d`) — Refresh token TTL
- `MINIO_ENDPOINT` (obligatoire) — MinIO hostname
- `MINIO_PORT` (optionnelle, défaut: `9000`) — MinIO API port
- `MINIO_ACCESS_KEY` (obligatoire) — MinIO access key
- `MINIO_SECRET_KEY` (obligatoire) — MinIO secret key
- `MINIO_BUCKET` (optionnelle, défaut: `datashare`) — S3 bucket name
- `MINIO_USE_SSL` (optionnelle, défaut: `false`) — TLS for MinIO
- `APP_PORT` (optionnelle, défaut: `3001`) — NestJS listen port
- `APP_ENV` (optionnelle, défaut: `development`) — Environment
- `MAX_FILE_SIZE_BYTES` (optionnelle, défaut: `1073741824`) — Max upload 1 GB
- `FILE_EXPIRY_DAYS_DEFAULT` (optionnelle, défaut: `7`) — Default file expiry
- `ALLOWED_ORIGINS` (optionnelle, défaut: `https://localhost`) — CORS origins

**Documentation:**
- `README.md`: 8 sections (Prerequisites, Installation, Configuration, Launch, Tests, Security, Limitations)
- `docs/infrastructure/04-infrastructure-setup.md`: Docker Compose architecture, services, quick start
- `.gitignore`: updated for full stack (node_modules, .env, certs, coverage, volumes)

**GitHub:**
- Issue #3: `[INFRA] Step 2 — Infrastructure Docker Compose & App Init`
- PR #4: `feature/step2-infrastructure` → `main`

## [0.1.0] - 2026-05-31 — Step 1: Architecture & Technical Design

### Added

**Architecture:**
- Architecture overview diagram (Mermaid) — 5 services, protocols on each link
- 12 technology choices justified (NestJS, React, Prisma, MinIO, JWT, etc.)

**Database:**
- MCD (Mermaid erDiagram): 6 entities (User, File, DownloadToken, RefreshToken, Tag, FileTag)
- All attributes with types, PKs, FKs, cardinalities

**API Design:**
- OpenAPI 3.0 contract: 14 REST routes
- 8 sequence diagrams (register, login, upload, download, anonymous, history, deletion, tags)

**Documentation:**
- `docs/architecture/01-architecture-overview.md`
- `docs/architecture/02-database-schema.md`
- `docs/architecture/03-sequence-diagrams.md`
- `docs/architecture/openapi.yaml`
- Memory bank initialized (5 files: projectbrief, techContext, systemPatterns, activeContext, progress)

**GitHub:**
- Issue #1: `[ARCH] Step 1 — Architecture & Technical Design`
- PR #2: `feature/step1-architecture-mvp` → `main` (squash merged)
