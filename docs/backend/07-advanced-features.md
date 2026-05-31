# US07-US10 — Advanced Features

## Overview

Advanced file management features: password protection, anonymous upload, tagging, download history.

## US07: Password-Protected Files

### Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PUT | /api/files/:id/password | JWT | Set/update file password |
| DELETE | /api/files/:id/password | JWT | Remove password protection |

### Flow

1. Owner sets password via `PUT /api/files/:id/password` with `{ "password": "..." }`
2. Password is bcrypt-hashed (salt rounds 10) and stored in `files.password_hash`
3. Download flow checks `file.passwordHash` — if set, requires password verification
4. Owner can remove password via `DELETE /api/files/:id/password`

### DTOs

```typescript
// SetPasswordDto
{
  password: string  // min 4 characters
}
```

## US08: Anonymous Upload

### Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/files/anonymous | Public | Upload file without auth |

### Flow

1. No JWT required — `userId` is set to `null`
2. Files stored under `anonymous/` prefix in MinIO
3. Default expiry: 1 day (vs 7 days for authenticated uploads)
4. Same validation: file size limit, forbidden extensions

## US09: File Tagging

### Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PUT | /api/files/:id/tags | JWT | Set tags (replaces all) |
| GET | /api/files/:id/tags | JWT | Get file tags |

### Flow

1. Tags are normalized to lowercase, trimmed
2. Tags are upserted (created if not existing)
3. `PUT` replaces all existing file-tag associations
4. Max 10 tags per file, max 30 chars per tag

### DTOs

```typescript
// ManageTagsDto
{
  tags: string[]  // max 10 items, each max 30 chars
}
```

## US10: Download History

### Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/files/:id/history | JWT | Get download history (last 100) |

### Flow

1. Each download via `GET /api/download/:token` records an entry
2. Stored: fileId, tokenId, downloadedAt, ipAddress, userAgent
3. Owner can view last 100 downloads via history endpoint

### Database Schema

```
DownloadHistory:
  id           UUID PK
  fileId       UUID FK → files.id
  tokenId      UUID FK → download_tokens.id (nullable)
  downloadedAt TIMESTAMP
  ipAddress    VARCHAR(45) (nullable)
  userAgent    VARCHAR(500) (nullable)
```

## Environment Variables

No new environment variables required for US07-US10.
