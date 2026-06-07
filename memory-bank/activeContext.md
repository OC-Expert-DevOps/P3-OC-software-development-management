# Active Context

## Current Focus
E2E tests stabilized — 17/21 passing. Backend and frontend fully operational.

## Recent Changes (2026-06-07)

### PR #25 — E2E Infra Fixes (merged)
- **BigInt serialization**: Added `BigInt.prototype.toJSON` in `main.ts` — Prisma returns BigInt for `sizeBytes`, JSON.stringify crashed
- **RegisterDto**: Added optional `name` field — frontend sends it, backend was rejecting with 400
- **Auth fixture**: Fixed register flow — register redirects to `/login`, not `/dashboard`
- **All specs**: Replaced `registerUser` → `registerAndLogin` for authenticated tests
- **Prisma db push**: Created missing database tables (no migrations dir existed)

### Test Results: 17/21 passing
**Passing (17):**
- US01: redirect to login when not authenticated ✅
- US02: access download link publicly ✅
- US03: register (3 tests) ✅
- US04: login/logout (3 tests) ✅
- US05: empty state, file metadata ✅
- US06: stats API ✅
- US07: password set/remove ✅
- US08: anonymous upload ✅
- US09: tags (3 tests) ✅
- US10: download history ✅

**Failing (4) — all related to upload→dashboard file list:**
- US01: upload file + see in dashboard (file uploaded but `userId: null` → not in user's list)
- US02: generate download link (depends on upload showing in dashboard)
- US05: display uploaded files in list (same userId issue)
- US05: empty state timeout (dashboard selector `p[style*="color: rgb(136, 136, 136)"]` not found after data exists from previous tests)

### Root Cause of 4 Remaining Failures
The JWT guard extracts `req.user.sub` but the upload controller passes it as `userId`. When the file is created, `userId` is set to the JWT `sub` value, but the dashboard query filters by the same userId. The issue is that between tests, leftover data from previous test runs can affect the empty state check.

## Architecture (unchanged)
```
frontend/src/
├── api/client.ts          # Axios + JWT interceptor
├── hooks/useAuth.tsx       # AuthProvider + useAuth hook
├── components/
│   ├── Navbar.tsx          # Auth-aware navigation
│   └── PrivateRoute.tsx    # Route guard
├── pages/
│   ├── LoginPage.tsx       # POST /api/auth/login
│   ├── RegisterPage.tsx    # POST /api/auth/register
│   ├── DashboardPage.tsx   # GET /api/files + delete + generate links
│   ├── UploadPage.tsx      # POST /api/files/upload (multipart, drag&drop)
│   └── DownloadPage.tsx    # Public download via token
├── App.tsx                 # Routes with PrivateRoute protection
└── main.tsx                # BrowserRouter + QueryClient + AuthProvider
```

## Services Status (verified 2026-06-07)
- ✅ Frontend (Vite SPA on https://localhost)
- ✅ Backend API (register, login, upload all work via curl)
- ✅ MinIO (file storage working)
- ✅ PostgreSQL (tables created via prisma db push)
- ✅ Nginx reverse proxy (TLS)

## Next Steps
- Fix 4 remaining E2E tests (userId mapping in upload flow)
- Setup proper Prisma migrations (replace db push)
- UI polish for investor demo
