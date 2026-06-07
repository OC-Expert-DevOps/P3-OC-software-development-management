# Testing Strategy — DataShare

## Overview

DataShare uses a multi-layer testing approach combining unit tests, integration tests (via Docker Compose), and end-to-end (E2E) tests with Playwright.

## Unit Tests (Backend — Jest)

### Running Tests

```bash
cd backend
npm test              # Run all tests
npm run test:cov      # Run with coverage report
```

### Coverage Threshold

| Metric     | Threshold | Current |
|------------|-----------|---------|
| Statements | 70%       | 72.82%  |
| Branches   | 50%       | 80%     |
| Functions  | 60%       | 66.66%  |
| Lines      | 70%       | 72.31%  |

Coverage is collected from business logic files (`*.service.ts`, `*.controller.ts`, `*.guard.ts`), excluding module wiring and DTOs.

### Test Structure

| File | Tests | Description |
|------|-------|-------------|
| `auth.service.spec.ts` | 14 | Registration, login, logout, refresh, JWT generation |
| `auth.controller.spec.ts` | 4 | Controller endpoints (register, login, logout, refresh) |
| `jwt.guard.spec.ts` | 5 | Bearer token extraction, validation, error handling |
| `files.service.spec.ts` | 28 | Upload, list, delete, password, anonymous upload, tags, history |
| `download.service.spec.ts` | 13 | Link creation, token usage, revocation, expiry |
| `download.controller.spec.ts` | 4 | Controller endpoints (create, list, revoke, download) |

### Testing Patterns

- **Service tests** mock `PrismaService`, `MinioService`, and `ConfigService`
- **Controller tests** mock their respective services + `ConfigService` (for JwtGuard)
- **Guard tests** mock `jsonwebtoken` module and test token extraction/validation
- All tests use `@nestjs/testing` `TestingModule` for proper DI

## E2E Tests (Playwright)

### Prerequisites

- Docker Compose stack running: `make up`
- Frontend accessible at `http://localhost:3000`

### Running E2E Tests

```bash
cd e2e
npm install
npx playwright test           # Run all E2E tests
npx playwright test --ui      # Interactive mode
npx playwright show-report    # View HTML report
```

### E2E Test Coverage

| Test File | User Story | Description |
|-----------|-----------|-------------|
| `us01-upload.spec.ts` | US01 | File upload flow |
| `us02-download-links.spec.ts` | US02 | Download link generation |
| `us03-register.spec.ts` | US03 | User registration |
| `us04-login.spec.ts` | US04 | User login |
| `us05-file-list.spec.ts` | US05 | File listing/dashboard |
| `us06-stats.spec.ts` | US06 | Usage statistics |
| `us07-password.spec.ts` | US07 | File password protection |
| `us08-anonymous-upload.spec.ts` | US08 | Anonymous upload |
| `us09-tags.spec.ts` | US09 | File tagging |
| `us10-history.spec.ts` | US10 | Download history |

### Page Object Pattern

E2E tests use the Page Object pattern (`e2e/pages/`) for maintainable selectors:
- `LoginPage`, `RegisterPage`, `DashboardPage`, `UploadPage`

## CI Integration

Tests are intended to run in CI with:

```bash
# Unit tests (fast, no dependencies)
cd backend && npm test

# E2E tests (requires Docker stack)
make up
cd e2e && npx playwright test
```

## Adding New Tests

1. **Service test**: Create `*.service.spec.ts` alongside the service, mock dependencies via `TestingModule`
2. **Controller test**: Create `*.controller.spec.ts`, mock the service + `ConfigService`
3. **E2E test**: Create `e2e/tests/usXX-*.spec.ts`, use Page Objects for interactions
