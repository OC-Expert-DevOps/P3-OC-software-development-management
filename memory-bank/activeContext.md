# DataShare — Active Context

## Current Focus

**Step 1 — Architecture & Technical Design** ✅ COMPLETE (2026-05-31)

All 4 architecture deliverables produced. Issue #1 + PR #2 created on GitHub.

## Files Being Created

```
docs/architecture/
├── 01-architecture-overview.md
├── 02-database-schema.md
├── 03-sequence-diagrams.md
└── openapi.yaml
```

## Active Decisions

- NestJS chosen over Spring Boot / .NET Core / Symfony for TypeScript E2E consistency with React
- MinIO chosen as S3-compatible self-hosted storage for Docker Compose demo
- Prisma chosen over TypeORM for type-safe ORM with auto-generated types
- JWT access (15min) + refresh token (7d HttpOnly cookie) for auth

## Next Step

**Step 2 — Infrastructure setup**
- Docker Compose with all 5 services (nginx, frontend, backend, postgres, minio)
- Database schema initialization (Prisma migrations)
- MinIO bucket creation
- Nginx reverse proxy configuration
- `.env.example` with all required environment variables

## Risks & Attention Points

- 4-week timeline is tight — prioritize MVP (US01–US06) first
- MinIO presigned URLs must be tested for proper CORS configuration
- File size limit (1 GB) requires proper multipart handling and timeouts
