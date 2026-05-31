# DataShare — Active Context

## Current Focus

**Step 3 — US03+US04 Authentication** ✅ COMPLETE (2026-05-31)

AuthModule implemented with 4 routes, JWT strategy, refresh token rotation, and 10 unit tests.
All 10 tests pass — auth.service.ts at 100% coverage. Fix v0.3.1: TS strict typing.

## Files Created/Modified in Step 3

```
backend/src/
├── prisma/
│   ├── prisma.module.ts    ← NEW: Global DB service module
│   └── prisma.service.ts   ← NEW: PrismaClient wrapper
├── auth/
│   ├── auth.module.ts      ← NEW: Auth NestJS module
│   ├── auth.controller.ts  ← NEW: 4 REST endpoints
│   ├── auth.service.ts     ← NEW: Business logic
│   ├── auth.service.spec.ts ← NEW: 10 unit tests
│   ├── dto/
│   │   ├── register.dto.ts ← NEW: Email + password validation
│   │   └── login.dto.ts    ← NEW: Email + password validation
│   └── guards/
│       └── jwt.guard.ts    ← NEW: Reusable JWT guard
├── app.module.ts            ← MODIFIED: imports PrismaModule + AuthModule
docs/backend/
└── 05-auth.md               ← NEW: Full auth documentation
CHANGELOG.md                  ← MODIFIED: added [0.3.0]
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
