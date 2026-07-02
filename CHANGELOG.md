# Journal des modifications

Tous les changements notables de ce projet seront documentés dans ce fichier.

Le format suit [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Le versionnement suit [Semantic Versioning](https://semver.org/).

## [0.9.0] - 2026-07-02 — API complète, Swagger, Cron Cleanup

### Added

**Backend :**
- `CleanupService` (`backend/src/cleanup/`) — Cron job horaire (`@nestjs/schedule`) pour purger automatiquement :
  - Fichiers expirés : suppression MinIO + soft-delete BDD + invalidation tokens
  - Download tokens expirés > 24h : hard-delete BDD
  - Refresh tokens expirés/révoqués > 24h : hard-delete BDD
- `CleanupModule` enregistré dans `AppModule` avec `ScheduleModule.forRoot()`

**API :**
- 7 routes manquantes ajoutées au `FilesController` (US06-US10) :
  - `GET /files/stats` — statistiques utilisateur
  - `PUT /files/:id/password` — définir mot de passe
  - `DELETE /files/:id/password` — supprimer mot de passe
  - `POST /files/anonymous` — upload anonyme
  - `PUT /files/:id/tags` — gérer les tags
  - `GET /files/:id/tags` — lister les tags
  - `GET /files/:id/history` — historique de téléchargement
- 7 méthodes correspondantes ajoutées au `FilesService`
- `docs/testing/09-api-test-report.md` — rapport de test API (26 scénarios curl, 26/26 PASS)

**Swagger :**
- `.addServer('/api', 'Behind nginx reverse-proxy')` dans `main.ts` — corrige le base path Swagger derrière nginx
- `@ApiBearerAuth()` ajouté sur les 14 routes protégées (FilesController, DownloadController, AuthController)
- `@ApiTags('Files')`, `@ApiTags('Downloads')` ajoutés pour grouper les endpoints

### Fixed

- **Route ordering bug** : `GET /files/stats` retournait 500 car `"stats"` était capturé par `@Get(':id')` — corrigé en déclarant `@Get('stats')` avant `@Get(':id')`
- **Swagger non fonctionnel via nginx** : les requêtes allaient vers `https://localhost/health` au lieu de `https://localhost/api/health` — corrigé avec `.addServer('/api')`
- **Swagger n'envoyait pas le JWT** : le header `Authorization: Bearer` n'était pas inclus car `@ApiBearerAuth()` manquait sur les controllers

### Changed

**Documentation :**
- `docs/maintenance/MAINTENANCE.md` — nouvelle section "Automatic Cleanup" (tableaux de rétention, flow de purge, logs)
- `memory-bank/systemPatterns.md` — nouvelle entrée "Automatic Cleanup (Cron Job)"

---

## [0.8.0] - 2026-06-18 — Documentation finale et présentation

### Ajouté

**Documentation :**
- `docs/technical-documentation.md` — Modèle OC complet (8 sections : architecture, choix techniques, modèle de données, API, sécurité, qualité/tests, installation, utilisation de l'IA)
- `docs/presentation.md` — Diapositives de soutenance (10 diapositives : contexte, architecture, stack, fonctionnalités, qualité, sécurité, difficultés, IA, workflow, feuille de route)

### Modifié

**Documentation :**
- `docs/performance/PERF.md` — Ajout du budget de bundle frontend (Vite ~105Ko gzippé), métriques de performance navigateur (objectifs FCP/LCP/TTI/CLS/TBT), suivi des métriques clés, analyse d'optimisation
- `docs/maintenance/MAINTENANCE.md` — Ajout du tableau de fréquence/risques des dépendances (9 dép.), politique de mise à jour (sécurité/patch/mineur/majeur), risques à surveiller
- `README.md` — Ajout des commandes E2E Playwright, commandes de tests de performance k6, initialisation de la base de données Prisma

**GitHub :** Issue #38 → PR #39 (squash merge)

---

## [0.7.0] - 2026-06-18 — Documentation qualité + Correctif SSL MinIO

### Ajouté

**Documentation :**
- `docs/security/SECURITY.md` — Résultats npm audit (47 vulnérabilités, toutes transitives/dev uniquement), revue de sécurité applicative
- `docs/performance/PERF.md` — Plan de tests k6, analyse des résultats, recommandations de journalisation structurée
- `docs/maintenance/MAINTENANCE.md` — Sauvegarde/restauration, rollback, surveillance, guide de dépannage
- `k6/upload-test.js` — Script de test de performance k6 exécutable (endpoints upload + liste)

### Corrigé

- **Crash SSL MinIO (EPROTO) :** `MINIO_USE_SSL=false` (chaîne) était évalué comme vrai en JS → changé en comparaison `=== 'true'`
  - Le backend était en boucle de redémarrage à cause d'une connexion HTTPS vers un MinIO en HTTP simple

**GitHub :** Issue #36 → PR #37 (squash merge)

---

## [0.6.0] - 2026-06-07 — Tests unitaires et couverture

### Ajouté

**Tests :**
- `auth.service.spec.ts` — 14 tests (inscription, connexion, déconnexion, rafraîchissement, JWT)
- `auth.controller.spec.ts` — 4 tests (endpoints inscription, connexion, déconnexion, rafraîchissement)
- `jwt.guard.spec.ts` — 5 tests (extraction du token, validation, gestion des erreurs)
- `files.service.spec.ts` — 28 tests (upload, liste, suppression, mot de passe, anonyme, tags, historique)
- `download.service.spec.ts` — 13 tests (création de lien, utilisation du token, révocation)
- `download.controller.spec.ts` — 4 tests (CRUD + téléchargement public)

**Documentation :**
- `docs/testing/TESTING.md` — Document complet de stratégie de tests

### Modifié

**Configuration :**
- `backend/package.json` : `collectCoverageFrom` cible maintenant la logique métier (`*.service.ts`, `*.controller.ts`, `*.guard.ts`)
- `backend/package.json` : `coverageThreshold` défini à 70% instructions/lignes, 50% branches, 60% fonctions

**Métriques :**
- 68 tests, 6 suites, tous passants
- 72,82% de couverture des instructions (seuil : 70%)

## [0.5.4] - 2026-06-07 — Correctif signature URL présignée

### Corrigé

**Backend :**
- Correction de l'erreur `SignatureDoesNotMatch` sur les liens de téléchargement : la v0.5.3 remplaçait le nom d'hôte APRÈS le calcul de la signature
- Création d'un `publicClient: S3Client` séparé configuré avec `MINIO_PUBLIC_URL` pour la génération des URL présignées
- La signature est maintenant calculée avec le bon nom d'hôte public (`localhost:9000`) dès le départ

**Architecture :**
- `client` (interne) → upload, suppression, opérations sur les buckets via `minio:9000`
- `publicClient` (public) → URL présignées via `localhost:9000`

### Tests
- ✅ 21/21 tests E2E réussis (Playwright)

**GitHub :** Issue #31 → PR #32 (squash merge)

---

## [0.5.3] - 2026-06-07 — Correctif NaN Mo + Liens de téléchargement cassés

### Corrigé

**Frontend :**
- Correction de l'affichage de la taille des fichiers "NaN MB" : utilisation du champ `sizeBytes` au lieu de `size`, conversion de la chaîne BigInt via `Number()`

**Backend :**
- Correction des liens de téléchargement cassés : les URL présignées utilisaient le nom d'hôte interne Docker `minio:9000`
- Ajout de la variable d'environnement `MINIO_PUBLIC_URL` pour remplacer le nom d'hôte interne par l'URL publique dans les URL présignées

**Infrastructure :**
- Exposition du port API S3 de MinIO `9000` dans docker-compose pour les URL présignées accessibles depuis le navigateur

**Variables d'environnement :**
- `MINIO_PUBLIC_URL` (optionnelle, défaut : aucun) — URL publique pour les URL présignées MinIO (ex. `http://localhost:9000`)

### Tests
- ✅ 21/21 tests E2E réussis (Playwright)

---

## [0.5.2] - 2026-06-07 — Correctif JWT userId + E2E 21/21

### Corrigé

**Backend :**
- Correction du guard JWT : mapping `payload.sub` → `request.user.userId` (les fichiers uploadés avaient `userId: null`)

**Frontend :**
- Correction de `expiresInSeconds` → `ttlSeconds` dans `DashboardPage.tsx` (correspondance avec le DTO backend `CreateLinkDto`)

**Tests E2E :**
- Page object Dashboard : ajout de `waitForLoaded()` pour éviter les conditions de concurrence sur le rendu de la liste des fichiers
- US02 : utilisation d'une approche basée sur l'API pour le test de génération de lien + `maxRedirects: 0` pour le téléchargement (nom d'hôte interne MinIO)
- US05 : ajout de `waitForLoaded()` avant la vérification des en-têtes du tableau
- US10 : utilisation de `maxRedirects: 0` pour éviter de suivre la redirection vers le nom d'hôte interne MinIO
- Correction de `expiresInSeconds` → `ttlSeconds` dans US02 et US10

### Ajouté

**Documentation :**
- Ajout de `docs/testing/08-e2e-testing.md` — Plan de tests E2E complet (US01–US10, 21 cas de test)

**Résultats des tests :** 17/21 → **21/21 réussis** ✅

**GitHub :** Issue #27, PR #28 (squash merge, labels : bug, testing)

## [0.5.1] - 2026-06-07 — Correctifs d'infrastructure E2E

### Corrigé

**Backend :**
- Correction de la sérialisation JSON BigInt dans `main.ts` (Prisma retourne BigInt pour le champ `sizeBytes`, ce qui faisait planter `JSON.stringify`)
- Ajout du champ optionnel `name` à `RegisterDto` (le frontend l'envoie, le backend le rejetait avec une erreur 400)

**Tests E2E :**
- Correction de la fixture d'authentification : l'inscription redirige vers `/login`, pas vers `/dashboard`
- Ajout du helper `registerAndLogin` pour les tests nécessitant un utilisateur authentifié
- Remplacement de `registerUser` → `registerAndLogin` dans les 10 specs
- Correction du test de statistiques US06 pour utiliser le bon flux d'authentification

**Infrastructure :**
- Prisma `db push` : création des tables manquantes dans la base de données (aucun répertoire de migrations n'existait)

**Résultats des tests :** 2/20 → **17/21 réussis**

**GitHub :** PR #25 (squash merge, labels : fix, testing)

## [0.5.0] - 2026-05-31 — Tests E2E Playwright

### Ajouté

**Fonctionnalités :**
- 10 specs de tests Playwright couvrant US01-US10 (21 cas de test au total)
- Page objects : LoginPage, RegisterPage, DashboardPage, UploadPage
- Fixture d'authentification avec génération d'utilisateur à email unique
- Configuration Playwright ciblant https://localhost avec contournement du certificat auto-signé

**Tests :**
- US01 : Upload de fichier (authentifié) + garde de redirection (2 tests)
- US02 : Génération de lien de téléchargement + accès public (2 tests)
- US03 : Inscription + email en double + mot de passe trop court (3 tests)
- US04 : Connexion + mauvais mot de passe + déconnexion (3 tests)
- US05 : Liste de fichiers état vide + affichage de fichier + métadonnées (3 tests)
- US06 : Statistiques utilisateur via API (1 test)
- US07 : Protection par mot de passe définir/supprimer (2 tests)
- US08 : Upload anonyme via API (1 test)
- US09 : Tags ajout/normalisation/rejet >10 (3 tests)
- US10 : Enregistrement de l'historique de téléchargement (1 test)

**Dépendances :**
- `@playwright/test` >= 1.x (répertoire e2e)

**GitHub :** Issue #23 → PR #24 (squash merge, label : testing)

## [0.4.4] - 2026-05-31 — Pages UI Frontend

### Ajouté

**Fonctionnalités :**
- 5 pages fonctionnelles : Connexion, Inscription, Tableau de bord, Upload, Téléchargement
- Client Axios avec intercepteur JWT + rafraîchissement automatique sur 401
- Contexte AuthProvider + hook useAuth
- Composants Navbar + PrivateRoute
- Routes protégées (tableau de bord, upload) redirigent vers la connexion

**GitHub :** Issue #21 → PR #22 (squash merge, label : feature)

## [0.4.3] - 2026-05-31 — US07-US10 : Fonctionnalités avancées

### Ajouté

**Fonctionnalités :**
- US07 : Fichiers protégés par mot de passe (hash bcrypt, définir/supprimer via PUT/DELETE)
- US08 : Upload anonyme (POST /api/files/anonymous, public, expiration 1 jour)
- US09 : Étiquetage de fichiers (upsert des tags, max 10 par fichier, normalisé en minuscules)
- US10 : Historique de téléchargement (100 derniers événements avec IP + User-Agent)

**Routes :**
- `PUT /api/files/:id/password` — Définir le mot de passe du fichier (JWT requis)
- `DELETE /api/files/:id/password` — Supprimer le mot de passe du fichier (JWT requis)
- `POST /api/files/anonymous` — Upload anonyme (public)
- `PUT /api/files/:id/tags` — Définir les tags du fichier (JWT requis)
- `GET /api/files/:id/tags` — Obtenir les tags du fichier (JWT requis)
- `GET /api/files/:id/history` — Historique de téléchargement (JWT requis)

**Base de données :**
- Modèle `DownloadHistory` (id, fileId, tokenId, downloadedAt, ipAddress, userAgent)
- Relations : File → DownloadHistory, DownloadToken → DownloadHistory

**Documentation :**
- `docs/backend/07-advanced-features.md` — Documentation complète US07-US10

**GitHub :** Issue #13 → PR #17 (squash merge)

## [0.4.2] - 2026-05-31 — US05+US06 : Liste paginée des fichiers et statistiques

### Ajouté

**Fonctionnalités :**
- US05 : Liste paginée des fichiers avec tri (page, limit, sortBy, order)
- US06 : Endpoint de statistiques de fichiers utilisateur (fileCount, deletedCount, totalSizeBytes, activeLinks)
- ListFilesDto avec validation class-validator + class-transformer

**Routes :**
- `GET /api/files?page=1&limit=20&sortBy=createdAt&order=desc` — Liste paginée (JWT requis)
- `GET /api/files/stats` — Statistiques de fichiers utilisateur (JWT requis)

**GitHub :** Issue #12 → PR #16 (squash merge)

## [0.4.1] - 2026-05-31 — US02 : Liens de téléchargement

### Ajouté

**Fonctionnalités :**
- US02 : Liens de téléchargement temporaires sécurisés pour le partage de fichiers sans authentification
- DownloadService : createLink, findByFile, revokeLink, useToken (redirection 302 vers URL présignée MinIO)
- DownloadController : 3 routes protégées par JWT + 1 route publique
- Schéma Prisma : champ `maxDownloads` ajouté à DownloadToken

**Routes :**
- `POST /api/files/:id/links` — Générer un token de téléchargement (JWT requis)
- `GET /api/files/:id/links` — Lister les tokens actifs (JWT requis)
- `DELETE /api/files/:id/links/:tokenId` — Révoquer un token (JWT requis)
- `GET /api/download/:token` — Téléchargement public (302 → URL présignée MinIO)

**Variables d'environnement :**
- `DOWNLOAD_LINK_TTL_SECONDS` (optionnelle, défaut : `86400`)

**Tests :**
- 10 tests unitaires pour DownloadService (création, TTL, expiration, révocation, maxDownloads, fichier supprimé)

**Documentation :**
- `docs/backend/06-download-links.md` — Documentation complète du DownloadModule

**GitHub :** Issue #11 → PR #15 (squash merge)

## [0.4.0] - 2026-05-31 — US01 : Upload de fichier (GitHub Copilot + Revue humaine)

### Ajouté

**Fonctionnalités :**
- US01 : Upload de fichier avec stockage MinIO (compatible S3)
- MinioService : upload, delete, getPresignedUrl, création automatique du bucket
- FilesService : uploadFile, findAllByUser, findOne, remove (suppression douce)
- FilesController : 4 routes REST protégées par JWT

**Routes :**
- `POST /api/files/upload` — Upload de fichier (multipart/form-data, JWT requis)
- `GET /api/files` — Lister les fichiers de l'utilisateur (JWT requis)
- `GET /api/files/:id` — Métadonnées du fichier (JWT requis)
- `DELETE /api/files/:id` — Supprimer le fichier de MinIO + suppression douce en base de données (JWT requis)

**Variables d'environnement :**
- `MINIO_ENDPOINT` (obligatoire, défaut : `minio`)
- `MINIO_PORT` (optionnelle, défaut : `9000`)
- `MINIO_ACCESS_KEY` (obligatoire)
- `MINIO_SECRET_KEY` (obligatoire)
- `MINIO_BUCKET` (optionnelle, défaut : `datashare`)
- `MINIO_USE_SSL` (optionnelle, défaut : `false`)
- `MAX_FILE_SIZE_BYTES` (optionnelle, défaut : `1073741824` = 1 Go)
- `FILE_EXPIRY_DAYS_DEFAULT` (optionnelle, défaut : `7`)

**Dépendances :**
- `@aws-sdk/client-s3` >= 3.x
- `@aws-sdk/s3-request-presigner` >= 3.x
- `@types/multer` (dev)

**Utilisation de l'IA :**
- Code généré par GitHub Copilot (4 prompts)
- 5 corrections de revue humaine documentées dans `docs/ai-usage/us01-supervision-log.md`

**Tests :**
- 10 tests unitaires pour FilesService (upload, liste, findOne, suppression + cas d'erreur)

**Documentation :**
- `docs/ai-usage/us01-copilot-prompts.md` — Prompts utilisés
- `docs/ai-usage/us01-supervision-log.md` — Journal de supervision et corrections

**GitHub :** Issue #10 → PR #14 (squash merge)

## [0.3.1] - 2026-05-31 — Correctif : Typage strict TypeScript pour l'authentification

### Corrigé
- `auth.service.ts` : assertion non-null sur `config.get<string>('JWT_SECRET')!` (TS2769)
- `jwt.guard.ts` : même correction pour l'appel `jwt.verify()`
- Ajout de `@nestjs/config` comme dépendance explicite dans `package.json`
- Les 10 tests d'authentification passent — `auth.service.ts` à 100% de couverture des instructions

## [0.3.0] - 2026-05-31 — Étape 3 : US03+US04 Authentification

### Ajouté

**Modules backend :**
- `PrismaModule` : service de base de données global (`prisma.service.ts`, `prisma.module.ts`)
- `AuthModule` : 4 endpoints REST (inscription, connexion, déconnexion, rafraîchissement)
- `JwtGuard` : garde réutilisable pour les routes protégées (extraction + validation du JWT)

**Routes d'authentification :**
- `POST /api/auth/register` — Créer un compte (hash bcrypt, validation de l'email)
- `POST /api/auth/login` — Authentifier, émettre un token d'accès JWT + cookie HttpOnly de rafraîchissement
- `POST /api/auth/logout` — Révoquer le token de rafraîchissement (JWT requis)
- `POST /api/auth/refresh` — Renouveler le token d'accès via cookie (rotation des tokens)

**DTOs et validation :**
- `RegisterDto` : email (IsEmail), password (MinLength 8)
- `LoginDto` : email (IsEmail), password (IsString)
- class-validator + class-transformer pour la validation des entrées

**Stratégie de tokens :**
- Token d'accès : JWT HS256, payload `{sub, email}`, TTL 15min
- Token de rafraîchissement : UUID v4, hash bcrypt en base de données, cookie HttpOnly, TTL 7 jours
- Rotation des tokens à chaque rafraîchissement (ancien token révoqué)

**Tests :**
- `auth.service.spec.ts` : 10 tests unitaires (inscription, connexion, déconnexion, rafraîchissement)
- Couvre : chemins de succès, email en double, mauvais mot de passe, expiration du token

**Documentation :**
- `docs/backend/05-auth.md` : documentation complète du AuthModule (routes, stratégie, diagrammes, tests)

**GitHub :**
- Issue #6 : `[AUTH] Step 3 — US03+US04 : User registration & authentication`
- PR : `feature/step3-auth` → `main`

## [0.2.0] - 2026-05-31 — Étape 2 : Infrastructure et initialisation de l'application

### Ajouté

**Infrastructure :**
- `infra/docker-compose.yml` : 5 services (nginx, frontend, backend, postgres, minio)
- `infra/nginx/nginx.conf` : Reverse proxy avec terminaison TLS, routage `/` → React, `/api/` → NestJS
- Volumes nommés : `postgres-data`, `minio-data` (persistance des données)
- Réseau bridge : `datashare-net` (communication interne)
- Healthchecks : `postgres` (pg_isready), `minio` (mc ready)
- `Makefile` : raccourcis (`make up`, `make down`, `make reset`, `make certs`, `make logs`)

**Backend (NestJS) :**
- `backend/Dockerfile` : Node 20 Alpine, npm install, Prisma generate, build
- `backend/package.json` : NestJS 10.x + Prisma 5.x + bcrypt + dépendances JWT
- `backend/src/main.ts` : Bootstrap avec CORS, préfixe global `/api`, documentation Swagger
- `backend/src/app.controller.ts` : Endpoint `GET /health`
- `backend/prisma/schema.prisma` : 6 entités (User, File, DownloadToken, RefreshToken, Tag, FileTag)

**Frontend (React/Vite) :**
- `frontend/Dockerfile` : Node 20 Alpine, serveur de développement Vite
- `frontend/package.json` : React 18 + React Router 6 + Axios
- `frontend/src/App.tsx` : Routeur avec 5 routes (/, /login, /register, /dashboard, /upload)

**Configuration :**
- `.env.example` : 18 variables d'environnement documentées

**Variables d'environnement ajoutées :**
- `DATABASE_URL` (obligatoire) — Chaîne de connexion PostgreSQL
- `POSTGRES_USER` (obligatoire) — Utilisateur de la base de données
- `POSTGRES_PASSWORD` (obligatoire) — Mot de passe de la base de données
- `POSTGRES_DB` (obligatoire) — Nom de la base de données
- `JWT_SECRET` (obligatoire) — Secret de signature HMAC-SHA256 (min 32 caractères)
- `JWT_EXPIRES_IN` (optionnelle, défaut : `15m`) — TTL du token d'accès
- `REFRESH_TOKEN_EXPIRES_IN` (optionnelle, défaut : `7d`) — TTL du token de rafraîchissement
- `MINIO_ENDPOINT` (obligatoire) — Nom d'hôte MinIO
- `MINIO_PORT` (optionnelle, défaut : `9000`) — Port API MinIO
- `MINIO_ACCESS_KEY` (obligatoire) — Clé d'accès MinIO
- `MINIO_SECRET_KEY` (obligatoire) — Clé secrète MinIO
- `MINIO_BUCKET` (optionnelle, défaut : `datashare`) — Nom du bucket S3
- `MINIO_USE_SSL` (optionnelle, défaut : `false`) — TLS pour MinIO
- `APP_PORT` (optionnelle, défaut : `3001`) — Port d'écoute NestJS
- `APP_ENV` (optionnelle, défaut : `development`) — Environnement
- `MAX_FILE_SIZE_BYTES` (optionnelle, défaut : `1073741824`) — Upload max 1 Go
- `FILE_EXPIRY_DAYS_DEFAULT` (optionnelle, défaut : `7`) — Expiration par défaut des fichiers
- `ALLOWED_ORIGINS` (optionnelle, défaut : `https://localhost`) — Origines CORS

**Documentation :**
- `README.md` : 8 sections (Prérequis, Installation, Configuration, Lancement, Tests, Sécurité, Limitations)
- `docs/infrastructure/04-infrastructure-setup.md` : Architecture Docker Compose, services, démarrage rapide
- `.gitignore` : mis à jour pour le stack complet (node_modules, .env, certs, coverage, volumes)

**GitHub :**
- Issue #3 : `[INFRA] Step 2 — Infrastructure Docker Compose & App Init`
- PR #4 : `feature/step2-infrastructure` → `main`

## [0.1.0] - 2026-05-31 — Étape 1 : Architecture et conception technique

### Ajouté

**Architecture :**
- Diagramme de vue d'ensemble de l'architecture (Mermaid) — 5 services, protocoles sur chaque liaison
- 12 choix technologiques justifiés (NestJS, React, Prisma, MinIO, JWT, etc.)

**Base de données :**
- MCD (Mermaid erDiagram) : 6 entités (User, File, DownloadToken, RefreshToken, Tag, FileTag)
- Tous les attributs avec types, clés primaires, clés étrangères, cardinalités

**Conception de l'API :**
- Contrat OpenAPI 3.0 : 14 routes REST
- 8 diagrammes de séquence (inscription, connexion, upload, téléchargement, anonyme, historique, suppression, tags)

**Documentation :**
- `docs/architecture/01-architecture-overview.md`
- `docs/architecture/02-database-schema.md`
- `docs/architecture/03-sequence-diagrams.md`
- `docs/architecture/openapi.yaml`
- Memory bank initialisé (5 fichiers : projectbrief, techContext, systemPatterns, activeContext, progress)

**GitHub :**
- Issue #1 : `[ARCH] Step 1 — Architecture & Technical Design`
- PR #2 : `feature/step1-architecture-mvp` → `main` (squash merge)
