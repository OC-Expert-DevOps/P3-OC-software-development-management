# Active Context

## Current Focus
Frontend UI pages fully implemented and merged. All services operational.

## Recent Changes (2026-05-31)

### Issue #19 — MinIO Console Port (PR #20, merged)
- Exposed port 9001 on MinIO service in `infra/docker-compose.yml`
- MinIO console now accessible at `http://localhost:9001`

### Issue #21 — Frontend UI Pages (PR #22, merged)
- Implemented 5 functional pages: Login, Register, Dashboard, Upload, Download
- Added axios client with JWT interceptor + auto-refresh on 401
- Added AuthProvider context + useAuth hook
- Added Navbar + PrivateRoute components
- Protected routes redirect to login if not authenticated

### Issue #18 — Post-mortem
- Added `Closed by 3ecd73b` comment (no PR was created — process violation documented)
- Rule enforced: all fixes must go through `fix/<subject>` → PR → squash merge

## Architecture Frontend
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

## Services Status (verified)
- ✅ Frontend (Vite SPA on https://localhost)
- ✅ Backend API (/api/health → ok)
- ✅ MinIO console (http://localhost:9001)
- ✅ PostgreSQL (healthy)
- ✅ Nginx reverse proxy (ports 80/443)

## Next Steps
- End-to-end testing (register → login → upload → generate link → download)
- UI polish for investor demo
- Error handling improvements
- Memory bank final sync
