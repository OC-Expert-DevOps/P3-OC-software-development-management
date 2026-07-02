# Active Context

## Current Focus
API backend fully functional — 26/26 endpoints tested and passing (all User Stories US01-US10).
Automatic cleanup cron job implemented. Swagger UI fully operational behind nginx.

## Recent Changes (2026-07-02)

### feat: automatic cleanup cron job
- **CleanupService** (`backend/src/cleanup/`): Hourly cron via `@nestjs/schedule` purges:
  - Expired files: delete from MinIO + soft-delete in DB + invalidate download tokens
  - Download tokens expired > 24h: hard-delete from DB
  - Refresh tokens expired/revoked > 24h: hard-delete from DB
- **CleanupModule** registered in `AppModule` with `ScheduleModule.forRoot()`
- **Documentation**: `docs/maintenance/MAINTENANCE.md` updated with retention tables and cleanup flow
- **Architecture**: `memory-bank/systemPatterns.md` updated with cleanup decision

### fix: Swagger UI fully functional behind nginx
- **Base path**: Added `.addServer('/api', 'Behind nginx reverse-proxy')` in `main.ts`
- **JWT auth**: Added `@ApiBearerAuth()` on all 14 protected routes (FilesController, DownloadController, AuthController)
- **API tags**: Added `@ApiTags('Files')`, `@ApiTags('Downloads')` for endpoint grouping
- **Result**: Swagger UI at `https://localhost/api/docs` now correctly sends JWT and routes through nginx

### fix: add missing controller routes for US06-US10
- **FilesService**: Added 7 methods — `getStats()`, `setPassword()`, `removePassword()`, `uploadAnonymous()`, `setTags()`, `getTags()`, `getHistory()`
- **FilesController**: Added 7 routes — `GET /files/stats`, `PUT/DELETE /files/:id/password`, `POST /files/anonymous`, `PUT/GET /files/:id/tags`, `GET /files/:id/history`
- **Bug fixed**: `GET /files/stats` was returning 500 because `"stats"` was captured by `@Get(':id')` — fixed by declaring `@Get('stats')` before `@Get(':id')`
- **API Test Report**: `docs/testing/09-api-test-report.md` — 26 curl scenarios, all passing
- **Result**: 19/26 → 26/26 ✅

## Previous Changes (2026-06-28)

### feat: refonte frontend pixel-perfect Figma (PR #52)
- **Navbar.tsx**: Simplified — "DataShare" text logo + buttons with outlined style
- **LoginPage.tsx**: Centered white card on gradient, "Connexion" title
- **RegisterPage.tsx**: Same card layout, "Créer un compte" title
- **DashboardPage.tsx**: Split layout — left side gradient with upload CTA, right white panel with file list
- **UploadPage.tsx**: Drag-drop zone on gradient, file confirmation card
- **DownloadPage.tsx**: White card with green callout, file details, download button

### Design System (from Figma)
- **Gradient**: `linear-gradient(135deg, #D4785C, #E8A4A0, #F0C4B8)`
- **Primary color**: `#D4785C` (coral/salmon)
- **Font**: Inter (Google Fonts)
- **Cards**: White (`rgba(255,255,255,0.95)`), `border-radius: 16px`, shadow

## Next Steps
- [ ] Docker Compose production profile (post-MVP)
- [ ] Consider adding unit tests for CleanupService
- [ ] Update OpenAPI spec (`docs/architecture/openapi.yaml`) to match current 17 routes
