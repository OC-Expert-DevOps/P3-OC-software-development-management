# DataShare — Progress

## Timeline

| Date | Step | Status | Details |
|------|------|--------|---------|
| 2026-05-31 | Step 1 — Architecture & Design | 🔄 In Progress | Architecture diagrams, MCD, sequence flows, OpenAPI contract |
| — | Step 2 — Infrastructure | ⏳ Planned | Docker Compose, PostgreSQL, MinIO, Nginx setup |
| — | Step 3 — Backend API | ⏳ Planned | NestJS: auth, files, download, tags, cron |
| — | Step 4 — Frontend | ⏳ Planned | React: pages, components, API integration |
| — | Step 5 — Testing & CI | ⏳ Planned | Jest, Cypress, TESTING.md, SECURITY.md, PERF.md, MAINTENANCE.md |

## Step 1 — Architecture & Design (2026-05-31)

### Completed
- [x] Repository initialized on GitHub
- [x] README.md + .gitignore created
- [x] Memory bank initialized (5 files)
- [x] Branch `feature/step1-architecture-mvp` created

### In Progress
- [ ] Architecture overview diagram (Mermaid)
- [ ] Technology choices table
- [ ] Database schema MCD (6 entities)
- [ ] Sequence diagrams (8 flows, US01–US10)
- [ ] OpenAPI 3.0 contract (14 routes)
- [ ] GitHub Issue #1 + PR

### Key Decisions Made
- Stack: NestJS + React + PostgreSQL + MinIO + Prisma
- Auth: JWT access (15min) + refresh (7d HttpOnly cookie)
- Downloads: MinIO presigned URLs (no backend proxy)
- Expiration: CronJob daily purge via @nestjs/schedule
