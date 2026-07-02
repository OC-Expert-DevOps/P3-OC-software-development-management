# DataShare — Patterns Système & Décisions d'Architecture

## Pattern d'Authentification

**Décision** : JWT Access Token (15min) + Refresh Token (7 jours, cookie HttpOnly)

- **Contexte** : Le cahier des charges exige JWT (US03/US04). Besoin d'équilibre entre sécurité et UX pour la SPA.
- **Impact** : Le jeton d'accès à durée courte limite la fenêtre d'exposition. Le jeton de rafraîchissement en cookie HttpOnly protège contre le XSS.
- **Implémentation** :
  - Jeton d'accès : signé avec HS256, contient `{ sub: user_id, email }`, TTL de 15min
  - Jeton de rafraîchissement : UUID stocké sous forme de hash bcrypt dans la table `RefreshToken`, TTL de 7 jours
  - Cookie : `HttpOnly`, `Secure`, `SameSite=Strict`
  - Déconnexion : révoque le jeton de rafraîchissement en BDD (`is_revoked = true`)
- **Hachage de mot de passe** : bcrypt avec salt rounds = 12

## Pattern de Stockage de Fichiers

**Décision** : MinIO avec URLs présignées pour les téléchargements

- **Contexte** : Besoin d'un stockage compatible S3, auto-hébergé pour la démo Docker Compose.
- **Impact** : Les fichiers sont téléversés via NestJS (flux vers MinIO), mais les téléchargements utilisent des URLs présignées (MinIO direct → client, pas de surcharge proxy).
- **Implémentation** :
  - Téléversement : `PUT` via `@aws-sdk/client-s3` dans NestJS → MinIO
  - Téléchargement : NestJS génère une URL présignée `GET` (TTL 5min) → redirection 302 vers le client
  - Clé de stockage : basée sur UUID (`{uuid}/{original_filename}`)
  - Taille maximale de fichier : 1 Go (validé côté serveur)
  - Extensions interdites : `.exe`, `.bat`, `.cmd`, `.sh`, `.ps1` (configurable)

## Pattern de Lien de Téléchargement

**Décision** : Jeton UUID v4, non prédictible, stocké en BDD avec expiration

- **Contexte** : Les liens doivent être uniques, non devinables et expirer (US02, US10).
- **Impact** : Le jeton est un UUID v4 (non séquentiel), stocké dans la table `DownloadToken` avec `expires_at`.
- **Implémentation** :
  - Jeton : `crypto.randomUUID()` — 128 bits aléatoires
  - Expiration par défaut : 7 jours (configurable de 1 à 7 jours par l'utilisateur)
  - Format d'URL de téléchargement : `GET /api/download/{token}`
  - Point d'accès info : `GET /api/download/{token}/info` (affiche les métadonnées avant téléchargement)

## Pattern de Téléversement Anonyme (US07)

**Décision** : `user_id` nullable sur l'entité `File`

- **Contexte** : US07 autorise les téléversements sans authentification.
- **Impact** : Les fichiers anonymes ont `user_id = NULL`, pas d'historique, pas de gestion.
- **Implémentation** : Point d'accès séparé `POST /api/files/anonymous` (public)

## Pattern de Gestion des Tags (US08)

**Décision** : Relation plusieurs-à-plusieurs via la table de jonction `FileTag`

- **Contexte** : Les tags sont en texte libre, max 30 caractères, pas de doublons par fichier.
- **Impact** : Entité `Tag` séparée avec nom unique, liée via `FileTag`.
- **Implémentation** : UPSERT du tag par nom, INSERT de la ligne de jonction, ignorer les doublons.

## Pattern de Mot de Passe de Fichier (US09)

**Décision** : `password_hash` nullable sur l'entité `File`

- **Contexte** : Protection optionnelle par mot de passe au téléchargement de fichier.
- **Impact** : Si défini, le mot de passe est requis avant d'autoriser le téléchargement.
- **Implémentation** : Hash bcrypt stocké sur `File`, vérifié au moment du téléchargement. Min 6 caractères.

## Pattern d'Expiration Automatique (US10)

**Décision** : Planificateur `@Cron` NestJS, purge quotidienne à minuit

- **Contexte** : Les fichiers expirent après une durée configurable (1 à 7 jours).
- **Impact** : Le CronJob s'exécute quotidiennement, supprime les fichiers expirés de MinIO + marque `is_deleted=true` en BDD.
- **Implémentation** :
  - Planificateur : `@Cron('0 0 * * *')`  via `@nestjs/schedule`
  - Purge : SELECT expirés → DELETE de MinIO → UPDATE `is_deleted=true` → invalider les jetons

## Pattern de Gestion des Erreurs

**Décision** : Réponses d'erreur JSON standardisées

- **Format** :
  ```json
  {
    "error": {
      "code": "NotFound",
      "message": "File not found"
    }
  }
  ```
- **Codes** : `ValidationError`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`, `LinkExpired`, `PasswordRequired`, `FileTooLarge`, `ForbiddenFileType`

## Pattern d'Infrastructure (Docker Compose)

**Décision** : 5 services sur un seul réseau bridge, seul Nginx exposé

- **Contexte** : Démo MVP pour investisseurs, doit être facile à démarrer et autonome.
- **Impact** : Une seule commande `make up` démarre tout. Aucune dépendance externe.
- **Implémentation** :
  - Tous les services sur le réseau bridge `datashare-net`
  - Seul Nginx exposé (ports 80/443) — tous les autres services internes
  - `infra/docker-compose.yml` avec chemins relatifs (`../backend`, `../frontend`)
  - Healthchecks sur postgres + minio → le backend attend que les deux soient sains
  - Volumes nommés pour la persistance (`postgres-data`, `minio-data`)
  - `make reset` détruit les volumes pour un démarrage propre

## Pattern de Routage Nginx

**Décision** : Terminaison TLS + proxy inverse, routage par chemin

- **Contexte** : Besoin de HTTPS pour la démo sécurité, point d'entrée unique pour le navigateur.
- **Impact** : Le navigateur ne communique qu'avec Nginx. Le frontend et le backend sont des services internes.
- **Implémentation** :
  - `/` → `frontend:3000` (SPA React)
  - `/api/` → `backend:3001` (API NestJS)
  - Certificats TLS auto-signés dans `infra/nginx/certs/` (gitignored)
  - Redirection HTTP → HTTPS (301)

## Pattern de Schéma Prisma

**Décision** : Mapping snake_case en BDD avec `@@map` / `@map`

- **Contexte** : TypeScript utilise camelCase, la convention PostgreSQL est snake_case.
- **Impact** : Les modèles Prisma utilisent camelCase dans le code, snake_case en BDD. Propre pour les deux mondes.
- **Implémentation** :
  - Modèle `User` → table `users` (`@@map("users")`)
  - Champ `createdAt` → colonne `created_at` (`@map("created_at")`)
  - 6 entités : User, File, DownloadToken, RefreshToken, Tag, FileTag
  - Relations : User 1→N File, File 1→N DownloadToken, User 1→N RefreshToken, File M→N Tag (via FileTag)

## Pattern de Suppression de Fichier (US06)

**Décision** : Suppression physique de MinIO + suppression logique en BDD

- **Contexte** : Le cahier des charges indique que la suppression est irréversible et physique.
- **Impact** : L'objet est supprimé de MinIO, `is_deleted=true` en BDD, tous les jetons de téléchargement invalidés.
- **Implémentation** : DELETE objet MinIO → UPDATE File → UPDATE DownloadToken `expires_at=NOW()`

## Automatic Cleanup (Cron Job)

**Décision** : Cron job toutes les heures pour purger les données expirées (BDD + MinIO)

- **Contexte** : Les fichiers, tokens de téléchargement et refresh tokens ont un `expiresAt` mais rien ne les supprimait automatiquement. Les données expirées s'accumulaient indéfiniment.
- **Impact** : Le stockage MinIO et la base PostgreSQL sont nettoyés automatiquement. Aucune intervention manuelle requise.
- **Implémentation** :
  - `CleanupService` utilise `@nestjs/schedule` (`@Cron(CronExpression.EVERY_HOUR)`)
  - Fichiers expirés : suppression MinIO + soft-delete BDD + invalidation tokens
  - Download tokens expirés > 24h : hard-delete BDD
  - Refresh tokens expirés/révoqués > 24h : hard-delete BDD
  - Rétention de 24h post-expiration pour audit/debugging
- **Alternatives rejetées** : Lifecycle policy MinIO (ne gère pas la cohérence BDD), cleanup à la lecture (ne libère pas le stockage proactivement)
