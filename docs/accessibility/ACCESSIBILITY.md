# Accessibilité — DataShare

## Vue d'ensemble

Ce document décrit la démarche d'accessibilité de DataShare : ce qui est couvert, la méthode utilisée pour le vérifier, et les limites connues. Ce n'est pas un audit RGAA/WCAG complet — c'est un point de départ documenté, à faire évoluer.

**Date :** 2026-07-08
**Portée couverte :** zone de dépôt de fichier, boutons d'action sans libellé visible, messages d'erreur/statut, responsive tablette
**Non couvert :** audit complet WCAG 2.1, contraste des couleurs, navigation au clavier de bout en bout sur toutes les pages, tests avec lecteur d'écran réel (VoiceOver/NVDA)

---

## 1. Ce qui a été corrigé

| Élément | Problème | Correctif |
|---------|----------|-----------|
| Zone de dépôt de fichier (`UploadPage.tsx`) | `<div onClick>` sans rôle ni accès clavier — invisible pour un lecteur d'écran, inutilisable sans souris | `role="button"`, `tabIndex={0}`, `aria-label`, gestion de `Enter`/`Espace` au clavier (`onKeyDown`) |
| Bouton menu hamburger et bouton fermer (`DashboardPage.tsx`) | Icônes seules (☰, ✕) sans texte ni libellé | `aria-label="Ouvrir le menu"` / `"Fermer le menu"` |
| Boutons Supprimer / Générer un lien (`DashboardPage.tsx`) | Texte visible mais identique sur chaque ligne (« Supprimer », « Accéder ») — un lecteur d'écran naviguant par liste de boutons ne peut pas distinguer à quel fichier chaque bouton se rapporte | `aria-label` contextuel incluant le nom du fichier (ex. « Supprimer rapport.pdf ») |
| Icône cadenas 🔒 (fichier protégé) | Émoji seul, annonce non garantie par les lecteurs d'écran | `role="img"` + `aria-label="Protégé par un mot de passe"` |
| Messages d'erreur (Login/Register/Upload/Download) | `<div>` simple — un changement de contenu n'est pas annoncé automatiquement | `role="alert"` |
| Messages de statut (chargement, lien copié, vérification du lien) | Idem | `role="status"` |
| Responsive limité à un seul point de rupture (430px, mobile) | Aucune adaptation entre desktop et mobile — pages Login/Register/Upload/Download avec une carte de largeur fixe quel que soit l'écran | Point de rupture tablette ajouté (768px, hook partagé `useIsMobile`) réduisant le padding et l'espacement de la page sur les résolutions intermédiaires |

## 2. Méthode de vérification

- Vérification automatisée par script Playwright : présence du `role`, du `tabindex`, focus clavier réel (`element === document.activeElement`), recherche des boutons par leur nom accessible (`getByRole('button', {name: ...})`)
- Vérification visuelle par capture d'écran à trois largeurs (1280px desktop, 700px tablette, 375px mobile) sur Login, Upload et Dashboard
- Suite E2E Playwright existante (21 tests, US01-US10) rejouée intégralement pour confirmer l'absence de régression fonctionnelle

Aucun outil d'audit automatisé (axe-core, Lighthouse) n'est pour l'instant intégré au pipeline — c'est la limite la plus importante de cette démarche.

## 3. Constat non corrigé dans ce lot : découverte du système CSS inutilisé

En préparant le correctif responsive, un problème plus large a été identifié : `frontend/src/styles/index.css` contient un système de composants complet (`.card`, `.btn`, `.form-input`, `.file-row`, `.upload-zone`, etc.) avec ses propres règles responsive — mais **aucun composant React de l'application ne l'utilise** (`grep -rn "className=" frontend/src` ne retourne aucun résultat). Toutes les pages stylent leurs éléments en inline. Le correctif de cet axe a délibérément conservé cette architecture inline (ajout de points de rupture via un hook JS, à l'image de ce que faisait déjà `DashboardPage`) plutôt que de migrer l'ensemble des pages vers les classes existantes, pour limiter le risque de régression visuelle sur un rendu jugé "pixel-perfect" par ailleurs. Ce fichier CSS reste donc en grande partie du code mort — un futur chantier pourrait consister soit à brancher les pages sur ces classes, soit à supprimer les règles inutilisées.

## 4. Prochaines étapes suggérées

- Intégrer un audit automatisé (`@axe-core/playwright`) dans la suite E2E pour détecter les régressions d'accessibilité en continu
- Vérifier les contrastes de couleur (notamment le texte `#999` sur fond blanc, utilisé pour les états vides/chargement)
- Décider du sort du système CSS non utilisé (voir section 3)
- Tester la navigation complète au clavier (Tab) sur toutes les pages, pas seulement la zone d'upload
