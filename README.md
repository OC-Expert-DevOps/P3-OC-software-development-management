# DataShare — Plateforme de Transfert de Fichiers Sécurisée

Une plateforme de transfert de fichiers sécurisée pour les freelances et les petites entreprises. Téléversez des fichiers, générez des liens de téléchargement temporaires et gérez vos fichiers en toute confiance.

## Prérequis

- **Node.js** 20+ (pour le développement local)
- **Docker** & **Docker Compose** v2
- **Git**

## Installation

```bash
# Cloner le dépôt
git clone git@github.com:OC-Expert-DevOps/-P3-OC-software-development-management.git
cd P3-OC-software-development-management

# Copier la configuration d'environnement
cp .env.example .env
# → Modifiez .env avec vos valeurs

# Générer des certificats TLS auto-signés (développement uniquement)
make certs
```

## Configuration

### Variables d'environnement

| Variable | Requis | Type | Défaut | Portée | Description | Exemple |
|----------|--------|------|--------|--------|-------------|---------|
| `DATABASE_URL` | Oui | url | — | db | Chaîne de connexion PostgreSQL | `postgresql://datashare:pass@postgres:5432/datashare` |
| `POSTGRES_USER` | Oui | string | — | db | Utilisateur de la base de données | `datashare` |
| `POSTGRES_PASSWORD` | Oui | string | — | db | Mot de passe de la base de données | `changeme` |
| `POSTGRES_DB` | Oui | string | — | db | Nom de la base de données | `datashare` |
| `MINIO_ENDPOINT` | Oui | string | — | stockage | Nom d'hôte MinIO | `minio` |
| `MINIO_PORT` | Non | int | `9000` | stockage | Port de l'API MinIO | `9000` |
| `MINIO_ACCESS_KEY` | Oui | string | — | stockage | Clé d'accès MinIO | `datashare` |
| `MINIO_SECRET_KEY` | Oui | string | — | stockage | Clé secrète MinIO | `changeme123` |
| `MINIO_BUCKET` | Non | string | `datashare` | stockage | Nom du bucket MinIO | `datashare` |
| `MINIO_USE_SSL` | Non | bool | `false` | stockage | Activer SSL pour MinIO | `false` |
| `MINIO_PUBLIC_URL` | Oui | url | — | stockage | URL MinIO publique (pour les URLs pré-signées) | `https://localhost:9000` |
| `JWT_SECRET` | Oui | string | — | auth | Secret pour la signature JWT | `votre-secret-jwt-256-bits` |
| `JWT_EXPIRES_IN` | Non | string | `15m` | auth | Durée de vie du token d'accès | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | Non | string (durée) | `7d` | auth | Durée de vie du token de rafraîchissement | `7d` |
| `MAX_FILE_SIZE_BYTES` | Non | int | `1073741824` | upload | Taille maximale de fichier en octets (1 Go) | `1073741824` |
| `FILE_EXPIRY_DAYS_DEFAULT` | Non | int | `7` | upload | Durée de vie par défaut d'un fichier uploadé, en jours | `7` |
| `DOWNLOAD_LINK_TTL_SECONDS` | Non | int | `86400` | partage | Durée de vie par défaut d'un lien de téléchargement, en secondes (24h) | `86400` |
| `ALLOWED_ORIGINS` | Non | string | `https://localhost` | sécurité | Origines CORS autorisées | `https://localhost` |
| `APP_PORT` | Non | int | `3001` | runtime | Port du backend | `3001` |
| `APP_ENV` | Non | string | `development` | runtime | Environnement applicatif (non lu par le code à ce jour) | `production` |

## Lancement

```bash
# Démarrer tous les services (Nginx + Frontend + Backend + PostgreSQL + MinIO)
make up

# Initialiser/migrer la base de données (première exécution)
make prisma-push

# Ou manuellement :
docker compose -f infra/docker-compose.yml --env-file .env up -d
docker compose -f infra/docker-compose.yml exec backend npx prisma db push
```

L'application est disponible sur **https://localhost** (accepter l'avertissement du certificat auto-signé).

Console MinIO : **http://localhost:9001** (identifiants depuis `.env`)

## Tests

### Tests unitaires

```bash
cd backend
npm test              # Exécuter tous les tests (68 tests, 6 suites)
npm run test:cov      # Exécuter avec rapport de couverture (seuil : 70%)
```

### Tests de bout en bout (E2E)

```bash
# Prérequis : les services doivent tourner (make up + make prisma-push)
cd e2e
npm install
npx playwright install chromium
npx playwright test   # 21 tests, 10 specs (US01-US10)
```

### Tests de performance (k6)

```bash
# Prérequis : les services doivent tourner + k6 installé
k6 run k6/upload-test.js
```

## Sécurité

- **TLS** : Nginx gère la terminaison HTTPS (certificats auto-signés en développement)
- **Authentification** : JWT HS256 (15 min) + rotation des tokens de rafraîchissement (7 jours)
- **Mots de passe** : Hachés avec bcrypt (10 tours de salage)
- **Téléchargements** : Tokens crypto avec TTL + nombre maximum de téléchargements
- **Validation** : class-validator sur tous les DTOs (requêtes entrantes)
- **CORS** : Restreint à `ALLOWED_ORIGINS`
- **Secrets** : Variables d'environnement uniquement (rien de codé en dur)

Voir `docs/security/SECURITY.md` pour l'audit de sécurité complet.

## Limitations / Points d'attention

- Certificats TLS auto-signés en développement (avertissement navigateur)
- Pas de rate limiting (recommandé post-MVP)
- Pas de vérification d'email (recommandé post-MVP)
- Pas d'en-têtes CSP (recommandé post-MVP)
- Pas de streaming pour les gros fichiers (limite mémoire sur l'upload)
