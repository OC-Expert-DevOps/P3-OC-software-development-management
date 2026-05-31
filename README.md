# DataShare — Secure File Transfer Platform

A secure file transfer platform for freelancers and small businesses. Upload files, generate temporary download links, and manage your files with confidence.

## Prerequisites

- **Node.js** 20+ (for local development)
- **Docker** & **Docker Compose** v2
- **Git**

## Installation

```bash
# Clone
git clone git@github.com:OC-Expert-DevOps/-P3-OC-software-development-management.git
cd P3-OC-software-development-management

# Copy environment config
cp .env.example .env
# → Edit .env with your values

# Generate self-signed TLS certificates (dev only)
mkdir -p nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/selfsigned.key \
  -out nginx/certs/selfsigned.crt \
  -subj "/CN=localhost"
```

## Configuration

### Environment Variables

| Variable | Required | Type | Default | Scope | Description | Example |
|----------|----------|------|---------|-------|-------------|---------|
| `DATABASE_URL` | Yes | url | — | db | PostgreSQL connection string | `postgresql://datashare:pass@postgres:5432/datashare` |
| `POSTGRES_USER` | Yes | string | — | db | Database user | `datashare` |
| `POSTGRES_PASSWORD` | Yes | string | — | db | Database password | `changeme` |
| `POSTGRES_DB` | Yes | string | — | db | Database name | `datashare` |
| `JWT_SECRET` | Yes | string | — | auth | HMAC-SHA256 secret (min 32 chars) | `a_random_string_min_32_characters` |
| `JWT_EXPIRES_IN` | No | duration | `15m` | auth | Access token TTL | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | No | duration | `7d` | auth | Refresh token TTL | `7d` |
| `MINIO_ENDPOINT` | Yes | string | `minio` | storage | MinIO hostname | `minio` |
| `MINIO_PORT` | No | int | `9000` | storage | MinIO API port | `9000` |
| `MINIO_ACCESS_KEY` | Yes | string | — | storage | MinIO access key | `minioadmin` |
| `MINIO_SECRET_KEY` | Yes | string | — | storage | MinIO secret key | `minioadmin` |
| `MINIO_BUCKET` | No | string | `datashare` | storage | S3 bucket name | `datashare` |
| `MINIO_USE_SSL` | No | bool | `false` | storage | TLS for MinIO | `false` |
| `APP_PORT` | No | int | `3001` | runtime | NestJS port | `3001` |
| `APP_ENV` | No | string | `development` | runtime | Environment | `development` |
| `MAX_FILE_SIZE_BYTES` | No | int | `1073741824` | runtime | Max upload (1 GB) | `1073741824` |
| `FILE_EXPIRY_DAYS_DEFAULT` | No | int | `7` | runtime | Default file expiry (days) | `7` |
| `ALLOWED_ORIGINS` | No | string | `https://localhost` | runtime | CORS origins | `https://localhost` |

## Launch

### Development (Docker Compose)

```bash
docker compose up --build
```

Services:
- **Frontend**: https://localhost (via Nginx)
- **API**: https://localhost/api/health
- **Swagger**: https://localhost/api/docs
- **MinIO Console**: localhost:9001 (direct, dev only)

### Production

Not yet configured — MVP uses Docker Compose for local demo.

## Tests

```bash
# Backend unit tests
cd backend && npm test

# Backend tests with coverage
cd backend && npm run test:cov

# Frontend lint
cd frontend && npm run lint
```

## Security

- **Auth**: JWT access tokens (15 min) + HttpOnly refresh tokens (7 days)
- **Passwords**: bcrypt hashed (salt rounds: 10)
- **TLS**: HTTPS enforced via Nginx (self-signed in dev)
- **Download links**: Cryptographic tokens with expiry
- **File access**: Owner-only by default
- **CORS**: Restricted to `ALLOWED_ORIGINS`
- **Secrets**: All secrets via environment variables, never committed

## Limitations / Known Issues

- Self-signed TLS → browser warning in development
- No rate limiting yet (planned for production)
- No email verification on registration
- Single-node deployment only (Docker Compose)
