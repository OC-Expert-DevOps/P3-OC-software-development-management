# Active Context

## Current Focus
Frontend Figma redesign completed and merged (PR #52, Issue #51).

## Recent Changes (2026-06-28)

### feat: refonte frontend pixel-perfect Figma (PR #52)
- **Navbar.tsx**: Simplified — "DataShare" text logo + "Se connecter" / "Mon espace" / "Se déconnecter" buttons with outlined style
- **LoginPage.tsx**: Centered white card on gradient, "Connexion" title, email/password inputs, "Créer un compte" link, coral submit button
- **RegisterPage.tsx**: Same card layout, "Créer un compte" title, email/password inputs
- **DashboardPage.tsx**: Split layout — left side gradient with upload CTA ("Tu veux partager un fichier?" + cloud icon), right white panel with "Mes fichiers" title, switch tabs (Tous/Actifs/Expiré), file list with extension badges
- **UploadPage.tsx**: Drag-drop zone on gradient, file confirmation card with cancel/upload buttons
- **DownloadPage.tsx**: White card with "Télécharger un fichier" title, green callout for availability, file details, coral download button

### Design System (from Figma)
- **Gradient**: `linear-gradient(135deg, #D4785C, #E8A4A0, #F0C4B8)`
- **Primary color**: `#D4785C` (coral/salmon)
- **Font**: Inter (Google Fonts)
- **Cards**: White (`rgba(255,255,255,0.95)`), `border-radius: 16px`, shadow
- **Buttons**: Coral filled primary, outlined secondary (dark border)
- **Callouts**: Green (#E8F5E9/#2E7D32 success), Red (#FFEBEE/#C62828 error)
- **Switch tabs**: #F5F5F5 background, coral active state
- **Footer**: "Copyright DataShare® 2025"

## Next Steps
- Verify responsive behavior on iPhone (breakpoint 430px)
- Test all pages with Docker Compose running
- Consider adding CSS file for shared styles (currently inline)
- Update e2e tests if selectors changed
