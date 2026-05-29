# Tests E2E Imaro — Playwright

Smoke tests Playwright sur les flows utilisateur critiques.

## Lancer

```bash
# Première fois : installer le browser Chromium
npm run e2e:install

# Lancer tous les tests
npm run e2e

# Mode interactif (recommandé pour débugger)
npm run e2e:ui

# Un seul fichier
npx playwright test tests/e2e/01-login-and-nav.spec.ts

# En mode headed (voir le navigateur)
npx playwright test --headed
```

## Couverture actuelle

| Fichier                          | Flow testé                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `01-login-and-nav.spec.ts`       | Login dev bypass · sidebar Sprint 4-8 · dashboard module cards · navigation vers /ia                          |
| `02-annexe-pdf-download.spec.ts` | Download Annexe 10 PDF · vérifie qu'on a un vrai PDF non vide (signature %PDF) · 3 requis + 9 complémentaires |
| `03-ia-audit.spec.ts`            | Lance l'audit IA · vérifie rapport scoré · switch entre les 3 outils IA                                       |
| `04-pointage-bancaire.spec.ts`   | Charge la démo Attijariwafa · 10 lignes, ≥5 auto-matchées · 10 banques supportées visibles                    |

## À ajouter (Sprint 9 idées)

- Création d'un occupant (CRUD)
- Configuration des pénalités (RecouvrementPage)
- Upload xlsx via ImportsPage (avec le wizard)
- Switch FR ↔ AR (RTL flip)
