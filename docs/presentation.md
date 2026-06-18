# DataShare — Présentation Soutenance

> Support de présentation pour la soutenance du projet P3 — Gestion du développement logiciel

---

## Slide 1 — Contexte & Problème

### DataShare — Plateforme de transfert sécurisé de fichiers

**Contexte :** Les freelances et petites entreprises ont besoin d'échanger des fichiers de manière sécurisée, sans dépendre de services cloud tiers coûteux.

**Problème résolu :**
- Upload de fichiers avec stockage sécurisé
- Liens de téléchargement temporaires et protégeables par mot de passe
- Gestion autonome des fichiers (liste, suppression, tags)
- Authentification sécurisée (JWT + refresh tokens)

**Objectif MVP :** Prototype fonctionnel en 4 semaines pour une démo investisseurs.

---

## Slide 2 — Architecture technique

```
┌──────────────┐     HTTPS      ┌──────────────┐
│   Browser    │ ──────────────▶│    Nginx      │
│              │                │  (TLS proxy)  │
└──────────────┘                └──────┬───────┘
                                       │
                        ┌──────────────┼──────────────┐
                        ▼              ▼              │
                 ┌────────────┐ ┌────────────┐        │
                 │  React/    │ │  NestJS    │        │
                 │  Vite SPA  │ │  REST API  │        │
                 └────────────┘ └─────┬──────┘        │
                                      │               │
                        ┌─────────────┼───────────┐   │
                        ▼                         ▼   │
                 ┌────────────┐           ┌───────────┐
                 │ PostgreSQL │           │   MinIO   │
                 │   (BDD)    │           │ (S3 files)│
                 └────────────┘           └───────────┘
```

**5 services Docker Compose** — Un seul `make up` pour tout démarrer.

---

## Slide 3 — Stack technique & justification

| Couche | Choix | Pourquoi |
|--------|-------|----------|
| Backend | **NestJS** (TypeScript) | Architecture modulaire, DI, Swagger auto |
| Frontend | **React 18** + Vite | Écosystème large, build rapide |
| BDD | **PostgreSQL** | Robustesse, types avancés (UUID, BigInt) |
| Stockage | **MinIO** (S3) | Self-hosted, zéro vendor lock-in |
| Auth | **JWT + Refresh tokens** | Stateless, rotation de tokens |
| ORM | **Prisma** | Schema-first, migrations typées |
| Tests | **Jest** + **Playwright** | Unitaires + E2E couvrant tous les US |

---

## Slide 4 — Fonctionnalités implémentées (US01-US10)

| US | Fonctionnalité | Statut |
|----|---------------|--------|
| US01 | Upload de fichier (authentifié) | ✅ |
| US02 | Liens de téléchargement temporaires | ✅ |
| US03 | Inscription utilisateur | ✅ |
| US04 | Connexion / déconnexion | ✅ |
| US05 | Liste paginée des fichiers | ✅ |
| US06 | Statistiques utilisateur | ✅ |
| US07 | Protection par mot de passe | ✅ |
| US08 | Upload anonyme (1 jour) | ✅ |
| US09 | Tagging de fichiers | ✅ |
| US10 | Historique des téléchargements | ✅ |

**14 routes API REST** — Toutes documentées en OpenAPI 3.0.

---

## Slide 5 — Qualité & Tests

### Couverture

| Type | Résultat |
|------|---------|
| **Tests unitaires** | 68 tests, **72.82% coverage** ✅ |
| **Tests E2E** | 21/21 (Playwright, US01-US10) ✅ |
| **Performance** | Upload p95 ~350ms (k6, 10 VUs) ✅ |
| **Sécurité** | npm audit : 47 vulns transitives documentées ✅ |

### Documentation qualité

- `TESTING.md` — Plan de tests + résultats
- `SECURITY.md` — Scan + revue de sécurité
- `PERF.md` — Tests k6 + budget front
- `MAINTENANCE.md` — Procédures maintenance

---

## Slide 6 — Sécurité

| Mesure | Implémentation |
|--------|---------------|
| Mots de passe | bcrypt (10 salt rounds) |
| TLS | Nginx HTTPS (certifs auto-signés dev) |
| JWT | HS256, 15min TTL, rotation refresh tokens |
| Injection SQL | Prisma (requêtes paramétrées) |
| Validation | class-validator sur tous les DTOs |
| Secrets | Variables d'env uniquement (.env non commité) |
| CORS | Restreint à `ALLOWED_ORIGINS` |
| Downloads | Tokens crypto, TTL + nb max téléchargements |

---

## Slide 7 — Difficultés rencontrées & solutions

| Difficulté | Cause | Solution |
|------------|-------|----------|
| **MinIO SSL crash** | `MINIO_USE_SSL=false` (string truthy en JS) | Comparaison stricte `=== 'true'` |
| **Presigned URL cassée** | Signature HMAC sur hostname Docker interne | Deuxième client S3 pour URLs publiques |
| **BigInt JSON crash** | Prisma retourne BigInt, `JSON.stringify` crashe | Override `BigInt.prototype.toJSON` |
| **E2E auth fixture** | Register redirige vers `/login`, pas `/dashboard` | Helper `registerAndLogin` dédié |
| **JWT userId null** | Guard mappait mal `payload.sub` | Fix `payload.sub → request.user.userId` |

**Leçon principale :** Les logs réels sont la clé du debugging — toujours partir du message d'erreur exact.

---

## Slide 8 — Utilisation de l'IA

### Approche : binômage supervisé

- **Outils** : Cline/Claude (architecture, debugging) + GitHub Copilot (code US01)
- **Posture** : L'IA comme développeur junior supervisé
- **Supervision** : Chaque livrable revu et corrigé par le dev humain

### Résultats concrets

- **Gain de temps** : ~60% sur scaffolding, tests, documentation
- **5 corrections humaines** documentées sur le code Copilot (US01)
- **Debugging efficace** quand on fournit les logs réels (MinIO EPROTO, BigInt)
- **Limite principale** : ne remplace pas la revue sécurité/architecture

> 📖 Documentation complète : `docs/ai-usage/`

---

## Slide 9 — Gestion de projet & workflow

### Méthodologie

- **Trunk-based** sur `main` avec branches `feature/step*`
- **Conventional Commits** : `feat:`, `fix:`, `docs:`, `test:`
- **Issues GitHub** typées + PRs avec squash-merge
- **CHANGELOG.md** maintenu à chaque version (v0.1.0 → v0.8.0)

### Historique

| Version | Contenu | PR |
|---------|---------|-----|
| v0.1.0 | Architecture & design | #2 |
| v0.2.0 | Infrastructure Docker | #4 |
| v0.3.0 | Auth (JWT + refresh) | #6 |
| v0.4.0 | Upload + Download + Features | #14-#17 |
| v0.5.0 | E2E tests Playwright | #24-#28 |
| v0.6.0 | Tests unitaires 72% | #34 |
| v0.7.0 | Quality docs + SSL fix | #37 |
| v0.8.0 | Documentation finale | #39 |

---

## Slide 10 — Roadmap post-MVP

| Priorité | Amélioration |
|----------|-------------|
| **Haute** | Rate limiting (auth endpoints) |
| **Haute** | Email verification à l'inscription |
| **Moyenne** | CSP headers Nginx |
| **Moyenne** | Streaming upload (fichiers > 100MB) |
| **Basse** | Redis cache pour les listes de fichiers |
| **Basse** | CDN pour les downloads |
| **Basse** | Monitoring (Prometheus + Grafana) |

---

## Conclusion

### Ce qui a été livré

✅ Application complète avec 10 user stories
✅ 14 routes API documentées (OpenAPI 3.0)
✅ 68 tests unitaires (72% coverage) + 21 E2E
✅ 4 fichiers qualité (TESTING, SECURITY, PERF, MAINTENANCE)
✅ Documentation technique complète (modèle OC)
✅ Historique Git propre (Issues, PRs, CHANGELOG)

### Questions ?
