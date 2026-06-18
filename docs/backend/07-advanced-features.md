# US07-US10 — Fonctionnalités avancées

## Vue d'ensemble

Fonctionnalités avancées de gestion de fichiers : protection par mot de passe, téléversement anonyme, étiquetage, historique des téléchargements.

## US07 : Fichiers protégés par mot de passe

### Routes

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| PUT | /api/files/:id/password | JWT | Définir/mettre à jour le mot de passe du fichier |
| DELETE | /api/files/:id/password | JWT | Supprimer la protection par mot de passe |

### Flux

1. Le propriétaire définit un mot de passe via `PUT /api/files/:id/password` avec `{ "password": "..." }`
2. Le mot de passe est haché avec bcrypt (10 tours de salage) et stocké dans `files.password_hash`
3. Le flux de téléchargement vérifie `file.passwordHash` — si défini, nécessite une vérification du mot de passe
4. Le propriétaire peut supprimer le mot de passe via `DELETE /api/files/:id/password`

### DTOs

```typescript
// SetPasswordDto
{
  password: string  // minimum 4 caractères
}
```

## US08 : Téléversement anonyme

### Routes

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| POST | /api/files/anonymous | Public | Téléverser un fichier sans authentification |

### Flux

1. Pas de JWT requis — `userId` est défini à `null`
2. Les fichiers sont stockés sous le préfixe `anonymous/` dans MinIO
3. Expiration par défaut : 1 jour (contre 7 jours pour les téléversements authentifiés)
4. Même validation : limite de taille de fichier, extensions interdites

## US09 : Étiquetage de fichiers

### Routes

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| PUT | /api/files/:id/tags | JWT | Définir les étiquettes (remplace toutes) |
| GET | /api/files/:id/tags | JWT | Obtenir les étiquettes du fichier |

### Flux

1. Les étiquettes sont normalisées en minuscules, espaces supprimés
2. Les étiquettes sont upsertées (créées si inexistantes)
3. `PUT` remplace toutes les associations fichier-étiquette existantes
4. Maximum 10 étiquettes par fichier, maximum 30 caractères par étiquette

### DTOs

```typescript
// ManageTagsDto
{
  tags: string[]  // max 10 éléments, chacun max 30 caractères
}
```

## US10 : Historique des téléchargements

### Routes

| Méthode | Chemin | Auth | Description |
|---------|--------|------|-------------|
| GET | /api/files/:id/history | JWT | Obtenir l'historique des téléchargements (100 derniers) |

### Flux

1. Chaque téléchargement via `GET /api/download/:token` enregistre une entrée
2. Données stockées : fileId, tokenId, downloadedAt, ipAddress, userAgent
3. Le propriétaire peut consulter les 100 derniers téléchargements via le point de terminaison historique

### Schéma de base de données

```
DownloadHistory:
  id           UUID PK
  fileId       UUID FK → files.id
  tokenId      UUID FK → download_tokens.id (nullable)
  downloadedAt TIMESTAMP
  ipAddress    VARCHAR(45) (nullable)
  userAgent    VARCHAR(500) (nullable)
```

## Variables d'environnement

Aucune nouvelle variable d'environnement requise pour US07-US10.
