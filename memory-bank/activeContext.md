# DataShare — Active Context

## Current Focus

**Step 2 — Infrastructure Docker Compose & App Init** ✅ COMPLETE (2026-05-31)

All infrastructure files created. Backend (NestJS) and Frontend (React/Vite) initialized.

## Files Created in Step 2

```
├── .env.example
├── .gitignore (updated)
├── docker-compose.yml (5 services)
├── README.md (updated — 8 sections)
├── nginx/
│   └── nginx.conf
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   └── app.controller.ts (GET /health)
│   └── prisma/
│       └── schema.prisma (6 entities)
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       └── App.tsx (4 routes: /, /login, /register, /dashboard, /upload)
└── docs/infrastructure/
    └── 04-infrastructure-setup.md
```

## Active Decisions

- Docker Compose with 5 services on `datashare-net` bridge network
- Only Nginx exposed to host (ports 80/443), all others internal
- Healthchecks on postgres and minio (backend waits for healthy)
- Named volumes for data persistence (postgres-data, minio-data)
- Self-signed TLS certificates for dev (nginx/certs/ gitignored)
- Prisma schema maps to snake_case table/column names

## Next Step

**Step 3 — Backend API Implementation**
- Auth module (register, login, logout, refresh)
- Files module (upload, list, delete, metadata)
- Download module (generate token, public download)
- Tags module (CRUD)
- Prisma service + MinIO service
- Cron job for expired file cleanup

## Risks & Attention Points

- `npm ci` in Dockerfiles requires package-lock.json (generated on first `npm install`)
- Prisma migrations need running postgres (use `docker compose run backend npx prisma migrate dev`)
- MinIO bucket must be created before first upload
