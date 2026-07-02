# DataShare — API Test Report

**Date**: 2026-07-02  
**Environment**: Docker Compose (local) — `https://localhost/api`  
**Backend version**: commit `f6c2664` (main) + uncommitted changes  
**Tester**: Automated curl tests (26 scenarios)

---

## Summary

| Category | Total | ✅ Pass | ❌ Fail | ⚠️ Issue |
|----------|-------|---------|---------|----------|
| Health | 1 | 1 | 0 | 0 |
| Auth (US03/US04) | 5 | 5 | 0 | 0 |
| File Upload (US01) | 2 | 2 | 0 | 0 |
| File List/Get (US05) | 2 | 2 | 0 | 0 |
| File Stats (US06) | 1 | 1 | 0 | 0 |
| File Password (US07) | 2 | 2 | 0 | 0 |
| File Anonymous (US08) | 1 | 1 | 0 | 0 |
| File Tags (US09) | 2 | 2 | 0 | 0 |
| File History (US10) | 1 | 1 | 0 | 0 |
| Download Links (US02) | 4 | 4 | 0 | 0 |
| Download File | 2 | 2 | 0 | 0 |
| Security (no JWT) | 1 | 1 | 0 | 0 |
| File Delete (US06) | 1 | 1 | 0 | 0 |
| Logout | 1 | 1 | 0 | 0 |
| **TOTAL** | **26** | **26** | **0** | **0** |

**Result: 26/26 pass — All endpoints working ✅**

> **Note:** Initial run (pre-fix) was 19/26. After adding missing routes to `FilesController`
> and service methods to `FilesService`, all 26 tests pass.

---

## Detailed Results

### 1. Health Check

| # | Endpoint | Method | Auth | Expected | Actual | Status |
|---|----------|--------|------|----------|--------|--------|
| 1 | `/health` | GET | No | 200 | 200 | ✅ PASS |

**Response:**
```json
{"status":"ok","timestamp":"2026-07-02T03:44:08.593Z"}
```

---

### 2. Authentication (US03 + US04)

| # | Endpoint | Method | Scenario | Expected | Actual | Status |
|---|----------|--------|----------|----------|--------|--------|
| 2 | `/auth/register` | POST | Valid registration | 201 | 201 | ✅ PASS |
| 3 | `/auth/register` | POST | Duplicate email | 409 | 409 | ✅ PASS |
| 4 | `/auth/login` | POST | Valid credentials | 200 | 200 | ✅ PASS |
| 5 | `/auth/login` | POST | Bad password | 401 | 401 | ✅ PASS |
| 6 | `/auth/refresh` | POST | Valid refresh cookie | 200 | 200 | ✅ PASS |

**Register response (201):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6Ik...",
  "user": {"id": "1a7e7a05-...", "email": "test-apireport-...@example.com"}
}
```

**Duplicate (409):**
```json
{"message":"Email already registered","error":"Conflict","statusCode":409}
```

**Bad password (401):**
```json
{"message":"Invalid credentials","error":"Unauthorized","statusCode":401}
```

**Refresh (200):** Returns new `accessToken` + sets new refresh cookie.

---

### 3. File Upload (US01)

| # | Endpoint | Method | Scenario | Expected | Actual | Status |
|---|----------|--------|----------|----------|--------|--------|
| 7 | `/files/upload` | POST | Upload text file | 201 | 201 | ✅ PASS |
| 8 | `/files/upload` | POST | Upload with password | 201 | 201 | ✅ PASS |

**Upload response (201):**
```json
{
  "id": "4e6ccc8f-...",
  "originalName": "ds_test.txt",
  "sizeBytes": 25,
  "expiresAt": "2026-07-09T03:44:09.633Z"
}
```

**Upload with password:** File created with `passwordHash` set. ✅

---

### 4. File List & Get (US05)

| # | Endpoint | Method | Scenario | Expected | Actual | Status |
|---|----------|--------|----------|----------|--------|--------|
| 9 | `/files` | GET | List user files | 200 | 200 | ✅ PASS |
| 10 | `/files/:id` | GET | Get file by ID | 200 | 200 | ✅ PASS |

**List response:** Returns array with `hasPassword` flag. ✅  
**Get response:** Returns full file metadata including `storageKey`, `mimeType`, `sizeBytes`. ✅

---

### 5. File Stats (US06)

| # | Endpoint | Method | Scenario | Expected | Actual | Status |
|---|----------|--------|----------|----------|--------|--------|
| 11 | `/files/stats` | GET | User file stats | 200 | 200 | ✅ PASS |

**Response (after fix):**
```json
{"totalFiles":2,"activeFiles":2,"expiredFiles":0,"totalSizeBytes":"40"}
```

> **Fixed:** Added `@Get('stats')` route **before** `@Get(':id')` in `FilesController` + `getStats()` method in `FilesService`.

---

### 6. File Password Management (US07)

| # | Endpoint | Method | Scenario | Expected | Actual | Status |
|---|----------|--------|----------|----------|--------|--------|
| 12 | `/files/:id/password` | PUT | Set password | 200 | 200 | ✅ PASS |
| 13 | `/files/:id/password` | DELETE | Remove password | 204 | 204 | ✅ PASS |

**Set password (200):**
```json
{"message":"Password set"}
```

**Remove password (204):** Empty response, password hash cleared. ✅

> **Fixed:** Added `@Put(':id/password')` and `@Delete(':id/password')` routes + `setPassword()` / `removePassword()` methods.

---

### 7. Anonymous Upload (US08)

| # | Endpoint | Method | Scenario | Expected | Actual | Status |
|---|----------|--------|----------|----------|--------|--------|
| 21 | `/files/anonymous` | POST | Upload without auth | 201 | 201 | ✅ PASS |

**Response (201):**
```json
{"id":"21ce8d5c-...","userId":null,"originalName":"ds_anon.txt","sizeBytes":18,"expiresAt":"2026-07-03T..."}
```

> **Fixed:** Added `@Post('anonymous')` route **without** `@UseGuards(JwtGuard)` + `uploadAnonymous()` method (1-day expiry, no user association).

---

### 8. File Tags (US09)

| # | Endpoint | Method | Scenario | Expected | Actual | Status |
|---|----------|--------|----------|----------|--------|--------|
| 14 | `/files/:id/tags` | PUT | Set tags | 200 | 200 | ✅ PASS |
| 15 | `/files/:id/tags` | GET | Get tags | 200 | 200 | ✅ PASS |

**Set tags (200):**
```json
{"tags":["test","api","report"]}
```

**Get tags (200):** Returns same array. ✅

> **Fixed:** Added `@Put(':id/tags')` and `@Get(':id/tags')` routes + `setTags()` / `getTags()` methods using Tag/FileTag models.

---

### 9. Download History (US10)

| # | Endpoint | Method | Scenario | Expected | Actual | Status |
|---|----------|--------|----------|----------|--------|--------|
| 16 | `/files/:id/history` | GET | Download history | 200 | 200 | ✅ PASS |

**Response (200):** Returns empty array `[]` (no downloads recorded yet). ✅

> **Fixed:** Added `@Get(':id/history')` route + `getHistory()` method querying `DownloadHistory` model.

---

### 10. Download Links (US02)

| # | Endpoint | Method | Scenario | Expected | Actual | Status |
|---|----------|--------|----------|----------|--------|--------|
| 17 | `/files/:id/links` | POST | Create download link | 201 | 201 | ✅ PASS |
| 18 | `/files/:id/links` | GET | List active links | 200 | 200 | ✅ PASS |
| 22 | `/files/:id/links/:tokenId` | DELETE | Revoke link | 204 | 204 | ✅ PASS |
| 26 | `/download/:token` | GET | After revoke | 410 | 410 | ✅ PASS |

**Create link (201):**
```json
{
  "id": "02a0f4eb-...",
  "token": "aaba0c0e-...",
  "expiresAt": "2026-07-03T03:44:10.083Z",
  "maxDownloads": 5
}
```

**Revoked link (410):** Returns `Gone` — correct behavior. ✅

---

### 11. Public Download

| # | Endpoint | Method | Scenario | Expected | Actual | Status |
|---|----------|--------|----------|----------|--------|--------|
| 19 | `/download/:token/info` | GET | File info | 200 | 200 | ✅ PASS |
| 20 | `/download/:token` | GET | Stream file | 200 | 200 | ✅ PASS |

**Info response (200):**
```json
{"originalName":"ds_test.txt","mimeType":"text/plain","sizeBytes":"25","hasPassword":false}
```

**Download:** File content streamed correctly: `Hello DataShare API test`. ✅

---

### 12. Security & Cleanup

| # | Endpoint | Method | Scenario | Expected | Actual | Status |
|---|----------|--------|----------|----------|--------|--------|
| 24 | `/files` | GET | No JWT header | 401 | 401 | ✅ PASS |
| 23 | `/files/:id` | DELETE | Delete file | 204 | 204 | ✅ PASS |
| 25 | `/auth/logout` | POST | Logout | 204 | 204 | ✅ PASS |

**No JWT (401):**
```json
{"message":"Missing or invalid Authorization header","error":"Unauthorized","statusCode":401}
```

---

## Issues Summary

All issues have been resolved. ✅

### Previously Fixed Issues

| Issue | Severity | Root Cause | Fix Applied |
|-------|----------|------------|-------------|
| `GET /files/stats` → 500 | High | `"stats"` captured by `@Get(':id')` | Added `@Get('stats')` **before** `@Get(':id')` |
| 6 missing routes (US07-US10) | High | Service methods existed without controller routes | Added all 6 routes to `FilesController` |

---

## All Working Endpoints (26/26)

| Endpoint | Method | Auth | Status |
|----------|--------|------|--------|
| `/health` | GET | No | ✅ 200 |
| `/auth/register` | POST | No | ✅ 201 |
| `/auth/login` | POST | No | ✅ 200 |
| `/auth/refresh` | POST | Cookie | ✅ 200 |
| `/auth/logout` | POST | JWT | ✅ 204 |
| `/files/upload` | POST | JWT | ✅ 201 |
| `/files/anonymous` | POST | No | ✅ 201 |
| `/files` | GET | JWT | ✅ 200 |
| `/files/stats` | GET | JWT | ✅ 200 |
| `/files/:id` | GET | JWT | ✅ 200 |
| `/files/:id` | DELETE | JWT | ✅ 204 |
| `/files/:id/password` | PUT | JWT | ✅ 200 |
| `/files/:id/password` | DELETE | JWT | ✅ 204 |
| `/files/:id/tags` | PUT | JWT | ✅ 200 |
| `/files/:id/tags` | GET | JWT | ✅ 200 |
| `/files/:id/history` | GET | JWT | ✅ 200 |
| `/files/:id/links` | POST | JWT | ✅ 201 |
| `/files/:id/links` | GET | JWT | ✅ 200 |
| `/files/:id/links/:tokenId` | DELETE | JWT | ✅ 204 |
| `/download/:token/info` | GET | No | ✅ 200 |
| `/download/:token` | GET | No | ✅ 200 |

---

## Recommendations

1. **Consider**: Add `ParseUUIDPipe` on `:id` params to return 400 instead of 500 on invalid UUIDs
2. **Consider**: Split `FilesController` into sub-controllers if it grows further
