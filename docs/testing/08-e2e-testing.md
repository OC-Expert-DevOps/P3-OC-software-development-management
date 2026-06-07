# E2E Testing — DataShare Platform

## Overview

End-to-end tests use **Playwright** (Chromium) to validate all user stories through the full stack (frontend → nginx → backend → PostgreSQL + MinIO).

## Prerequisites

```bash
# Infrastructure must be running
cd infra && docker compose up -d

# Prisma tables must exist
docker compose exec backend npx prisma db push

# Install Playwright
cd e2e && npm install && npx playwright install chromium
```

## Running Tests

```bash
cd e2e

# Run all tests
npx playwright test

# Run a specific US
npx playwright test tests/us01-upload.spec.ts

# Run with visible browser
npx playwright test --headed

# Run with detailed output
npx playwright test --reporter=list
```

## Test Configuration

| Setting | Value |
|---------|-------|
| Base URL | `https://localhost` |
| Browser | Chromium (headless) |
| TLS | Self-signed cert bypass (`ignoreHTTPSErrors: true`) |
| Timeout | 30s (test), 15s (navigation) |
| Workers | 1 (sequential — shared DB state) |

---

## User Stories — Test Details

### US01 — File Upload (authenticated)

**File:** `tests/us01-upload.spec.ts`

| Test | Description | Steps | Expected |
|------|-------------|-------|----------|
| Upload file + see in dashboard | Authenticated user uploads a file via UI | 1. Register + login 2. Navigate to `/upload` 3. Select `test-file.txt` via file input 4. Click submit 5. Wait for redirect to `/dashboard` | File appears in dashboard list with name "test-file.txt" |
| Redirect to login when not authenticated | Unauthenticated user visits `/upload` | 1. Navigate to `/upload` without login | Redirected to `/login` |

**Preconditions:** Infrastructure running, clean user (unique email per test run)
**Test data:** `e2e/fixtures/test-file.txt` (small text file)

---

### US02 — Download Links

**File:** `tests/us02-download-links.spec.ts`

| Test | Description | Steps | Expected |
|------|-------------|-------|----------|
| Generate download link | Create a temporary download link for uploaded file | 1. Register + login + upload file 2. On dashboard, click "Link" button on file row 3. Copy generated link | Link URL is displayed, contains `/download/` path |
| Access link publicly | Download file without authentication | 1. Register + login + upload + generate link 2. Open new incognito context 3. Navigate to download link | File downloads successfully (HTTP 200 or 302) |

**Preconditions:** At least one uploaded file
**API used:** `POST /api/files/:id/links`, `GET /api/download/:token`

---

### US03 — User Registration

**File:** `tests/us03-register.spec.ts`

| Test | Description | Steps | Expected |
|------|-------------|-------|----------|
| Register new user | Successful registration | 1. Navigate to `/register` 2. Fill email + password (min 8 chars) 3. Submit | Redirect to `/login`, no error |
| Duplicate email error | Register with existing email | 1. Register user A 2. Try to register with same email | Error message "already exists" shown |
| Short password validation | HTML5 validation for password < 8 | 1. Navigate to `/register` 2. Enter password with < 8 chars 3. Submit | Form validation prevents submission (HTML5 `minLength`) |

**Preconditions:** None
**API used:** `POST /api/auth/register`

---

### US04 — User Login / Logout

**File:** `tests/us04-login.spec.ts`

| Test | Description | Steps | Expected |
|------|-------------|-------|----------|
| Login with valid credentials | Successful authentication | 1. Register user 2. Navigate to `/login` 3. Enter valid credentials 4. Submit | Redirect to `/dashboard`, JWT stored in localStorage |
| Wrong password error | Authentication failure | 1. Register user 2. Try login with wrong password | Error message displayed, stays on `/login` |
| Logout | Session termination | 1. Login successfully 2. Click logout button | Redirect to `/login`, JWT removed from localStorage |

**Preconditions:** Registered user (tests create their own)
**API used:** `POST /api/auth/login`, `POST /api/auth/logout`

---

### US05 — File List (paginated)

**File:** `tests/us05-file-list.spec.ts`

| Test | Description | Steps | Expected |
|------|-------------|-------|----------|
| Empty state | Dashboard with no files | 1. Register + login (fresh user) 2. Navigate to `/dashboard` | Empty state message displayed |
| Display uploaded files | Files appear in list | 1. Register + login + upload file 2. Navigate to `/dashboard` | File row visible with filename |
| Show file metadata | File details displayed | 1. Register + login + upload 2. Check file row | Name, type, size, date visible |

**Preconditions:** Fresh user for empty state test
**API used:** `GET /api/files?page=1&limit=20`

---

### US06 — User Statistics

**File:** `tests/us06-stats.spec.ts`

| Test | Description | Steps | Expected |
|------|-------------|-------|----------|
| Stats via API | Get user file statistics | 1. Register + login (get JWT) 2. Call `GET /api/files/stats` with Bearer token | Response 200, body contains `fileCount`, `totalSizeBytes`, `activeLinks` |

**Preconditions:** Authenticated user
**API used:** `GET /api/files/stats`
**Note:** This test uses Playwright's `request` API (no UI interaction)

---

### US07 — Password Protection

**File:** `tests/us07-password.spec.ts`

| Test | Description | Steps | Expected |
|------|-------------|-------|----------|
| Set password on file | Protect file with password | 1. Register + login + upload file 2. Call `PUT /api/files/:id/password` with `{"password": "secret123"}` | Response 200, message "Password set successfully" |
| Remove password | Unprotect file | 1. Set password on file 2. Call `DELETE /api/files/:id/password` | Response 204 |

**Preconditions:** Uploaded file owned by user
**API used:** `PUT /api/files/:id/password`, `DELETE /api/files/:id/password`
**Note:** Uses Playwright `request` API after UI-based upload

---

### US08 — Anonymous Upload

**File:** `tests/us08-anonymous-upload.spec.ts`

| Test | Description | Steps | Expected |
|------|-------------|-------|----------|
| Anonymous file upload | Upload without authentication | 1. Call `POST /api/files/anonymous` with multipart file data (no Bearer token) | Response 201 with file object (userId: null, expiresAt: +1 day) |

**Preconditions:** None (public endpoint)
**API used:** `POST /api/files/anonymous`
**Note:** Pure API test, no UI involved

---

### US09 — File Tags

**File:** `tests/us09-tags.spec.ts`

| Test | Description | Steps | Expected |
|------|-------------|-------|----------|
| Add tags to file | Set tags via API | 1. Register + login + upload file 2. Call `PUT /api/files/:id/tags` with `{"tags": ["doc", "important"]}` | Response 200, file returned with `fileTags` containing tag objects |
| Normalize to lowercase | Tags are lowercased | 1. Upload file 2. Set tags `["Doc", "IMPORTANT"]` 3. Get tags | All tags returned in lowercase |
| Reject > 10 tags | Validation limit | 1. Upload file 2. Try to set 11 tags | Response 400 (Bad Request) |

**Preconditions:** Uploaded file owned by user
**API used:** `PUT /api/files/:id/tags`, `GET /api/files/:id/tags`

---

### US10 — Download History

**File:** `tests/us10-history.spec.ts`

| Test | Description | Steps | Expected |
|------|-------------|-------|----------|
| Record download events | Track file downloads | 1. Register + login + upload file 2. Generate download link 3. Access download link 4. Call `GET /api/files/:id/history` | Response 200, array with at least 1 entry containing `downloadedAt`, `ipAddress` |

**Preconditions:** File with download link, at least one download
**API used:** `GET /api/files/:id/history`

---

## Test Architecture

```
e2e/
├── playwright.config.ts       # Chromium, baseURL, timeouts
├── fixtures/
│   ├── auth.fixture.ts        # registerAndLogin helper (unique email)
│   └── test-file.txt          # Sample upload file
├── pages/
│   ├── login.page.ts          # LoginPage object
│   ├── register.page.ts       # RegisterPage object
│   ├── dashboard.page.ts      # DashboardPage object
│   └── upload.page.ts         # UploadPage object
└── tests/
    ├── us01-upload.spec.ts    # 2 tests
    ├── us02-download-links.spec.ts  # 2 tests
    ├── us03-register.spec.ts  # 3 tests
    ├── us04-login.spec.ts     # 3 tests
    ├── us05-file-list.spec.ts # 3 tests
    ├── us06-stats.spec.ts     # 1 test
    ├── us07-password.spec.ts  # 2 tests
    ├── us08-anonymous-upload.spec.ts # 1 test
    ├── us09-tags.spec.ts      # 3 tests
    └── us10-history.spec.ts   # 1 test
```

**Total: 21 test cases across 10 specs**

## Auth Helper

All authenticated tests use `registerAndLogin()` from `fixtures/auth.fixture.ts`:

```typescript
// Registers a new user with unique email, then logs in
// Returns { email, password } for API-level usage
export async function registerAndLogin(page: Page, user: { email: string; password: string }) {
  // 1. Register → redirects to /login
  // 2. Login → redirects to /dashboard
  // 3. User is authenticated with JWT in localStorage
}
```

Each test run uses a unique email (`test-<timestamp>-<random>@example.com`) to avoid conflicts.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| All tests fail with 500 | Run `docker compose exec backend npx prisma db push` |
| Register returns 400 | Check `RegisterDto` accepts `name` (optional) |
| Upload returns 500 | Check BigInt serialization in `main.ts` |
| Files have `userId: null` | Check JWT guard maps `sub` → `userId` |
| Empty state timeout | Previous test data may interfere — use fresh user |
