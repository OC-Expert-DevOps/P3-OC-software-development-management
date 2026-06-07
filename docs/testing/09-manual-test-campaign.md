# Manual Test Campaign — DataShare Platform v0.5.2

**Date :** 2026-06-07
**Testeur :**
**Environnement :** Local (Docker Compose)
**URL :** https://localhost

---

## Prérequis

```bash
# 1. Démarrer l'infrastructure
cd infra && docker compose up -d

# 2. Vérifier que tous les services tournent
docker compose ps
# → 5 services UP : nginx, frontend, backend, postgres, minio

# 3. S'assurer que la DB est initialisée
docker compose exec backend npx prisma db push

# 4. Ouvrir le navigateur
open https://localhost
# → Accepter le certificat auto-signé
```

---

## Campagne de Tests

### CT-01 : Inscription utilisateur (US03)

| # | Action | Résultat attendu | ✅/❌ | Remarques |
|---|--------|-------------------|-------|-----------|
| 1.1 | Naviguer vers `https://localhost/register` | Page d'inscription affichée avec champs Email et Password | | |
| 1.2 | Remplir : `testuser@datashare.local` / `Password123!` → Cliquer "Register" | Redirection vers `/login`, pas d'erreur | | |
| 1.3 | Réessayer avec le même email `testuser@datashare.local` | Message d'erreur "already exists" affiché | | |
| 1.4 | Essayer avec un mot de passe court (`abc`) → Cliquer "Register" | Validation HTML5 empêche la soumission (min 8 caractères) | | |
| 1.5 | Essayer avec un email invalide (`pas-un-email`) | Validation HTML5 empêche la soumission | | |

---

### CT-02 : Connexion / Déconnexion (US04)

| # | Action | Résultat attendu | ✅/❌ | Remarques |
|---|--------|-------------------|-------|-----------|
| 2.1 | Naviguer vers `https://localhost/login` | Page de connexion affichée | | |
| 2.2 | Se connecter avec `testuser@datashare.local` / `Password123!` | Redirection vers `/dashboard`, navbar affiche l'email | | |
| 2.3 | Vérifier `localStorage` (DevTools → Application → Local Storage) | Clé `accessToken` présente avec un JWT valide | | |
| 2.4 | Cliquer "Logout" dans la navbar | Redirection vers `/login`, `accessToken` supprimé du localStorage | | |
| 2.5 | Se connecter avec mauvais password (`testuser@datashare.local` / `wrong`) | Message d'erreur affiché, reste sur `/login` | | |

---

### CT-03 : Protection des routes (Auth Guard)

| # | Action | Résultat attendu | ✅/❌ | Remarques |
|---|--------|-------------------|-------|-----------|
| 3.1 | Sans être connecté, naviguer vers `https://localhost/dashboard` | Redirection automatique vers `/login` | | |
| 3.2 | Sans être connecté, naviguer vers `https://localhost/upload` | Redirection automatique vers `/login` | | |
| 3.3 | Se connecter, puis accéder à `/dashboard` | Page dashboard affichée correctement | | |

---

### CT-04 : Upload de fichier (US01)

| # | Action | Résultat attendu | ✅/❌ | Remarques |
|---|--------|-------------------|-------|-----------|
| 4.1 | Se connecter → Naviguer vers `/upload` | Page upload avec zone drag & drop | | |
| 4.2 | Cliquer sur la zone → Sélectionner un fichier texte (< 1MB) | Nom du fichier affiché dans la zone, fond vert | | |
| 4.3 | Cliquer "Upload" | Barre de progression → Redirection vers `/dashboard` | | |
| 4.4 | Vérifier le dashboard | Fichier apparaît dans le tableau avec nom, type, taille, date | | |
| 4.5 | Uploader un second fichier (image PNG ou PDF) | Fichier ajouté au tableau, 2 lignes visibles | | |
| 4.6 | Tester drag & drop : glisser un fichier sur la zone | Fichier sélectionné, nom affiché | | |

---

### CT-05 : Liste des fichiers (US05)

| # | Action | Résultat attendu | ✅/❌ | Remarques |
|---|--------|-------------------|-------|-----------|
| 5.1 | Se connecter (nouvel utilisateur sans fichiers) → `/dashboard` | Message "No files yet" avec lien vers Upload | | |
| 5.2 | Uploader un fichier → Retour au dashboard | Tableau avec colonnes : Name, Type, Size, Uploaded, Actions | | |
| 5.3 | Vérifier les métadonnées du fichier | Nom correct, type MIME correct, taille lisible, date du jour | | |
| 5.4 | Vérifier les boutons Actions | Boutons "🔗 Link" et "🗑️ Delete" présents sur chaque ligne | | |

---

### CT-06 : Génération de lien de téléchargement (US02)

| # | Action | Résultat attendu | ✅/❌ | Remarques |
|---|--------|-------------------|-------|-----------|
| 6.1 | Sur le dashboard, cliquer "🔗 Link" sur un fichier | Notification verte "Download link copied!" avec URL affichée | | |
| 6.2 | Copier l'URL du lien affiché | URL copiée dans le presse-papier (vérifier avec Ctrl+V) | | |
| 6.3 | Ouvrir une fenêtre **incognito/privée** → Coller l'URL | Téléchargement du fichier démarre (sans connexion requise) | | |
| 6.4 | Vérifier le fichier téléchargé | Contenu identique à l'original | | |

---

### CT-07 : Suppression de fichier

| # | Action | Résultat attendu | ✅/❌ | Remarques |
|---|--------|-------------------|-------|-----------|
| 7.1 | Sur le dashboard, cliquer "🗑️ Delete" sur un fichier | Popup de confirmation "Delete this file?" | | |
| 7.2 | Confirmer la suppression | Fichier disparaît du tableau | | |
| 7.3 | Rafraîchir la page | Fichier toujours absent (suppression persistée) | | |

---

### CT-08 : Statistiques utilisateur (US06)

| # | Action | Résultat attendu | ✅/❌ | Remarques |
|---|--------|-------------------|-------|-----------|
| 8.1 | Se connecter → Ouvrir DevTools → Console | Console ouverte | | |
| 8.2 | Exécuter dans la console : `fetch('/api/files/stats', {headers: {'Authorization': 'Bearer ' + localStorage.getItem('accessToken')}}).then(r=>r.json()).then(console.log)` | Objet JSON avec `fileCount`, `totalSizeBytes`, `activeLinks` | | |
| 8.3 | Vérifier que `fileCount` correspond au nombre de fichiers visibles | Valeur cohérente | | |

---

### CT-09 : Protection par mot de passe (US07)

| # | Action | Résultat attendu | ✅/❌ | Remarques |
|---|--------|-------------------|-------|-----------|
| 9.1 | Uploader un fichier → Récupérer son ID via DevTools (Network tab lors du GET /api/files) | ID du fichier visible dans la réponse JSON | | |
| 9.2 | Dans la console, exécuter : `fetch('/api/files/{ID}/password', {method:'PUT', headers:{'Authorization':'Bearer '+localStorage.getItem('accessToken'),'Content-Type':'application/json'}, body:JSON.stringify({password:'secret123'})}).then(r=>r.json()).then(console.log)` | Réponse 200 avec message "Password set successfully" | | |
| 9.3 | Supprimer le mot de passe : `fetch('/api/files/{ID}/password', {method:'DELETE', headers:{'Authorization':'Bearer '+localStorage.getItem('accessToken')}}).then(r=>console.log(r.status))` | Réponse 204 | | |

---

### CT-10 : Upload anonyme (US08)

| # | Action | Résultat attendu | ✅/❌ | Remarques |
|---|--------|-------------------|-------|-----------|
| 10.1 | Ouvrir un terminal. Exécuter : `curl -k -X POST https://localhost/api/files/anonymous -F "file=@/path/to/a/file.txt"` | Réponse JSON 201 avec objet fichier (userId: null, expiresAt: demain) | | |
| 10.2 | Vérifier que `userId` est `null` dans la réponse | Fichier créé sans propriétaire | | |
| 10.3 | Vérifier que `expiresAt` est dans ~24h | Date d'expiration correcte | | |

---

### CT-11 : Tags de fichiers (US09)

| # | Action | Résultat attendu | ✅/❌ | Remarques |
|---|--------|-------------------|-------|-----------|
| 11.1 | Ajouter des tags via console : `fetch('/api/files/{ID}/tags', {method:'PUT', headers:{'Authorization':'Bearer '+localStorage.getItem('accessToken'),'Content-Type':'application/json'}, body:JSON.stringify({tags:['document','important']})}).then(r=>r.json()).then(console.log)` | Réponse 200 avec fichier contenant `fileTags` | | |
| 11.2 | Vérifier normalisation : envoyer `["Doc","IMPORTANT"]` | Tags retournés en minuscules (`doc`, `important`) | | |
| 11.3 | Essayer d'ajouter 11 tags | Réponse 400 (Bad Request) | | |
| 11.4 | Lire les tags : `fetch('/api/files/{ID}/tags', {headers:{'Authorization':'Bearer '+localStorage.getItem('accessToken')}}).then(r=>r.json()).then(console.log)` | Liste des tags du fichier | | |

---

### CT-12 : Historique de téléchargement (US10)

| # | Action | Résultat attendu | ✅/❌ | Remarques |
|---|--------|-------------------|-------|-----------|
| 12.1 | Générer un lien pour un fichier (CT-06) | Lien créé | | |
| 12.2 | Utiliser le lien dans une fenêtre incognito (télécharger le fichier) | Fichier téléchargé | | |
| 12.3 | Consulter l'historique : `fetch('/api/files/{ID}/history', {headers:{'Authorization':'Bearer '+localStorage.getItem('accessToken')}}).then(r=>r.json()).then(console.log)` | Array avec au moins 1 entrée contenant `downloadedAt`, `ipAddress` | | |

---

### CT-13 : API — Vérifications sécurité

| # | Action | Résultat attendu | ✅/❌ | Remarques |
|---|--------|-------------------|-------|-----------|
| 13.1 | `curl -k https://localhost/api/files` (sans token) | Réponse 401 Unauthorized | | |
| 13.2 | `curl -k https://localhost/api/files/upload -X POST -F "file=@test.txt"` (sans token) | Réponse 401 Unauthorized | | |
| 13.3 | `curl -k https://localhost/api/files/stats` (sans token) | Réponse 401 Unauthorized | | |
| 13.4 | `curl -k https://localhost/api/auth/register -X POST -H "Content-Type: application/json" -d '{"email":"sec@test.com","password":"12345678"}'` | Réponse 201 (inscription autorisée sans token) | | |
| 13.5 | Vérifier HTTPS : `curl http://localhost/api/health` (sans TLS) | Redirection vers HTTPS ou erreur connexion | | |
| 13.6 | Vérifier Health endpoint : `curl -k https://localhost/api/health` | Réponse 200 avec status "ok" | | |

---

### CT-14 : Infrastructure Docker

| # | Action | Résultat attendu | ✅/❌ | Remarques |
|---|--------|-------------------|-------|-----------|
| 14.1 | `docker compose ps` (dans `infra/`) | 5 services UP (nginx, frontend, backend, postgres, minio) | | |
| 14.2 | `docker compose exec postgres pg_isready` | Message "accepting connections" | | |
| 14.3 | Accéder à MinIO console : `http://localhost:9001` (login: minioadmin/minioadmin) | Console MinIO accessible, bucket `datashare` visible | | |
| 14.4 | Vérifier les fichiers uploadés dans le bucket MinIO | Fichiers présents dans le bucket `datashare` | | |
| 14.5 | `docker compose down && docker compose up -d` (restart complet) | Tous les services redémarrent, données persistées (volumes) | | |
| 14.6 | Après restart, se connecter et vérifier les fichiers | Fichiers toujours présents (volumes PostgreSQL + MinIO) | | |

---

## Résumé de la Campagne

| Section | Nb Tests | Passés | Échoués | Bloqués |
|---------|----------|--------|---------|---------|
| CT-01 Inscription | 5 | | | |
| CT-02 Connexion/Déconnexion | 5 | | | |
| CT-03 Protection routes | 3 | | | |
| CT-04 Upload | 6 | | | |
| CT-05 Liste fichiers | 4 | | | |
| CT-06 Lien téléchargement | 4 | | | |
| CT-07 Suppression | 3 | | | |
| CT-08 Statistiques | 3 | | | |
| CT-09 Password | 3 | | | |
| CT-10 Upload anonyme | 3 | | | |
| CT-11 Tags | 4 | | | |
| CT-12 Historique | 3 | | | |
| CT-13 Sécurité | 6 | | | |
| CT-14 Infrastructure | 6 | | | |
| **TOTAL** | **58** | | | |

---

## Bilan

**Date de fin :**
**Testeur :**
**Verdict global :** ✅ PASS / ❌ FAIL

**Anomalies détectées :**

| # | Sévérité | Description | CT associé |
|---|----------|-------------|------------|
| | | | |

**Commentaires :**

