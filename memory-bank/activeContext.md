# DataShare — Active Context

## Current Focus

**Step 4 — US01 File Upload (GitHub Copilot)** 🟡 IN PROGRESS (2026-05-31)

Scaffold ready: skeleton files + Copilot prompts + supervision log template.
Waiting for developer to generate code with GitHub Copilot, then review and commit.

## Files Created in Step 4 Scaffold

```
backend/src/
├── minio/
│   ├── minio.module.ts         ← SKELETON: Copilot Prompt 1
│   └── minio.service.ts        ← SKELETON: Copilot Prompt 1
├── files/
│   ├── files.module.ts         ← SKELETON: Copilot Prompt 3
│   ├── files.controller.ts     ← SKELETON: Copilot Prompt 3
│   ├── files.service.ts        ← SKELETON: Copilot Prompt 2
│   ├── files.service.spec.ts   ← SKELETON: Copilot Prompt 4
│   └── dto/
│       └── upload-file.dto.ts  ← SKELETON: Copilot Prompt 2
docs/ai-usage/
├── us01-copilot-prompts.md     ← 4 prompts for Copilot Chat
└── us01-supervision-log.md     ← Template for human review
```

## Active Decisions

- JWT HS256 access token (15min) + UUID v4 refresh token (7d, bcrypt hash in DB)
- Refresh token in HttpOnly cookie (Secure, SameSite=Strict, path /api/auth)
- Token rotation on each refresh (old token revoked)
- Password: bcrypt salt rounds = 10, min 8 chars
- Email normalized to lowercase before storage/lookup
- PrismaModule is @Global() — available to all modules without explicit import

## Next Step

**Step 4 — US01: File Upload**
- MinIO service module (upload, delete, presigned URL)
- Files module (upload, anonymous upload, list, delete, metadata)
- Integration with auth (JwtGuard on protected routes)

## Risks & Attention Points

- `npm ci` in Dockerfiles requires package-lock.json (generated on first `npm install`)
- Prisma migrations need running postgres (`docker compose run backend npx prisma migrate dev`)
- MinIO bucket must be created before first upload
- Refresh token lookup iterates all non-revoked tokens (acceptable for MVP, not for scale)
