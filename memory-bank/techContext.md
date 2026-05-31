# DataShare — Technical Context

## Technology Stack

| Layer | Technology | Version | Role |
|-------|-----------|---------|------|
| Back-end | NestJS (TypeScript) | 10.x | REST API, auth, business logic |
| Front-end | React + Vite (TypeScript) | React 18.x | SPA, user interface |
| Database | PostgreSQL | 16-alpine | Relational data storage |
| ORM | Prisma | 5.x | Type-safe ORM, migrations, schema |
| Storage | MinIO | latest | S3-compatible object storage |
| Auth | JWT (jsonwebtoken) | — | Access tokens (15min) + refresh tokens (7d) |
| Password hashing | bcrypt | — | Salt rounds: 10 |
| Reverse Proxy | Nginx | alpine | HTTPS termination, routing |
| Deployment | Docker Compose | v2 | Local demo orchestration (5 services) |
| Testing (unit) | Jest | — | NestJS native, backend unit tests |
| Testing (E2E) | Cypress | — | End-to-end scenarios (required by specs) |
| Lint/Format | ESLint + Prettier | — | TypeScript code quality |
| Scheduler | @nestjs/schedule (cron) | — | Auto-expiration of files (US10) |
| API Docs | @nestjs/swagger | — | Swagger UI at /api/docs |

## Docker Compose Architecture

### Services (infra/docker-compose.yml)

| Service | Image | Internal Port | Exposed Port | Depends On | Healthcheck |
|---------|-------|--------------|--------------|------------|-------------|
| nginx | nginx:alpine | 80, 443 | 80, 443 | frontend, backend | — |
| frontend | local build (../frontend) | 3000 | — | — | — |
| backend | local build (../backend) | 3001 | — | postgres (healthy), minio (healthy) | — |
| postgres | postgres:16-alpine | 5432 | — | — | pg_isready |
| minio | minio/minio:latest | 9000, 9001 | — | — | mc ready |

### Network & Volumes

- **Network**: `datashare-net` (bridge) — all services internal
- **Exposed**: Only Nginx on host ports 80/443
- **Volumes**: `postgres-data` (DB), `minio-data` (files)
- **Data persistence**: `make down` preserves, `make reset` destroys

### Nginx Routing

| Request Path | Target | Protocol |
|-------------|--------|----------|
| `/` | frontend:3000 | HTTP |
| `/api/` | backend:3001 | HTTP (strip nothing) |

TLS: Self-signed certificates (`infra/nginx/certs/`, gitignored).

## Project Structure

```
├── backend/              ← NestJS app (with Dockerfile)
│   ├── src/              ← Application source
│   └── prisma/           ← Schema + migrations
├── frontend/             ← React/Vite app (with Dockerfile)
│   └── src/              ← Application source
├── infra/                ← Infrastructure files
│   ├── docker-compose.yml
│   └── nginx/nginx.conf
├── docs/                 ← Architecture + infrastructure docs
├── memory-bank/          ← Implementation documentation
├── Makefile              ← Dev shortcuts
├── .env.example          ← 18 variables documented
└── README.md             ← 8 sections
```

## Makefile Commands

| Command | Action |
|---------|--------|
| `make up` | Build + start all services |
| `make up-d` | Build + start in background |
| `make down` | Stop (data preserved) |
| `make reset` | Stop + delete all data |
| `make logs` | Follow all logs |
| `make certs` | Generate self-signed TLS certs |
| `make test-backend` | Run backend tests |
| `make test-backend-cov` | Backend tests + coverage |
| `make lint-frontend` | Frontend ESLint |

## Constraints

- **Timeline**: 4 weeks to MVP demo
- **Audience**: investor demo — must look polished and professional
- **Stack constraints** (from specs):
  - Back-end: must be one of Spring Boot / .NET Core / NestJS / Symfony → **NestJS chosen**
  - Front-end: must be one of Angular / React / VueJS → **React chosen**
  - Database: must be PostgreSQL or MongoDB → **PostgreSQL chosen**
  - Storage: must be local filesystem or AWS S3 → **MinIO (S3-compatible) chosen**
- **Testing**: Jest for unit tests (70% coverage target), Cypress for E2E (2-3 critical scenarios minimum)
- **Git**: conventional commits, branch protection on `main`

## Development Environment

- **Package manager**: npm
- **Node.js**: 20.x LTS (Alpine in Docker)
- **TypeScript**: 5.x (strict mode)
- **IDE**: VS Code with ESLint + Prettier extensions
- **Prisma schema**: snake_case mapping (`@@map`, `@map`) for DB tables/columns
