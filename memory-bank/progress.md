# Progress

## Completed

### 2026-05-31 — Infrastructure Setup (Issues #1-#10)
- Docker Compose with 5 services: nginx, frontend, backend, postgres, minio
- Nginx reverse proxy with self-signed TLS certs
- Backend NestJS with Prisma ORM + PostgreSQL
- MinIO S3-compatible object storage
- Health checks on postgres and minio

### 2026-05-31 — Backend API (Issues #11-#13)
- Auth module: register, login, logout, refresh (JWT + refresh tokens)
- Files module: upload (multipart), list, delete, metadata
- Download links module: generate signed temporary links, public download
- Prisma schema: User, File, DownloadLink entities

### 2026-05-31 — Bug Fixes
- Issue #18 (PR direct on main — process violation documented): Docker Dockerfile + MINIO_USE_SSL parsing
- Issue #19 (PR #20, squash-merged): MinIO console port 9001 exposed for dev

### 2026-05-31 — Frontend UI (Issue #21, PR #22, squash-merged)
- 5 functional pages: Login, Register, Dashboard, Upload, Download
- Axios client with JWT interceptor + auto-refresh on 401
- AuthProvider context + useAuth hook
- Navbar + PrivateRoute components
- Protected routes (dashboard, upload) redirect to login

### 2026-05-31 — E2E Tests Playwright (Issue #23, PR #24, squash-merged)
- 10 test specs covering US01-US10 (21 test cases total)
- Playwright config targeting https://localhost
- Page objects: Login, Register, Dashboard, Upload
- Auth fixture with registerAndLogin helper

### 2026-06-07 — E2E Infra Fixes (PR #25, squash-merged)
- Fix BigInt JSON serialization in main.ts (Prisma sizeBytes field)
- Fix RegisterDto: added optional `name` field (frontend sends it)
- Fix auth fixture: register redirects to /login not /dashboard
- Fix all specs: use registerAndLogin for authenticated tests
- Prisma db push: created missing database tables
- **Results: 2/20 → 17/21 tests passing**

## What Works
- ✅ Full backend API (auth, files, download links, tags, password, history)
- ✅ Frontend SPA with real pages and API integration
- ✅ Docker Compose deployment (all 5 services healthy)
- ✅ MinIO console accessible on localhost:9001
- ✅ Nginx reverse proxy with TLS
- ✅ E2E tests: 17/21 passing (register, login, logout, stats, password, tags, history, anonymous upload)

## What's Left
- [ ] Fix 4 remaining E2E tests (upload→dashboard file list display, userId mapping)
- [ ] Prisma migrations setup (currently using db push, need proper migrations)
- [ ] UI polish / styling for investor demo
- [ ] Production-ready deployment considerations
