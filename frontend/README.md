# SyndikPro — Frontend

Application web SyndikPro (gestion de copropriété, Maroc).
Mouad zone : tout ce qui est dans `frontend/`. Ne pas toucher à `backend/`.

## Stack

- **React 19** + **Vite 8** + **TypeScript 6**
- **Tailwind CSS v4** + **shadcn/ui** (style `new-york`, base `neutral`)
- **React Router** v7 (API compatible v6)
- **Zustand** (auth/session) + **persist** middleware
- **Axios** (`src/api/client.ts`) avec interceptor Bearer Sanctum
- **TanStack Query** (server state, devtools)
- **i18next** + `react-i18next` — FR (par défaut) / AR (RTL automatique)
- **Sonner** pour les toasts
- **lucide-react** pour les icônes
- **ESLint** + **Prettier** + **Storybook 10** (avec Vitest browser via Playwright)

## Setup local

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev      # http://localhost:5173
```

Backend Laravel attendu sur `http://localhost:8000/api` (cf. `VITE_API_URL`).

### Multi-tenant en local (nip.io)

Le backend résout le tenant depuis le sous-domaine (`blanca.syndikpro.ma`).
Pour tester en local sans `/etc/hosts` :

```
Backend : http://blanca.127.0.0.1.nip.io:8000
Frontend : http://blanca.127.0.0.1.nip.io:5173
```

Le `host: true` dans `vite.config.ts` permet à Vite d'écouter sur n'importe quel hostname.

## Scripts

| Script                                    | Action                              |
| ----------------------------------------- | ----------------------------------- |
| `npm run dev`                             | Vite dev server (port 5173)         |
| `npm run build`                           | Typecheck + build prod dans `dist/` |
| `npm run preview`                         | Sert le build prod                  |
| `npm run typecheck`                       | `tsc -b --noEmit`                   |
| `npm run lint`                            | ESLint                              |
| `npm run format` / `npm run format:check` | Prettier                            |
| `npm run storybook`                       | Storybook sur port 6006             |
| `npm run build-storybook`                 | Build statique Storybook            |

## Arborescence

```
src/
├── api/            # client axios + types ApiEnvelope
├── components/     # composants partagés
│   └── ui/         # shadcn/ui (généré, NE PAS éditer à la main)
├── features/       # logique par domaine (auth, residences, ...)
│   └── auth/api.ts # appels POST /auth/request-otp, verify-otp, me, logout
├── hooks/          # hooks React partagés
├── lib/            # utils (cn, env, i18n)
├── locales/{fr,ar}/common.json
├── pages/          # pages routées
├── providers/      # QueryProvider, etc.
├── routes/         # createBrowserRouter
├── store/          # Zustand (auth)
└── types/          # types partagés
```

## Conventions

- **Tout texte UI passe par i18next** dès le départ. Pas de chaîne en dur.
- **Devise toujours MAD/DH**, jamais € ou $.
- **Composants `ui/` viennent de shadcn** : `npx shadcn@latest add <component>`. Ne pas les modifier à la main — surcharger via wrapper si besoin.
- Imports absolus via alias `@/...`.
- Conventional Commits, branches `feat/frontend-*` ou `fix/frontend-*` cuttées de `develop` (cf. README racine).

## Contrat API

Cf. [`../docs/api.md`](../docs/api.md). Toutes les réponses suivent l'enveloppe :

```json
{ "status": "success" | "error", "message": "...", "data": { ... } }
```

L'auth se fait par OTP WhatsApp → token Sanctum stocké en `localStorage` (`syndikpro.token`) et injecté automatiquement par l'interceptor axios.
