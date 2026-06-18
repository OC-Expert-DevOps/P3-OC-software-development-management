# Maintenance Guide — DataShare

## Overview

This document describes the maintenance procedures for the DataShare platform, including dependency updates, backups, rollback, monitoring, and incident response.

---

## 1. Dependency Management

### Backend (NestJS)

```bash
cd backend

# Check for outdated packages
npm outdated

# Security audit
npm audit

# Fix non-breaking vulnerabilities
npm audit fix

# Update all dependencies (minor/patch)
npm update

# Update a specific package
npm install @nestjs/core@latest
```

**Schedule:** Run `npm audit` weekly. Apply security patches within 48h for critical/high severity.

### Dependency Update Frequency & Risks

| Dependency | Current Version | Update Frequency | Risk Level | Notes |
|-----------|----------------|-----------------|------------|-------|
| **NestJS** (`@nestjs/*`) | 10.x | Minor: monthly, Major: ~yearly | 🟡 Medium | Major versions may require migration guide. Test all routes after update. |
| **Prisma** | 5.x | Minor: bi-weekly, Major: ~yearly | 🔴 High | Schema changes may require `prisma generate` + migration. Always backup DB first. |
| **React** | 18.x | Minor: monthly, Major: ~2 years | 🟡 Medium | Major upgrades (e.g. 18→19) can break hooks/lifecycle. Test all pages. |
| **Vite** | 5.x | Minor: monthly, Major: ~yearly | 🟢 Low | Usually non-breaking. Config changes possible on major. |
| **@aws-sdk/client-s3** | 3.x | Patch: weekly, Minor: monthly | 🟢 Low | Stable API. Watch for deprecation notices. |
| **bcrypt** | 5.x | Rare | 🟢 Low | Native module — may need rebuild on Node.js major upgrade. |
| **class-validator** | 0.14.x | Irregular | 🟡 Medium | Pre-1.0 — decorators may change. Pin version. |
| **Playwright** | 1.x | Minor: bi-weekly | 🟢 Low | Dev-only. Browser binaries auto-downloaded. |
| **Jest** | 29.x | Minor: monthly | 🟢 Low | Dev-only. Rarely breaking. |

### Update Policy

| Type | Frequency | Procedure | Approval |
|------|-----------|-----------|----------|
| **Security patches** (critical/high) | Within 48h | `npm audit fix` → run tests → deploy | Tech lead |
| **Patch updates** (x.y.Z) | Weekly | `npm update` → run tests | Developer |
| **Minor updates** (x.Y.0) | Monthly | Update one by one → full test suite | Developer |
| **Major updates** (X.0.0) | Quarterly review | Dedicated branch → migration guide → full E2E | Tech lead + review |

### Risks to Watch

| Risk | Impact | Mitigation |
|------|--------|------------|
| Prisma schema incompatibility | DB corruption, data loss | Always backup before migration, test on staging |
| Node.js major upgrade | Native modules (bcrypt) may break | Test in Docker first, rebuild native deps |
| React breaking changes | UI regression | Run full E2E suite (Playwright 21 tests) |
| npm supply chain attack | Compromised dependency | Pin versions in `package-lock.json`, run `npm audit` |
| TLS certificate expiry | HTTPS breaks | Set calendar reminder, automate with certbot (prod) |

### Frontend (React/Vite)

```bash
cd frontend

# Generate lockfile if missing
npm i --package-lock-only

# Check vulnerabilities
npm audit

# Update dependencies
npm update
```

### Prisma (ORM)

```bash
cd backend

# Update Prisma CLI + client
npm install prisma@latest @prisma/client@latest

# Regenerate client after schema changes
npx prisma generate

# Apply schema changes to database
npx prisma db push        # Development (no migration files)
npx prisma migrate dev    # Production (creates migration files)
```

**⚠️ Important:** Always back up the database before running migrations in production.

---

## 2. Database Backup & Restore

### PostgreSQL Backup

```bash
# Full database dump (from Docker)
docker exec datashare-postgres pg_dump -U datashare datashare > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
docker exec datashare-postgres pg_dump -U datashare datashare | gzip > backup_$(date +%Y%m%d).sql.gz
```

### PostgreSQL Restore

```bash
# Restore from dump
cat backup_20260618.sql | docker exec -i datashare-postgres psql -U datashare datashare

# Restore from compressed backup
gunzip -c backup_20260618.sql.gz | docker exec -i datashare-postgres psql -U datashare datashare
```

### MinIO Backup

```bash
# Using mc (MinIO Client)
docker run --rm -v $(pwd)/minio-backup:/backup \
  --network infra_datashare-net \
  minio/mc mirror minio/datashare /backup/

# Or copy the Docker volume directly
docker cp datashare-minio:/data ./minio-backup
```

### Backup Schedule (Recommended)

| Data | Frequency | Retention | Method |
|------|-----------|-----------|--------|
| PostgreSQL | Daily | 30 days | `pg_dump` + cron |
| MinIO files | Daily | 30 days | `mc mirror` + cron |
| `.env` config | On change | Git history | Encrypted backup |

---

## 3. Deployment & Rollback

### Standard Deployment

```bash
cd infra

# Pull latest images / rebuild
docker compose build --no-cache

# Deploy with zero-downtime (recreate one at a time)
docker compose up -d --force-recreate

# Verify health
curl -k https://localhost/api/health
```

### Rollback Procedure

```bash
# 1. Identify the last working version
git log --oneline -5

# 2. Checkout the working version
git checkout v0.5.4  # or specific commit hash

# 3. Rebuild and redeploy
cd infra && docker compose build && docker compose up -d

# 4. Verify
curl -k https://localhost/api/health

# 5. If rollback is stable, create a hotfix branch
git checkout -b hotfix/rollback-from-v0.6.0
```

### Database Rollback

```bash
# If a Prisma migration caused issues
cd backend && npx prisma migrate reset  # ⚠️ DESTROYS DATA

# Safer: restore from backup
cat backup_before_migration.sql | docker exec -i datashare-postgres psql -U datashare datashare
```

---

## 4. Monitoring & Health Checks

### Health Endpoint

```bash
# Backend health check
curl -k https://localhost/api/health
# Expected: {"status": "ok"}
```

### Docker Container Health

```bash
# Check all container statuses
docker compose -f infra/docker-compose.yml ps

# Check specific service logs
docker compose -f infra/docker-compose.yml logs --tail=50 backend
docker compose -f infra/docker-compose.yml logs --tail=50 postgres
docker compose -f infra/docker-compose.yml logs --tail=50 minio

# Follow logs in real-time
docker compose -f infra/docker-compose.yml logs -f backend
```

### Key Metrics to Monitor

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Container restarts | `docker ps` | > 3 in 5 minutes |
| API response time | Access logs / k6 | p95 > 2000ms |
| Disk usage (MinIO) | `docker system df` | > 80% |
| Database connections | PostgreSQL logs | > 80% of `max_connections` |
| Error rate | Backend logs | > 5% of requests |
| Memory usage | `docker stats` | > 90% of limit |

### Quick Diagnostic Commands

```bash
# Container resource usage
docker stats --no-stream

# Disk usage by volume
docker system df -v

# PostgreSQL active connections
docker exec datashare-postgres psql -U datashare -c "SELECT count(*) FROM pg_stat_activity;"

# MinIO bucket size
docker exec datashare-minio mc du local/datashare
```

---

## 5. Common Issues & Fixes

### Backend in Restart Loop

**Symptom:** `docker ps` shows backend with status "Restarting"

**Diagnostic:**
```bash
docker compose -f infra/docker-compose.yml logs --tail=30 backend
```

**Common causes:**

| Error | Cause | Fix |
|-------|-------|-----|
| `EPROTO ssl3_get_record` | `MINIO_USE_SSL=false` parsed as truthy string | Set to string `'false'`, fix in code: `=== 'true'` comparison |
| `ECONNREFUSED postgres:5432` | PostgreSQL not ready yet | Add `depends_on` + healthcheck in docker-compose |
| `JWT_SECRET must be configured` | Missing `.env` file | Copy `.env.example` to `.env` and fill values |
| `Prisma: table not found` | Database not initialized | Run `npx prisma db push` inside backend container |

### File Upload Fails

| Error | Cause | Fix |
|-------|-------|-----|
| 413 Payload Too Large | Nginx body size limit | Set `client_max_body_size 1g;` in nginx.conf |
| MinIO connection refused | MinIO container not running | `docker compose up -d minio` |
| `SignatureDoesNotMatch` | Internal vs public URL mismatch | Set `MINIO_PUBLIC_URL` correctly |

### Authentication Issues

| Error | Cause | Fix |
|-------|-------|-----|
| 401 on all routes | Expired JWT | Re-login or check `JWT_EXPIRES_IN` |
| Refresh token fails | Token revoked or expired | Re-login |
| Cookie not sent | SameSite/Secure mismatch | Ensure HTTPS + correct cookie config |

---

## 6. Deployment Checklist

Before each deployment, verify:

- [ ] All unit tests pass: `cd backend && npm test`
- [ ] E2E tests pass (if stack running): `cd e2e && npx playwright test`
- [ ] `.env` file has all required variables (compare with `.env.example`)
- [ ] Database backup taken
- [ ] `CHANGELOG.md` updated
- [ ] Docker images rebuild: `docker compose build`
- [ ] Health endpoint responds: `curl -k https://localhost/api/health`
- [ ] File upload/download flow works manually
- [ ] No secrets committed (`git diff --cached` check)

---

## 7. Contact & Escalation

| Level | Action | Who |
|-------|--------|-----|
| L1 | Check logs, restart containers | On-call developer |
| L2 | Database restore, rollback deployment | Tech lead |
| L3 | Infrastructure changes, security incident | CTO / Infra team |
