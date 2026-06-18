# DataShare — Résumé du Projet

## Objectif

DataShare est une plateforme sécurisée de transfert de fichiers conçue pour les freelances et les petites entreprises. Elle permet aux utilisateurs de téléverser des fichiers et de générer des liens de téléchargement temporaires et sécurisés avec expiration et protection optionnelle par mot de passe.

## Utilisateurs Cibles

- **Utilisateurs inscrits** : freelances et petites entreprises ayant besoin de partager des fichiers de manière sécurisée
- **Téléverseurs anonymes** (optionnel US07) : toute personne ayant besoin d'un partage rapide de fichiers sans compte
- **Destinataires de téléchargement** : toute personne disposant d'un lien de téléchargement valide (aucun compte requis)

## Périmètre MVP (US01–US06)

| US | Fonctionnalité | Priorité |
|----|----------------|----------|
| US01 | Téléversement avec compte — génération d'un lien de téléchargement unique | MVP |
| US02 | Téléchargement via lien — accès public avec mot de passe optionnel | MVP |
| US03 | Inscription utilisateur — email + mot de passe, JWT | MVP |
| US04 | Connexion utilisateur — email + mot de passe → JWT | MVP |
| US05 | Historique des fichiers — liste des fichiers téléversés avec statut | MVP |
| US06 | Suppression de fichier — suppression physique, irréversible | MVP |

## Fonctionnalités Avancées (US07–US10, optionnelles)

| US | Fonctionnalité | Priorité |
|----|----------------|----------|
| US07 | Téléversement anonyme — sans compte, sans historique | Optionnel |
| US08 | Gestion des tags — organiser les fichiers avec des tags | Optionnel |
| US09 | Mot de passe de fichier — protéger les téléchargements par mot de passe | Optionnel |
| US10 | Expiration automatique — tâche cron purgeant les fichiers expirés quotidiennement | Optionnel |

## Hors Périmètre

- Paiement / facturation
- Rôles administrateur ou tableau de bord administrateur
- Collaboration en temps réel
- Confirmation par email à l'inscription
- Téléversement multi-fichiers en une seule requête (MVP = un fichier à la fois)
- Aperçu / visualisation en ligne des fichiers

## Contexte Métier

- **Calendrier** : MVP en 4 semaines pour démo investisseur
- **Déploiement** : Docker Compose (démo locale)
- **Dépôt** : GitHub avec commits conventionnels, protection de branche sur `main`
