# Imaro — CLAUDE.md (Mouad · Frontend)

## My role

I am Mouad. I own everything inside `frontend/`. I NEVER touch `backend/`.
If I find a backend bug I open a GitHub Issue and tag Abdellah.
Every morning I read `docs/api.md` (contract) and the relevant module of `docs/imaro-specs.md` (cahier des charges) before writing any component that needs data.

## Project

**Imaro** — SaaS B2B multi-tenant de gestion de copropriété pour le marché marocain.
Concurrent direct analysé : **SyndicConnect** (`app.syndicconnect.ma`). Notre angle d'attaque : meilleure UX, vraie sécurité, finance analytique, app mobile copropriétaire, conformité Loi 18-00, **100 % français**.

Deux interfaces :

- **Admin desktop** — Super Admin, Syndic Owner, Manager, Conseil syndical (sidebar gauche).
- **Portail résident** — copropriétaire (mobile-first, bottom nav 4 onglets max).

> Note repo : le dépôt git est encore nommé `syndikpro` (`Jouider/syndikpro`). On ne renomme pas le remote tant que la décision n'est pas prise avec Abdellah. Le produit s'appelle Imaro dans tout l'UI et les configs.

## Mono-repo structure

```
syndikpro/                  ← repo name (legacy, may be renamed later)
├── backend/                ← Abdellah's zone — NEVER TOUCH
├── frontend/               ← MY ZONE (the Imaro web app)
├── docs/
│   ├── api.md              ← API contract (Abdellah writes, I consume)
│   └── imaro-specs.md      ← cahier des charges complet (16 modules)
└── README.md
```

## My stack (actual installed versions)

- **React 19** + **TypeScript 6** + **Vite 8** (path alias `@/*` → `src/*`)
- **Tailwind CSS v4** (`@tailwindcss/vite`) + **shadcn/ui** (style `new-york`)
- **React Router 7** (v6-compatible APIs via `createBrowserRouter`)
- **TanStack Query 5** — toute la donnée passe ici, jamais d'axios brut dans un composant
- **Axios** — instance unique dans `src/api/client.ts` (à renommer `src/lib/axios.ts` à terme)
- **Zustand 5** (avec `persist`) — auth, token, role, tenant
- **i18next** + `react-i18next` — FR primaire, AR avec RTL automatique sur `<html dir>`
- **Sonner** (toasts), **lucide-react** (icônes)
- **ESLint flat** + **Prettier** + **Storybook 10**
- À installer dès le premier formulaire : **React Hook Form** + **Zod**

> Le `docs/imaro-specs.md` mentionne Next.js 14 dans la stack recommandée — c'est obsolète. On reste sur **Vite + React 18/19 SPA** : décidé le 2026-05-13 avec Mouad.

## Imaro design system (palette officielle, non-négociable)

Tokens définis dans `src/index.css` (Tailwind v4 `@theme`) :

```css
--color-imaro-primary: #1b4f72; /* Bleu marine professionnel — sidebar, headings, primary buttons */
--color-imaro-primary-light: #2980b9; /* Bleu action — focus rings, hover */
--color-imaro-accent: #e67e22; /* Orange CTA — boutons d'action principale, badges accent */
--color-imaro-success: #27ae60; /* Statut payé, validation */
--color-imaro-warning: #f39c12; /* Statut partiel, alertes */
--color-imaro-danger: #e74c3c; /* Statut impayé, erreur, suppression */
--color-imaro-text: #2c3e50;
--color-imaro-text-muted: #7f8c8d;
--color-imaro-surface: #f8f9fa; /* Background secondaire */
```

Les variables shadcn `--primary`, `--accent`, `--ring`, `--destructive` sont déjà remappées vers Imaro — donc `<Button>` est navy par défaut. Pour un CTA orange explicite : `className="bg-[var(--accent)] text-white"`.

- **Fonts** : `Nunito Sans` (body) + `DM Serif Display` (headings only). Chargées via Google Fonts dans `index.html`. **Jamais Inter, Roboto, Arial.**
- **Admin** : sidebar `bg-[var(--primary)]` (#1B4F72) + contenu blanc + accents orange.
- **Portail** : fond blanc + texte navy + CTA orange.
- **Montants** : toujours formatés `1 500,00 DH` (locale `fr-MA`, **DH** jamais MAD/€/$).
- **Wordmark** : composant `@/components/Wordmark` — "Ima" navy + "ro" orange en DM Serif Display. Utiliser tant qu'on n'a pas de logo Imaro officiel (les PNG `logo-*.png` dans `public/` sont des restes SyndikPro à remplacer).

## Folder structure inside frontend/ (cible, certaines parties à migrer)

```
src/
├── pages/
│   ├── superadmin/         ← (à venir)
│   ├── syndic-owner/       ← (à venir)
│   ├── manager/            ← gestionnaire d'immeuble
│   ├── conseil/            ← (à venir, lecture seule)
│   └── portail/            ← copropriétaire (mobile-first)
├── components/
│   ├── ui/                 ← shadcn — DO NOT hand-edit
│   ├── Wordmark.tsx
│   ├── LanguageSwitcher.tsx
│   └── shared/             ← (à construire) KpiCard, StatutBadge, DataTable, ...
├── layouts/                ← (à construire) AdminLayout, PortailLayout
├── lib/
│   ├── env.ts
│   ├── i18n.ts
│   └── utils.ts            ← cn(), formatMontant(), formatDate()
├── api/
│   └── client.ts           ← axios instance (sera renommé src/lib/axios.ts)
├── features/               ← (sera renommé src/services/, pattern service.ts)
│   └── auth/api.ts
├── store/                  ← (sera renommé src/stores/, pluriel)
│   └── auth.ts             ← Zustand persisted
├── locales/                ← (sera renommé src/i18n/, fichiers fr.json / ar.json plats)
│   ├── fr/common.json
│   └── ar/common.json
├── providers/
├── routes/                 ← (sera renommé src/router/)
│   └── router.tsx
└── types/
```

## Critical rules

```ts
// ALWAYS — instance axios unique, jamais d'URL en dur
import { api } from '@/api/client'
// baseURL = import.meta.env.VITE_API_URL

// ALWAYS — TanStack Query pour la donnée
const { data, isLoading, error } = useQuery({
  queryKey: ['appels-fonds', residenceId],
  queryFn: () => appelsFondsService.getAll(residenceId),
})

// ALWAYS — Zustand pour l'auth state
const { user, token, role } = useAuthStore()

// ALWAYS — Zod pour la validation de formulaire (dès le 1er form)
const schema = z.object({ montant: z.number().positive() })

// NEVER — pas de `any`
// NEVER — pas d'axios brut dans un composant (passer par services/)
// NEVER — pas de localStorage direct (passer par stores)
// NEVER — pas de style inline (Tailwind uniquement)
// NEVER — pas de chaîne UI codée en dur (i18next sur toutes les chaînes, FR + AR)
```

## Multi-tenant local (nip.io)

```
http://blanca.127.0.0.1.nip.io:5173   ← frontend (Vite host: true)
http://blanca.127.0.0.1.nip.io:8000   ← backend (SetTenant lit le sous-domaine)
```

## Rôles — état des lieux

⚠ **Conflit ouvert** entre le backend (déjà migré) et le `docs/imaro-specs.md` :

| backend (`RolesSeeder`) | spec `imaro-specs.md` §1.2 |
| ----------------------- | -------------------------- |
| `super_admin`           | `super_admin`              |
| `manager`               | `syndic_owner`             |
| `gestionnaire`          | `syndic_manager`           |
| `agent_recouvrement`    | —                          |
| `conseil`               | `conseil_syndical`         |
| `resident`              | `copropriétaire`           |

Tant que ce n'est pas tranché avec Abdellah, on utilise les noms **backend** dans le code (c'est ce que renvoie l'API) mais on affiche les libellés **spec** à l'utilisateur via i18n.

## API contract (résumé)

Base URL : `import.meta.env.VITE_API_URL` (défaut `http://localhost:8000/api`).
Auth : Bearer Sanctum token (`Authorization: Bearer …`) — stocké dans `localStorage` clé `imaro.token`, injecté par l'interceptor axios.
Enveloppe : `{ status: 'success' | 'error', message?, data, errors? }`.

Endpoints actuellement implémentés côté backend (cf. `docs/api.md`) :

```
POST /api/auth/request-otp     {phone}
POST /api/auth/verify-otp      {phone, otp} → {token, user, tenant}
GET  /api/auth/me
POST /api/auth/logout

GET  /api/gestionnaire/dashboard
GET  /api/gestionnaire/residences           (index/show/update)
GET  /api/gestionnaire/residences/:id/lots  (CRUD)
GET  /api/gestionnaire/coproprietaires      (index)
```

Tout le reste de `docs/imaro-specs.md` (budgets, dépenses, fournisseurs, contrats, réclamations, annonces, travaux, échéances, GED, appels de fonds, AG) n'est **pas encore** côté backend — je dois soit attendre Abdellah, soit utiliser le pattern de mock dans `services/`.

## Components shared à construire en premier (avant toute page complète)

Dans l'ordre, dès que la décision folder-structure est tranchée :

1. **MontantDisplay** — formate `1500` en `1 500,00 DH` (locale `fr-MA`).
2. **StatutBadge** — payé = success (vert), impayé = danger (rouge), partiel = warning (orange), retard = danger.
3. **KpiCard** — icône + valeur + label + variation vs période précédente (+ sparkline optionnel).
4. **LoadingSkeleton** — squelette pour cartes et tables (utilisé sur tout état `isLoading`).
5. **EmptyState** — icône + message + CTA, pour tables/listes vides.
6. **ConfirmModal** — confirmation avant toute suppression (avec récap).
7. **DataTable** — tri, filtre, pagination, sélection multiple, export CSV/PDF.
8. **PageHeader** — breadcrumb + titre + actions.

## Portail résident — règles mobile-first

- Tester systématiquement sur largeur **375 px** (iPhone SE).
- Police minimum **16 px** (évite le zoom iOS).
- Touch target minimum **48 px** sur tous les boutons / liens.
- Bottom nav : 4 onglets maximum (Accueil, Finances, Réclamations, Profil).
- **Pas de sidebar** sur le portail — bottom nav uniquement.
- État de chargement sur chaque action async.
- Feedback (toast succès/erreur) < 300 ms après l'action.

## Definition of Done (every feature)

Avant de dire "fini" :

1. `npm run typecheck` clean
2. `npm run lint` clean
3. `npm run format:check` clean (ou `npm run format` puis re-check)
4. `npm run build` succeeds
5. Vérifié dans le navigateur via Claude Preview MCP (`preview_start` → `preview_snapshot` → `preview_screenshot` → `preview_console_logs level: warn`) — page rend, **0 warning console**, FR et AR rendent si du texte a été ajouté.
6. **Étapes de test manuelles écrites pour Mouad** — pas "ça marche", des étapes numérotées avec URLs, clics, attentes.
7. Nouvelle variable d'env ajoutée à `frontend/.env.example`.
8. Tous les appels API matchent `docs/api.md` exactement ; si le contrat manque, GitHub Issue contre `Jouider/syndikpro` plutôt que de deviner.
9. Tous les statuts financiers (payé/impayé/partiel/retard) utilisent `StatutBadge` une fois construit.
10. Tous les montants utilisent `MontantDisplay` une fois construit.

## Stratégie de mock (avant que Abdellah ait l'endpoint)

Dans le fichier service, jamais dans le composant :

```ts
// services/appels-fonds.service.ts
export const appelsFondsService = {
  async getAll(residenceId: string) {
    // TODO: replace with real API call once available
    return MOCK_APPELS_FONDS
  },
}
```

Bascule = remplacer le `return MOCK_*` par un `api.get(...)`.

## Git rules

- Branche cuttée de `develop`, jamais de `main`.
- Naming : `feat/frontend-portail-login`, `fix/frontend-rtl-overflow`, etc.
- Conventional Commits : `feat(frontend): …`, `fix(frontend): …`, `chore(frontend): …`.
- Max 2 jours par branche, sinon découper.
- Rebase quotidien : `git fetch origin && git rebase origin/develop`.
- PR vers `develop`. **Jamais push direct sur `main` ou `develop`.**
- Screenshot obligatoire dans la description de PR pour toute modif UI.
- Tag Abdellah dans la PR dès qu'il faut un nouvel endpoint API.

## Ce que je NE touche pas

- `backend/**`
- `docker-compose.yml`, `docs/api.md`, `README.md` racine (partagés — coordination Abdellah)
- `src/components/ui/**` (généré par shadcn, on customise par wrapper)
- Le remote git `Jouider/syndikpro` (ne pas créer de remote `imaro/*` sans accord d'Abdellah)

## Commands

```bash
# from frontend/
npm run dev               # Vite (http://localhost:5173)
npm run build             # tsc -b && vite build
npm run typecheck         # tsc -b --noEmit
npm run lint
npm run format            # prettier --write .
npm run format:check
npm run storybook         # :6006
npm run build-storybook
```
