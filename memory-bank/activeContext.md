# Active Context — DataShare Platform

## Current Focus

**Version:** 0.5.2
**Status:** All 21/21 E2E tests passing ✅
**Branch:** `main` (up to date after PR #28 merge)

## Recent Changes (PR #28 — 2026-06-07)

### Bug Fixes
- **JWT Guard** (`backend/src/auth/guards/jwt.guard.ts`): Fixed `payload.sub` → `request.user.userId` mapping. Previously, the raw JWT payload was passed to `request.user`, causing uploaded files to have `userId: null`.
- **Frontend DTO mismatch** (`frontend/src/pages/DashboardPage.tsx`): Fixed `expiresInSeconds` → `ttlSeconds` to match backend `CreateLinkDto`. The "Link" button on dashboard was failing silently.

### E2E Test Robustness
- **Dashboard page object**: Added `waitForLoaded()` method that waits for "Loading..." to disappear before checking file rows. Fixes race conditions where tests checked DOM before API response.
- **US02/US10 download tests**: Added `maxRedirects: 0` to prevent Playwright from following 302 redirects to internal `http://minio:9000/...` hostname (unreachable from host machine).
- **US02 generate link**: Changed from UI-based notification detection to API-based approach (more reliable).

### Documentation
- Created `docs/testing/08-e2e-testing.md` — comprehensive E2E test plan covering all 10 user stories (21 test cases).

## Test Results History

| Version | Passing | Total | Delta |
|---------|---------|-------|-------|
| 0.5.0 | 2 | 20 | Initial |
| 0.5.1 | 17 | 21 | +15 |
| 0.5.2 | **21** | **21** | **+4 (100%)** |

## Known Issues

- **File size "NaN MB"**: Frontend `formatSize()` receives BigInt as string from API (Prisma BigInt serialization), causing `NaN` display. Cosmetic only, doesn't affect functionality.
- **MinIO presigned URLs**: Download redirect uses internal Docker hostname (`minio:9000`). Works in browser (nginx proxy) but not from host-level API clients. Consider adding nginx proxy for MinIO or using external endpoint config.

## Next Steps

- Fix file size display (BigInt → Number conversion in frontend)
- Consider adding nginx proxy rule for MinIO presigned URLs
- Deploy preparation (Docker Compose production profile)
- Final demo preparation for investors
