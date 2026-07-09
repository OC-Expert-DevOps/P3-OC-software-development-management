# Accessibilité — DataShare

## Vue d'ensemble

Ce document décrit la démarche d'accessibilité de DataShare : ce qui est couvert, la méthode utilisée pour le vérifier, et les limites connues. Ce n'est pas un audit RGAA/WCAG complet — c'est un point de départ documenté, à faire évoluer.

**Date :** 2026-07-09 (mise à jour suite à un audit indépendant, voir section 1 bis)
**Portée couverte :** zone de dépôt de fichier, boutons d'action sans libellé visible, messages d'erreur/statut, responsive tablette, indicateur de focus clavier, association labels/champs, cibles tactiles
**Non couvert :** audit complet WCAG 2.1, contraste des couleurs, tests avec lecteur d'écran réel (VoiceOver/NVDA)

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

## 1 bis. Corrections issues d'un audit indépendant (2026-07-09)

Un audit adversarial (agent indépendant, Playwright, 6 largeurs de 320 à 1440px, navigation clavier complète, arbre d'accessibilité Chrome) a été mené après le lot initial ci-dessus. Il a trouvé des problèmes que la première passe n'avait pas couverts :

| Élément | Problème | Correctif |
|---------|----------|-----------|
| `Navbar.tsx` (Login/Register/Upload/Download) | Jamais rendue responsive (contrairement aux pages elles-mêmes) — chevauchement du logo et des boutons sous 768px | Point de rupture propre (430px, `useIsMobile`) : passe en `position: static`, empilement vertical logo/actions |
| Tous les `<input>`/`<select>` de formulaire | `outline: 'none'` en style inline, sans alternative — **aucun indicateur de focus visible au clavier** (WCAG 2.4.7) | Suppression de `outline: 'none'` : le contour par défaut du navigateur s'affiche à nouveau |
| `<select>` de durée d'expiration (`UploadPage.tsx`) | Aucun nom accessible (confirmé par l'arbre d'accessibilité) | `<label htmlFor>` associé via un `id` |
| Champs email/mot de passe (toutes pages) | `<label>` non associé (`for`/`id` manquants) — le nom accessible retombait sur le `placeholder`, parfois un texte d'instruction complet | `id`/`htmlFor` posés sur chaque paire label/champ |
| Indice de complexité du mot de passe (`RegisterPage.tsx`) | Visible seulement dans le `placeholder`, tronqué à l'affichage | Déplacé en texte visible sous le champ |
| Boutons ☰/✕ du menu (`DashboardPage.tsx`) | `aria-label` correct mais zone cliquable ~20×28px, sous le minimum recommandé (WCAG 2.5.8) | Zone cliquable portée à 44×44px |
| Liens "Créer un compte" / "Se connecter" (Login/Register) | Hauteur cliquable ~17px | Padding ajouté |
| Bouton "Accéder →" (`DashboardPage.tsx`) | `aria-label` sans aucun mot commun avec le texte visible (violation WCAG 2.5.3 Label in Name) | `aria-label` reformulé pour commencer par "Accéder" |
| Nom de fichier tronqué (`DashboardPage.tsx`) | Pas d'attribut `title` — nom complet illisible au survol souris | `title={originalName}` ajouté |
| Messages d'erreur de téléchargement (`DownloadPage.tsx`) | Le message brut du backend (anglais, parfois un nom de classe d'exception type `ThrottlerException: Too Many Requests`) était affiché tel quel dans une UI française | Traduction par code de statut HTTP, plus aucun message backend brut affiché |
| Copie du lien de partage (`DashboardPage.tsx`) | `navigator.clipboard.writeText()` sans gestion d'échec — le message "copié" s'affichait même en cas d'échec silencieux | Résultat réel de la copie reflété dans le message |
| Session expirée (`api/client.ts`) | Seul `accessToken` était retiré du `localStorage` à l'échec du rafraîchissement, pas `user` — la Navbar continuait d'afficher "connecté" après une expiration réelle | `user` également retiré avant la redirection vers `/login` |

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
- Tester avec un lecteur d'écran réel (VoiceOver/NVDA) — la navigation clavier (ordre de tabulation, focus visible, noms accessibles) a été vérifiée par l'arbre d'accessibilité Playwright, ce qui n'est pas équivalent à un test avec un lecteur d'écran réel
