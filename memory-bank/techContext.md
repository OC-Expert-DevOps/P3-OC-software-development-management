# DataShare — Contexte Technique

## Pile Technologique

| Couche | Technologie | Version | Rôle |
|--------|------------|---------|------|
| Back-end | NestJS (TypeScript) | 10.x | API REST, authentification, logique métier |
| Front-end | React + Vite (TypeScript) | React 18.x | SPA, interface utilisateur |
| Base de données | PostgreSQL | 16-alpine | Stockage de données relationnelles |
| ORM | Prisma | 5.x | ORM type-safe, migrations, schéma |
| Stockage | MinIO | latest | Stockage objet compatible S3 |
| Authentification | JWT (jsonwebtoken) | — | Jetons d'accès (15min) + jetons de rafraîchissement (7j) |
| Hachage de mot de passe | bcrypt | — | Salt rounds : 10 |
| Proxy inverse | Nginx | alpine | Terminaison HTTPS, routage |
| Déploiement | Docker Compose | v2 | Orchestration de démo locale (5 services) |
| Tests (unitaires) | Jest | — | Natif NestJS, tests unitaires backend |
| Tests (E2E) | Cypress | — | Scénarios de bout en bout (requis par le cahier des charges) |
| Lint/Formatage | ESLint + Prettier | — | Qualité du code TypeScript |
| Planificateur | @nestjs/schedule (cron) | — | Expiration automatique des fichiers (US10) |
| Documentation API | @nestjs/swagger | — | Swagger UI sur /api/docs |

## Architecture Docker Compose

### Services (infra/docker-compose.yml)

| Service | Image | Port Interne | Port Exposé | Dépend De | Healthcheck |
|---------|-------|-------------|-------------|-----------|-------------|
| nginx | nginx:alpine | 80, 443 | 80, 443 | frontend, backend | — |
| frontend | build local (../frontend) | 3000 | — | — | — |
| backend | build local (../backend) | 3001 | — | postgres (healthy), minio (healthy) | — |
| postgres | postgres:16-alpine | 5432 | — | — | pg_isready |
| minio | minio/minio:latest | 9000, 9001 | — | — | mc ready |

### Réseau & Volumes

- **Réseau** : `datashare-net` (bridge) — tous les services internes
- **Exposé** : Uniquement Nginx sur les ports hôte 80/443
- **Volumes** : `postgres-data` (BDD), `minio-data` (fichiers)
- **Persistance des données** : `make down` préserve, `make reset` détruit

### Routage Nginx

| Chemin de Requête | Cible | Protocole |
|-------------------|-------|-----------|
| `/` | frontend:3000 | HTTP |
| `/api/` | backend:3001 | HTTP (pas de réécriture) |

TLS : Certificats auto-signés (`infra/nginx/certs/`, gitignored).

## Structure du Projet

```
├── backend/              ← Application NestJS (avec Dockerfile)
│   ├── src/              ← Code source de l'application
│   └── prisma/           ← Schéma + migrations
├── frontend/             ← Application React/Vite (avec Dockerfile)
│   └── src/              ← Code source de l'application
├── infra/                ← Fichiers d'infrastructure
│   ├── docker-compose.yml
│   └── nginx/nginx.conf
├── docs/                 ← Documentation d'architecture + infrastructure
├── memory-bank/          ← Documentation d'implémentation
├── Makefile              ← Raccourcis de développement
├── .env.example          ← 18 variables documentées
└── README.md             ← 8 sections
```

## Commandes Makefile

| Commande | Action |
|----------|--------|
| `make up` | Construire + démarrer tous les services |
| `make up-d` | Construire + démarrer en arrière-plan |
| `make down` | Arrêter (données préservées) |
| `make reset` | Arrêter + supprimer toutes les données |
| `make logs` | Suivre tous les logs |
| `make certs` | Générer des certificats TLS auto-signés |
| `make test-backend` | Lancer les tests backend |
| `make test-backend-cov` | Tests backend + couverture |
| `make lint-frontend` | ESLint frontend |

## Contraintes

- **Calendrier** : 4 semaines jusqu'à la démo MVP
- **Public** : démo investisseur — doit paraître soigné et professionnel
- **Contraintes de pile** (du cahier des charges) :
  - Back-end : doit être Spring Boot / .NET Core / NestJS / Symfony → **NestJS choisi**
  - Front-end : doit être Angular / React / VueJS → **React choisi**
  - Base de données : doit être PostgreSQL ou MongoDB → **PostgreSQL choisi**
  - Stockage : doit être système de fichiers local ou AWS S3 → **MinIO (compatible S3) choisi**
- **Tests** : Jest pour les tests unitaires (objectif 70% de couverture), Cypress pour E2E (minimum 2-3 scénarios critiques)
- **Git** : commits conventionnels, protection de branche sur `main`

## Environnement de Développement

- **Gestionnaire de paquets** : npm
- **Node.js** : 20.x LTS (Alpine dans Docker)
- **TypeScript** : 5.x (mode strict)
- **IDE** : VS Code avec extensions ESLint + Prettier
- **Schéma Prisma** : mapping snake_case (`@@map`, `@map`) pour les tables/colonnes de la BDD
