# Imaro — CLAUDE.md (Mouad · Frontend)

## My role

I am Mouad. I own everything inside `frontend/`. I NEVER touch `backend/`.
If I find a backend bug I open a GitHub Issue and tag Abdellah.
Every morning I read `docs/api.md` (contract) and the relevant module of `docs/imaro-specs.md` (cahier des charges) before writing any component that needs data.

## Project

**Imaro** — SaaS B2B multi-tenant de gestion de copropriété pour le marché marocain.  
Concurrent direct analysé : **SyndicConnect** (`app.syndicconnect.ma`).  
Repo GitHub : `git@github.com:Jouider/imaro.git` (renommé depuis `Jouider/syndikpro` le 2026-05-14).

Deux interfaces :

- **Admin desktop** — Super Admin, Syndic Owner, Manager, Conseil syndical (sidebar gauche).
- **Portail résident** — copropriétaire (mobile-first, bottom nav 4 onglets max).

## Mono-repo structure

```
imaro/                      ← repo (local path encore /Users/mouadsmac/Code/syndikpro)
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
- **Axios** — instance unique dans `src/lib/axios.ts`
- **Zustand 5** (avec `persist`) — auth, token, role, tenant → `src/stores/authStore.ts`
- **i18next** + `react-i18next` — FR primaire, AR avec RTL automatique sur `<html dir>`
- **Sonner** (toasts), **lucide-react** (icônes)
- **ESLint flat** + **Prettier** + **Storybook 10**

## Imaro design system (palette officielle, non-négociable)

Tokens définis dans `src/index.css` (Tailwind v4 `@theme`) :

```css
--color-imaro-primary: #1b4f72;      /* sidebar, headings, primary buttons */
--color-imaro-primary-light: #2980b9; /* focus rings, hover */
--color-imaro-accent: #e67e22;        /* CTA orange */
--color-imaro-success: #27ae60;
--color-imaro-warning: #f39c12;
--color-imaro-danger: #e74c3c;
--color-imaro-text: #2c3e50;
--color-imaro-text-muted: #7f8c8d;
--color-imaro-surface: #f8f9fa;
```

shadcn `--primary`, `--accent`, `--ring`, `--destructive` sont remappés → `<Button>` est navy par défaut.  
CTA orange explicite : `className="bg-[var(--accent)] text-white hover:bg-[var(--color-imaro-accent-dark)]"`.

- **Fonts** : `Nunito Sans` (body) + `DM Serif Display` (headings). **Jamais Inter, Roboto, Arial.**
- **Montants** : toujours `1 500,00 DH` (locale `fr-MA`, **DH** jamais MAD/€/$) → `<MontantDisplay value={1500} />`.

### Wordmark / Logo

Composant `@/components/Wordmark` — PNG officiel, 4 variantes :

```tsx
// Nav header (light bg) — object-cover crop, passer width + height
<Wordmark className="h-14 w-52" />

// Login/portail card centré
<Wordmark variant="stacked" className="h-36 w-auto mx-auto" />

// Sidebar navy (inverted white version)
<Wordmark inverted className="h-14 w-52" />
```

Les PNG sources sont 2000×2000 avec whitespace — `horizontal` utilise `object-cover` dans un `overflow-hidden`, `stacked` utilise `object-contain`. Toujours passer les deux (`w-` + `h-`) pour le variant horizontal.

## Folder structure (état actuel ✅)

```
src/
├── pages/
│   ├── portail/            ← copropriétaire (mobile-first)
│   │   ├── PortailLoginPage.tsx
│   │   └── PortailDashboardPage.tsx
│   ├── manager/            ← (à venir)
│   └── …
├── components/
│   ├── ui/                 ← shadcn — DO NOT hand-edit
│   ├── shared/             ← ✅ MontantDisplay, StatutBadge, KpiCard, LoadingSkeleton,
│   │                              EmptyState, ConfirmModal, DataTable, PageHeader
│   ├── Wordmark.tsx        ← logo PNG officiel
│   └── LanguageSwitcher.tsx
├── router/
│   ├── index.tsx           ← createBrowserRouter (toutes les routes)
│   └── PortailGuard.tsx    ← protège /portail/* (rôle resident + token)
├── lib/
│   ├── axios.ts            ← instance axios unique (api, getStoredToken, setStoredToken)
│   ├── env.ts
│   └── utils.ts
├── stores/
│   └── authStore.ts        ← Zustand persist (imaro.auth)
├── services/
│   └── auth.service.ts     ← requestOtp, verifyOtp, me, logout
├── i18n/
│   ├── index.ts            ← i18next init + applyDirection()
│   ├── fr.json             ← FR (source de vérité)
│   └── ar.json             ← AR
└── providers/
    └── QueryProvider.tsx
```

## Critical rules

```ts
// ALWAYS — import depuis les nouveaux chemins
import { api } from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import { requestOtp } from '@/services/auth.service'

// ALWAYS — TanStack Query pour toute donnée serveur
const { data, isLoading } = useQuery({
  queryKey: ['residences'],
  queryFn: () => residencesService.getAll(),
})

// ALWAYS — composants shared pour finances et statuts
<MontantDisplay value={1500} />          // → "1 500,00 DH"
<StatutBadge statut="paye" />            // → badge vert "Payé"
<ConfirmModal ... />                      // avant toute suppression

// ALWAYS — LoadingSkeleton sur tout isLoading (jamais de spinner brut)
if (isLoading) return <LoadingSkeleton variant="table" />

// NEVER — pas de `any`
// NEVER — pas d'axios brut dans un composant
// NEVER — pas de localStorage direct (passer par stores)
// NEVER — pas de style inline (Tailwind uniquement)
// NEVER — pas de chaîne UI en dur (i18next, FR + AR)
// NEVER — toucher src/components/ui/** (généré shadcn)
```

## Portail résident — règles mobile-first

- Tester systématiquement sur **375 px** (iPhone SE).
- Police minimum **16 px** (évite le zoom iOS).
- Touch target minimum **48 px** sur tous les boutons / liens.
- Bottom nav : 4 onglets max (Accueil, Finances, Réclamations, Profil) — pas de sidebar.
- État de chargement sur chaque action async (`isLoading`).
- Feedback (toast) < 300 ms après l'action.
- OTP cooldown : 60 secondes avant "Renvoyer" (`useCooldown` hook dans `PortailLoginPage`).
- `PortailGuard` protège `/portail` — redirige vers `/portail/login` si pas de token ou rôle ≠ `resident`.

## Rôles — état des lieux

⚠ **Conflit ouvert** backend vs spec :

| backend (`RolesSeeder`) | spec `imaro-specs.md` §1.2 |
| ----------------------- | -------------------------- |
| `super_admin`           | `super_admin`              |
| `manager`               | `syndic_owner`             |
| `gestionnaire`          | `syndic_manager`           |
| `agent_recouvrement`    | —                          |
| `conseil`               | `conseil_syndical`         |
| `resident`              | `copropriétaire`           |

On utilise les noms **backend** dans le code, libellés **spec** via i18n.

## API contract (résumé)

Base URL : `import.meta.env.VITE_API_URL` (défaut `http://localhost:8000/api`).  
Auth : Bearer Sanctum token → `imaro.token` → interceptor axios.  
Enveloppe : `{ status: 'success' | 'error', message?, data, errors? }`.

```
POST /api/auth/request-otp     {phone}
POST /api/auth/verify-otp      {phone, otp} → {token, user, tenant}
GET  /api/auth/me
POST /api/auth/logout

GET  /api/gestionnaire/dashboard
GET  /api/gestionnaire/residences
GET  /api/gestionnaire/residences/:id/lots
GET  /api/gestionnaire/coproprietaires
```

Si l'endpoint n'existe pas → ouvrir un GitHub Issue contre `Jouider/imaro` (tag Abdellah), ne pas deviner.

## Mock strategy (avant que Abdellah ait l'endpoint)

```ts
// src/services/appels-fonds.service.ts
export const appelsFondsService = {
  async getAll(residenceId: string) {
    // TODO: replace once GET /api/gestionnaire/appels-fonds is available
    return MOCK_APPELS_FONDS
  },
}
// Bascule = remplacer return MOCK_* par api.get(...)
```

## Definition of Done (every feature)

1. `npm run typecheck` — 0 erreur
2. `npm run lint` — 0 erreur
3. `npm run format:check` — clean (ou `npm run format` puis re-check)
4. `npm run build` — succeeds
5. Browser via Preview MCP : page rend, **0 warning console**, FR + AR si du texte ajouté
6. **Étapes de test manuelles écrites** — numérotées, URLs, clics, attentes
7. Nouvelle variable `.env` → `frontend/.env.example`
8. Tous les appels API matchent `docs/api.md` exactement
9. Tous les statuts → `<StatutBadge>`, tous les montants → `<MontantDisplay>`

## Multi-tenant local (nip.io)

```
http://blanca.127.0.0.1.nip.io:5173   ← frontend (Vite host: true)
http://blanca.127.0.0.1.nip.io:8000   ← backend
```

## Git rules

- Branche depuis `develop` uniquement, jamais de `main`.
- Naming : `feat/frontend-portail-finances`, `fix/frontend-rtl-overflow`.
- Conventional Commits : `feat(frontend): …`, `fix(frontend): …`, `chore(frontend): …`.
- Max 2 jours par branche, sinon découper.
- Rebase quotidien : `git fetch origin && git rebase origin/develop`.
- PR vers `develop`. **Jamais push direct sur `main` ou `develop`.**
- Screenshot obligatoire dans la PR pour toute modif UI.
- Tag Abdellah si nouvel endpoint API requis.

## Commands

```bash
# from frontend/
npm run dev           # Vite → http://localhost:5173
npm run build         # tsc -b && vite build
npm run typecheck     # tsc -b --noEmit
npm run lint
npm run format        # prettier --write .
npm run format:check
npm run storybook     # :6006
```
