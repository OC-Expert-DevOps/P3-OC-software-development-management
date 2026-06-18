# Tests E2E — Plateforme DataShare

## Vue d'ensemble

Les tests de bout en bout utilisent **Playwright** (Chromium) pour valider toutes les user stories à travers la pile complète (frontend → nginx → backend → PostgreSQL + MinIO).

## Prérequis

```bash
# L'infrastructure doit être en cours d'exécution
cd infra && docker compose up -d

# Les tables Prisma doivent exister
docker compose exec backend npx prisma db push

# Installer Playwright
cd e2e && npm install && npx playwright install chromium
```

## Exécution des tests

```bash
cd e2e

# Exécuter tous les tests
npx playwright test

# Exécuter une US spécifique
npx playwright test tests/us01-upload.spec.ts

# Exécuter avec navigateur visible
npx playwright test --headed

# Exécuter avec sortie détaillée
npx playwright test --reporter=list
```

## Configuration des tests

| Paramètre | Valeur |
|-----------|--------|
| URL de base | `https://localhost` |
| Navigateur | Chromium (headless) |
| TLS | Contournement certificat auto-signé (`ignoreHTTPSErrors: true`) |
| Timeout | 30s (test), 15s (navigation) |
| Workers | 1 (séquentiel — état BDD partagé) |

---

## User Stories — Détails des tests

### US01 — Téléversement de fichier (authentifié)

**Fichier :** `tests/us01-upload.spec.ts`

| Test | Description | Étapes | Attendu |
|------|-------------|--------|---------|
| Upload fichier + voir dans le dashboard | L'utilisateur authentifié téléverse un fichier via l'interface | 1. Inscription + connexion 2. Navigation vers `/upload` 3. Sélection de `test-file.txt` 4. Clic sur soumettre 5. Attente de redirection vers `/dashboard` | Le fichier apparaît dans la liste du dashboard avec le nom "test-file.txt" |
| Redirection vers login si non authentifié | L'utilisateur non authentifié visite `/upload` | 1. Navigation vers `/upload` sans connexion | Redirection vers `/login` |

**Préconditions :** Infrastructure en cours d'exécution, utilisateur propre (email unique par exécution de test)
**Données de test :** `e2e/fixtures/test-file.txt` (petit fichier texte)

---

### US02 — Liens de téléchargement

**Fichier :** `tests/us02-download-links.spec.ts`

| Test | Description | Étapes | Attendu |
|------|-------------|--------|---------|
| Générer un lien de téléchargement | Créer un lien de téléchargement temporaire pour un fichier uploadé | 1. Inscription + connexion + upload 2. Sur le dashboard, clic sur le bouton "Lien" 3. Copier le lien généré | L'URL du lien est affichée, contient le chemin `/download/` |
| Accéder au lien publiquement | Télécharger le fichier sans authentification | 1. Inscription + connexion + upload + génération du lien 2. Ouvrir un nouveau contexte incognito 3. Naviguer vers le lien de téléchargement | Le fichier se télécharge avec succès (HTTP 200 ou 302) |

**Préconditions :** Au moins un fichier téléversé
**API utilisée :** `POST /api/files/:id/links`, `GET /api/download/:token`

---

### US03 — Inscription utilisateur

**Fichier :** `tests/us03-register.spec.ts`

| Test | Description | Étapes | Attendu |
|------|-------------|--------|---------|
| Inscrire un nouvel utilisateur | Inscription réussie | 1. Navigation vers `/register` 2. Remplir email + mot de passe (min 8 car.) 3. Soumettre | Redirection vers `/login`, pas d'erreur |
| Erreur email dupliqué | Inscription avec un email existant | 1. Inscrire un utilisateur A 2. Essayer de s'inscrire avec le même email | Message d'erreur "already exists" affiché |
| Validation mot de passe court | Validation HTML5 pour mot de passe < 8 | 1. Navigation vers `/register` 2. Saisir un mot de passe < 8 car. 3. Soumettre | La validation du formulaire empêche la soumission (HTML5 `minLength`) |

**Préconditions :** Aucune
**API utilisée :** `POST /api/auth/register`

---

### US04 — Connexion / Déconnexion

**Fichier :** `tests/us04-login.spec.ts`

| Test | Description | Étapes | Attendu |
|------|-------------|--------|---------|
| Connexion avec identifiants valides | Authentification réussie | 1. Inscrire un utilisateur 2. Navigation vers `/login` 3. Saisir les identifiants valides 4. Soumettre | Redirection vers `/dashboard`, JWT stocké dans localStorage |
| Erreur mot de passe incorrect | Échec d'authentification | 1. Inscrire un utilisateur 2. Essayer de se connecter avec un mauvais mot de passe | Message d'erreur affiché, reste sur `/login` |
| Déconnexion | Fin de session | 1. Se connecter 2. Cliquer sur le bouton de déconnexion | Redirection vers `/login`, JWT supprimé du localStorage |

**Préconditions :** Utilisateur inscrit (les tests créent le leur)
**API utilisée :** `POST /api/auth/login`, `POST /api/auth/logout`

---

### US05 — Liste des fichiers (paginée)

**Fichier :** `tests/us05-file-list.spec.ts`

| Test | Description | Étapes | Attendu |
|------|-------------|--------|---------|
| État vide | Dashboard sans fichiers | 1. Inscription + connexion (nouvel utilisateur) 2. Navigation vers `/dashboard` | Message d'état vide affiché |
| Afficher les fichiers téléversés | Les fichiers apparaissent dans la liste | 1. Inscription + connexion + upload 2. Navigation vers `/dashboard` | Ligne de fichier visible avec le nom du fichier |
| Afficher les métadonnées | Détails du fichier affichés | 1. Inscription + connexion + upload 2. Vérifier la ligne du fichier | Nom, type, taille, date visibles |

**Préconditions :** Nouvel utilisateur pour le test d'état vide
**API utilisée :** `GET /api/files?page=1&limit=20`

---

### US06 — Statistiques utilisateur

**Fichier :** `tests/us06-stats.spec.ts`

| Test | Description | Étapes | Attendu |
|------|-------------|--------|---------|
| Statistiques via API | Obtenir les statistiques des fichiers de l'utilisateur | 1. Inscription + connexion (obtenir JWT) 2. Appeler `GET /api/files/stats` avec le token Bearer | Réponse 200, corps contenant `fileCount`, `totalSizeBytes`, `activeLinks` |

**Préconditions :** Utilisateur authentifié
**API utilisée :** `GET /api/files/stats`
**Note :** Ce test utilise l'API `request` de Playwright (pas d'interaction UI)

---

### US07 — Protection par mot de passe

**Fichier :** `tests/us07-password.spec.ts`

| Test | Description | Étapes | Attendu |
|------|-------------|--------|---------|
| Définir un mot de passe sur un fichier | Protéger un fichier par mot de passe | 1. Inscription + connexion + upload 2. Appeler `PUT /api/files/:id/password` avec `{"password": "secret123"}` | Réponse 200, message "Password set successfully" |
| Supprimer le mot de passe | Déprotéger le fichier | 1. Définir un mot de passe 2. Appeler `DELETE /api/files/:id/password` | Réponse 204 |

**Préconditions :** Fichier téléversé appartenant à l'utilisateur
**API utilisée :** `PUT /api/files/:id/password`, `DELETE /api/files/:id/password`
**Note :** Utilise l'API `request` de Playwright après un upload via l'interface

---

### US08 — Upload anonyme

**Fichier :** `tests/us08-anonymous-upload.spec.ts`

| Test | Description | Étapes | Attendu |
|------|-------------|--------|---------|
| Téléversement anonyme | Upload sans authentification | 1. Appeler `POST /api/files/anonymous` avec des données multipart (sans token Bearer) | Réponse 201 avec objet fichier (userId: null, expiresAt: +1 jour) |

**Préconditions :** Aucune (endpoint public)
**API utilisée :** `POST /api/files/anonymous`
**Note :** Test API pur, pas d'interface impliquée

---

### US09 — Tags de fichiers

**Fichier :** `tests/us09-tags.spec.ts`

| Test | Description | Étapes | Attendu |
|------|-------------|--------|---------|
| Ajouter des tags à un fichier | Définir des tags via l'API | 1. Inscription + connexion + upload 2. Appeler `PUT /api/files/:id/tags` avec `{"tags": ["doc", "important"]}` | Réponse 200, fichier retourné avec `fileTags` contenant les objets tags |
| Normalisation en minuscules | Les tags sont mis en minuscules | 1. Upload 2. Définir les tags `["Doc", "IMPORTANT"]` 3. Récupérer les tags | Tous les tags retournés en minuscules |
| Rejet > 10 tags | Limite de validation | 1. Upload 2. Essayer de définir 11 tags | Réponse 400 (Bad Request) |

**Préconditions :** Fichier téléversé appartenant à l'utilisateur
**API utilisée :** `PUT /api/files/:id/tags`, `GET /api/files/:id/tags`

---

### US10 — Historique des téléchargements

**Fichier :** `tests/us10-history.spec.ts`

| Test | Description | Étapes | Attendu |
|------|-------------|--------|---------|
| Enregistrer les événements de téléchargement | Suivre les téléchargements de fichiers | 1. Inscription + connexion + upload 2. Générer un lien de téléchargement 3. Accéder au lien 4. Appeler `GET /api/files/:id/history` | Réponse 200, tableau avec au moins 1 entrée contenant `downloadedAt`, `ipAddress` |

**Préconditions :** Fichier avec lien de téléchargement, au moins un téléchargement effectué
**API utilisée :** `GET /api/files/:id/history`

---

## Architecture des tests

```
e2e/
├── playwright.config.ts       # Chromium, baseURL, timeouts
├── fixtures/
│   ├── auth.fixture.ts        # Helper registerAndLogin (email unique)
│   └── test-file.txt          # Fichier d'upload de test
├── pages/
│   ├── login.page.ts          # Objet page LoginPage
│   ├── register.page.ts       # Objet page RegisterPage
│   ├── dashboard.page.ts      # Objet page DashboardPage
│   └── upload.page.ts         # Objet page UploadPage
└── tests/
    ├── us01-upload.spec.ts    # 2 tests
    ├── us02-download-links.spec.ts  # 2 tests
    ├── us03-register.spec.ts  # 3 tests
    ├── us04-login.spec.ts     # 3 tests
    ├── us05-file-list.spec.ts # 3 tests
    ├── us06-stats.spec.ts     # 1 test
    ├── us07-password.spec.ts  # 2 tests
    ├── us08-anonymous-upload.spec.ts # 1 test
    ├── us09-tags.spec.ts      # 3 tests
    └── us10-history.spec.ts   # 1 test
```

**Total : 21 cas de test répartis sur 10 specs**

## Helper d'authentification

Tous les tests authentifiés utilisent `registerAndLogin()` depuis `fixtures/auth.fixture.ts` :

```typescript
// Inscrit un nouvel utilisateur avec email unique, puis se connecte
// Retourne { email, password } pour utilisation au niveau API
export async function registerAndLogin(page: Page, user: { email: string; password: string }) {
  // 1. Register → redirige vers /login
  // 2. Login → redirige vers /dashboard
  // 3. L'utilisateur est authentifié avec JWT dans localStorage
}
```

Chaque exécution de test utilise un email unique (`test-<timestamp>-<random>@example.com`) pour éviter les conflits.

## Dépannage

| Problème | Solution |
|----------|----------|
| Tous les tests échouent avec 500 | Exécuter `docker compose exec backend npx prisma db push` |
| Register retourne 400 | Vérifier que `RegisterDto` accepte `name` (optionnel) |
| Upload retourne 500 | Vérifier la sérialisation BigInt dans `main.ts` |
| Les fichiers ont `userId: null` | Vérifier que le JWT guard mappe `sub` → `userId` |
| Timeout sur l'état vide | Les données de tests précédents peuvent interférer — utiliser un nouvel utilisateur |
