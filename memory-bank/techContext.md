# DataShare — Technical Context

## Technology Stack

| Layer | Technology | Version | Role |
|-------|-----------|---------|------|
| Back-end | NestJS (TypeScript) | 10.x | REST API, auth, business logic |
| Front-end | React + Vite (TypeScript) | React 18.x | SPA, user interface |
| Database | PostgreSQL | 16.x | Relational data storage |
| ORM | Prisma | 5.x | Type-safe ORM, migrations |
| Storage | MinIO | latest | S3-compatible object storage |
| Auth | JWT (jsonwebtoken) | — | Access tokens (15min) + refresh tokens (7d) |
| Reverse Proxy | Nginx | alpine | HTTPS termination, routing |
| Deployment | Docker Compose | v2 | Local demo orchestration |
| Testing (unit) | Jest | — | NestJS native, backend unit tests |
| Testing (E2E) | Cypress | — | End-to-end scenarios (required by specs) |
| Lint/Format | ESLint + Prettier | — | TypeScript code quality |
| Scheduler | @nestjs/schedule (cron) | — | Auto-expiration of files (US10) |

## Docker Services

| Service | Port (internal) | Port (host) | Network |
|---------|----------------|-------------|---------|
| nginx | 80/443 | 443 | datashare-net |
| frontend (React) | 3000 | — | datashare-net |
| backend (NestJS) | 3001 | — | datashare-net |
| postgres | 5432 | — | datashare-net |
| minio | 9000 (API) / 9001 (console) | — | datashare-net |

> Only Nginx is exposed publicly on host port 443. All other services communicate internally via `datashare-net`.

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

- **Package manager**: npm (or pnpm)
- **Node.js**: 20.x LTS
- **TypeScript**: 5.x (strict mode)
- **IDE**: VS Code with ESLint + Prettier extensions
