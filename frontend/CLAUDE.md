# SyndikPro — CLAUDE.md (Mouad · Frontend)

## My role

I am Mouad. I own everything inside `frontend/`.
I NEVER touch `backend/`. If I find a backend bug I open a GitHub Issue against `Jouider/syndikpro`.
The source of truth for what I can call is `docs/api.md` (owned by Abdellah).

## Project

SaaS B2B multi-tenant — condo management for Morocco (Loi 18-00).
Stack: React 19 · Vite 8 · TypeScript 6 · Tailwind v4 · shadcn/ui.

## Repo zones

```
syndikpro/
├── backend/         ← Abdellah's zone — NEVER TOUCH
├── frontend/        ← MY ZONE
├── docs/api.md      ← API contract Abdellah writes, I consume
├── docker-compose.yml
└── README.md
```

## My stack

- React 19 + Vite 8 + TypeScript 6 (path alias `@/*` → `src/*`)
- Tailwind CSS v4 (`@tailwindcss/vite`) + **shadcn/ui** (style: `new-york`, base: `neutral`)
- React Router 7 (`createBrowserRouter` — v6-compatible APIs)
- TanStack Query 5 (server state) + Axios (transport)
- Zustand 5 with `persist` middleware (auth/session)
- i18next + react-i18next (FR primary, AR with auto RTL on `<html dir>`)
- Sonner (toasts), lucide-react (icons)
- ESLint flat + Prettier + Storybook 10

## Folder structure inside frontend/

```
src/
├── api/
│   └── client.ts          ← axios instance, ApiEnvelope<T>, token storage
├── components/
│   ├── ui/                ← shadcn/ui (generated, DO NOT hand-edit)
│   └── LanguageSwitcher.tsx
├── features/              ← one folder per domain
│   ├── auth/api.ts
│   ├── residences/        ← (to come)
│   ├── lots/              ← (to come)
│   ├── coproprietaires/   ← (to come)
│   ├── appels-fonds/      ← (to come)
│   ├── paiements/         ← (to come)
│   └── tickets/           ← (to come)
├── hooks/
├── lib/
│   ├── env.ts             ← reads VITE_* env vars
│   ├── i18n.ts            ← i18next init + dir/lang sync
│   └── utils.ts           ← cn() from shadcn
├── locales/
│   ├── fr/common.json     ← FR keys (primary)
│   └── ar/common.json     ← AR keys (RTL)
├── pages/                 ← route-level pages
├── providers/             ← React context providers (QueryProvider, ...)
├── routes/router.tsx      ← createBrowserRouter
├── store/auth.ts          ← Zustand auth/session store (persisted)
└── types/                 ← shared types
```

## API contract I follow

- Base URL from `VITE_API_URL` (default `http://localhost:8000/api`).
- All responses: `{ status: 'success' | 'error', message?, data, errors? }` — typed `ApiEnvelope<T>` in `@/api/client`.
- Auth: OTP WhatsApp → Sanctum token, stored in `localStorage` under `syndikpro.token`, auto-injected by axios interceptor as `Authorization: Bearer …`.
- 401 → axios interceptor clears token + redirects to `/login`.

## Multi-tenant in local dev

Backend resolves tenant from subdomain (`blanca.syndikpro.ma`).
Local convention: **nip.io**, no `/etc/hosts` edits.

```
Frontend: http://blanca.127.0.0.1.nip.io:5173
Backend : http://blanca.127.0.0.1.nip.io:8000
```

`vite.config.ts` already sets `server.host = true` so Vite accepts any hostname.

## Business rules I must respect on screen

- **Currency:** MAD/DH only — never € or $.
- **Tantièmes:** sum per résidence must equal exactly 1000.
- **Loi 18-00** must be referenced on documents/PDFs that come from the API.
- **Languages:** FR (default), AR (RTL). Every UI string goes through `t()` — no hardcoded copy.
- **WhatsApp priority:** OTP comes via WhatsApp (Twilio); SMS fallback is backend's concern, not mine.

## Conventions I follow

- **No hardcoded UI text.** Always add to both `locales/fr/common.json` and `locales/ar/common.json` before rendering. If I render English/French/Arabic literally in a component, that's a bug to fix before declaring done.
- **shadcn primitives** come from `npx shadcn@latest add <name>` — I never edit `src/components/ui/**` by hand. To customize, wrap.
- **Server state goes through TanStack Query**, never directly into Zustand.
- **Forms** use the shadcn primitives (`Input`, `Label`, `Button`). I don't bring in a form library until a real form needs one.
- **Imports use the `@/` alias.**
- **Conventional Commits** (`feat(frontend): …`, `fix(frontend): …`, `chore(frontend): …`).
- **Branches** are cut from `develop`, named `feat/frontend-*` or `fix/frontend-*`, max 2 days, then PR to `develop`.
- **Never push to `main` or `develop` directly.** Never commit `node_modules`, `.env.local`, or `dist`.

## Commands

```bash
# from frontend/
npm run dev               # Vite dev server (http://localhost:5173)
npm run build             # tsc -b && vite build
npm run typecheck         # tsc -b --noEmit
npm run lint              # eslint .
npm run format            # prettier --write .
npm run format:check      # prettier --check .
npm run storybook         # Storybook on :6006
npm run build-storybook   # static Storybook in storybook-static/

# from repo root
docker-compose up -d      # spin up MySQL + Redis for the backend
```

## Definition of done (every feature)

A feature is NOT done until all of these pass:

1. `npm run typecheck` clean
2. `npm run lint` clean
3. `npm run format:check` clean (or run `npm run format` then re-check)
4. `npm run build` succeeds
5. Verified in the browser preview (`mcp__Claude_Preview__preview_start`/`screenshot`/`snapshot`) — at minimum: page loads, no console errors, both FR and AR render correctly if any new strings were added.
6. **Manual test steps written for Mouad** in the response — not just "it works", but a numbered list of clicks/URLs/expectations.
7. New env vars added to `frontend/.env.example`.
8. New API calls match `docs/api.md` exactly; if the contract is missing or ambiguous, file a GitHub Issue against `Jouider/syndikpro` instead of guessing.

## Git rules

- Branch off `develop`, never `main`.
- Naming: `feat/frontend-auth-login`, `fix/frontend-tantieme-display`, etc.
- Commit format: `feat(frontend): add residences list page`.
- Daily rebase: `git fetch origin && git rebase origin/develop`.
- PR target: `develop`. Never push to `main` or `develop`.

## What I do NOT touch

- `backend/**` (Abdellah's zone)
- `docker-compose.yml` (shared, coordinate with Abdellah)
- `docs/api.md` (Abdellah writes it; I read it)
- `README.md` at repo root (shared)
- `src/components/ui/**` (shadcn-generated)

## Performance rules

- Always pass query keys + `staleTime` to TanStack Query; default `staleTime: 30s` is set in `QueryProvider`.
- Lazy-load route-level pages once we have >5 (`React.lazy` + Suspense boundary).
- Images go in `public/` with explicit width/height to avoid CLS.
- Bundle alerts at >800 kB ungzipped — split with `import()`.
