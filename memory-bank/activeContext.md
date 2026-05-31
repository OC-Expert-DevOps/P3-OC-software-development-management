# DataShare — Active Context

## Current Focus

**Step 1 — Architecture & Technical Design** (started 2026-05-31)

Producing the 4 architecture deliverables:
1. Architecture overview diagram + technology choices table
2. Database schema (MCD) — 6 entities covering US01–US10
3. Sequence diagrams — 8 flows covering all user stories
4. API contract — OpenAPI 3.0 YAML (14 routes)

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

Step 2 — Infrastructure setup (Docker Compose, database init, MinIO config)

## Risks & Attention Points

- 4-week timeline is tight — prioritize MVP (US01–US06) first
- MinIO presigned URLs must be tested for proper CORS configuration
- File size limit (1 GB) requires proper multipart handling and timeouts
