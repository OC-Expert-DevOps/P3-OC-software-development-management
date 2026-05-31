# ─── DataShare — Development Commands ───

COMPOSE = docker compose -f infra/docker-compose.yml

.PHONY: up down reset logs certs

## Start all services (build if needed)
up:
	$(COMPOSE) up --build

## Start in background
up-d:
	$(COMPOSE) up --build -d

## Stop all services (data preserved)
down:
	$(COMPOSE) down

## Stop and DELETE all data (full reset)
reset:
	$(COMPOSE) down -v

## Follow logs
logs:
	$(COMPOSE) logs -f

## Generate self-signed TLS certificates (dev only)
certs:
	mkdir -p infra/nginx/certs
	openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
		-keyout infra/nginx/certs/selfsigned.key \
		-out infra/nginx/certs/selfsigned.crt \
		-subj "/CN=localhost"
	@echo "✅ Self-signed certificates generated in infra/nginx/certs/"

## Run backend tests
test-backend:
	cd backend && npm test

## Run backend tests with coverage
test-backend-cov:
	cd backend && npm run test:cov

## Run frontend lint
lint-frontend:
	cd frontend && npm run lint
