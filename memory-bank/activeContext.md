# DataShare — Active Context

## Current Focus

**Step 4b — US02 Download Links COMPLETE** ✅ (2026-05-31)

**Next: Step 4c — US05+US06 List & Delete enhancements** (Issue #12)

## Completed in Step 4b (US02)

### Files Added/Modified
```
backend/src/
├── app.module.ts                 ← DownloadModule registered
├── download/
│   ├── download.module.ts        ← NestJS module (imports MinioModule)
│   ├── download.controller.ts    ← 3 JWT routes + 1 public route
│   ├── download.service.ts       ← createLink, findByFile, revokeLink, useToken
│   ├── download.service.spec.ts  ← 10 unit tests
│   └── dto/
│       └── create-link.dto.ts    ← ttlSeconds, maxDownloads
backend/prisma/schema.prisma      ← maxDownloads field added
docs/backend/06-download-links.md ← Full documentation
.env.example                      ← DOWNLOAD_LINK_TTL_SECONDS=86400
```

### Routes Added
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/files/:id/links | JWT | Generate download token |
| GET | /api/files/:id/links | JWT | List active tokens |
| DELETE | /api/files/:id/links/:tokenId | JWT | Revoke token |
| GET | /api/download/:token | Public | 302 → MinIO presigned URL |

## Active Decisions

- JWT HS256 access token (15min) + UUID v4 refresh token (7d, bcrypt hash in DB)
- Refresh token in HttpOnly cookie (Secure, SameSite=Strict, path /api/auth)
- Token rotation on each refresh (old token revoked)
- File storage: MinIO via AWS SDK v3 (S3-compatible)
- Soft-delete pattern: `isDeleted` flag (no physical DB delete)
- Download tokens: UUID v4, configurable TTL + maxDownloads
- Public download: HTTP 302 redirect to MinIO presigned URL (5min TTL)
- Token revocation: set `expiresAt` to current timestamp

## Next Steps

1. **Step 4c — US05+US06: List & Delete enhancements** (Issue #12)
   - Pagination for GET /api/files (page, limit, sortBy, order)
   - GET /api/files/stats (fileCount, totalSizeBytes)

2. **Step 4d — US07-US10: Advanced Features** (Issue #13)
   - US07: Password-protected files
   - US08: Anonymous upload
   - US09: File tagging
   - US10: Download history

## Risks & Attention Points

- Prisma migrations need running postgres
- MinIO bucket auto-created on startup via `onModuleInit`
- BigInt serialization: Prisma BigInt fields need custom serialization for JSON
- Refresh token lookup iterates all non-revoked tokens (acceptable for MVP)
