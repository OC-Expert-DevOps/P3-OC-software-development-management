# Changelog

All notable changes to this project will be documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

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
