# DataShare — System Patterns & Architecture Decisions

## Authentication Pattern

**Decision**: JWT Access Token (15min) + Refresh Token (7 days, HttpOnly cookie)

- **Context**: Specs require JWT (US03/US04). Need balance between security and UX for SPA.
- **Impact**: Short-lived access token limits exposure window. Refresh token in HttpOnly cookie protects against XSS.
- **Implementation**:
  - Access token: signed with HS256, contains `{ sub: user_id, email }`, 15min TTL
  - Refresh token: UUID stored as bcrypt hash in `RefreshToken` table, 7-day TTL
  - Cookie: `HttpOnly`, `Secure`, `SameSite=Strict`
  - Logout: revokes refresh token in DB (`is_revoked = true`)
- **Password hashing**: bcrypt with salt rounds = 12

## File Storage Pattern

**Decision**: MinIO with presigned URLs for downloads

- **Context**: Need S3-compatible storage, self-hosted for Docker Compose demo.
- **Impact**: Files are uploaded via NestJS (stream to MinIO), but downloads use presigned URLs (direct MinIO → client, no proxy overhead).
- **Implementation**:
  - Upload: `PUT` via `@aws-sdk/client-s3` in NestJS → MinIO
  - Download: NestJS generates presigned `GET` URL (5min TTL) → 302 redirect to client
  - Storage key: UUID-based (`{uuid}/{original_filename}`)
  - Max file size: 1 GB (validated server-side)
  - Forbidden extensions: `.exe`, `.bat`, `.cmd`, `.sh`, `.ps1` (configurable)

## Download Link Pattern

**Decision**: UUID v4 token, non-predictable, stored in DB with expiration

- **Context**: Links must be unique, non-guessable, and expire (US02, US10).
- **Impact**: Token is a UUID v4 (not sequential), stored in `DownloadToken` table with `expires_at`.
- **Implementation**:
  - Token: `crypto.randomUUID()` — 128-bit random
  - Default expiration: 7 days (configurable 1–7 days by user)
  - Download URL format: `GET /api/download/{token}`
  - Info endpoint: `GET /api/download/{token}/info` (shows metadata before download)

## Anonymous Upload Pattern (US07)

**Decision**: `user_id` nullable on `File` entity

- **Context**: US07 allows uploads without authentication.
- **Impact**: Anonymous files have `user_id = NULL`, no history, no management.
- **Implementation**: Separate endpoint `POST /api/files/anonymous` (public)

## Tag Management Pattern (US08)

**Decision**: Many-to-many relationship via `FileTag` junction table

- **Context**: Tags are free-text, max 30 chars, no duplicates per file.
- **Impact**: Separate `Tag` entity with unique name, linked via `FileTag`.
- **Implementation**: UPSERT tag by name, INSERT junction row, ignore duplicates.

## File Password Pattern (US09)

**Decision**: `password_hash` nullable on `File` entity

- **Context**: Optional password protection on file download.
- **Impact**: If set, password required before download is allowed.
- **Implementation**: bcrypt hash stored on `File`, verified at download time. Min 6 chars.

## Auto-Expiration Pattern (US10)

**Decision**: NestJS `@Cron` scheduler, daily purge at midnight

- **Context**: Files expire after configurable duration (1–7 days).
- **Impact**: CronJob runs daily, deletes expired files from MinIO + marks `is_deleted=true` in DB.
- **Implementation**:
  - Scheduler: `@Cron('0 0 * * *')` via `@nestjs/schedule`
  - Purge: SELECT expired → DELETE from MinIO → UPDATE `is_deleted=true` → invalidate tokens

## Error Handling Pattern

**Decision**: Standardized JSON error responses

- **Format**:
  ```json
  {
    "error": {
      "code": "NotFound",
      "message": "File not found"
    }
  }
  ```
- **Codes**: `ValidationError`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`, `LinkExpired`, `PasswordRequired`, `FileTooLarge`, `ForbiddenFileType`

## File Deletion Pattern (US06)

**Decision**: Physical deletion from MinIO + soft-delete in DB

- **Context**: Specs say deletion is irreversible and physical.
- **Impact**: Object deleted from MinIO, `is_deleted=true` in DB, all download tokens invalidated.
- **Implementation**: DELETE MinIO object → UPDATE File → UPDATE DownloadToken `expires_at=NOW()`
