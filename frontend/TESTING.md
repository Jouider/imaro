# Frontend — Testing Runbook

Manual + automated checks for the SyndikPro frontend.
**Run order:** automated gates first, then manual smoke in the browser.

---

## 1. Automated gates (must all pass)

From `frontend/`:

```bash
npm run typecheck     # TypeScript
npm run lint          # ESLint
npm run format:check  # Prettier
npm run build         # Vite production build
```

Every script must exit 0 with no warnings I introduced.

---

## 2. Manual smoke — Home + Login

Start the dev server:

```bash
cd frontend
npm run dev   # → http://localhost:5173
```

### Home (`/`)

1. Open http://localhost:5173 → page renders without console errors (DevTools → Console clean).
2. Header shows `SyndikPro` logo on the left and **Connexion** + language switcher on the right.
3. Three cards appear: **Résidences**, **Appels de fonds**, **Loi 18-00**.
4. Click the language switcher → label flips to **العربية** → the whole page re-renders in Arabic.
5. `<html>` element now has `dir="rtl"` and `lang="ar"` (check DevTools → Elements).
6. Click again → flips back to **Français** + `dir="ltr"`.

### Login (`/login`)

1. Click **Connexion** (top right). URL becomes `/login`.
2. Card title: **Connexion à SyndikPro**, subtitle **Recevez un code à 6 chiffres sur WhatsApp**.
3. Phone input is empty, **Recevoir le code** button is disabled.
4. Type `+212600000001` → button enables.
5. Click **Recevoir le code**:
   - **With backend running** (`cd backend && php artisan serve`): a toast appears and the form switches to the OTP step. The seeded user `Mohammed Fikri (+212600000001)` is what to test against (see `backend/database/seeders/DemoSeeder.php`).
   - **Without backend**: a red toast says `Erreur réseau` — expected; this proves the axios interceptor wiring.
6. Click `← Accueil` → goes back to `/`.

### Language persistence

1. Switch to AR on Home. Refresh the page → still AR.
2. Open DevTools → Application → Local Storage → `http://localhost:5173`:
   - `syndikpro.lang = ar`
   - `syndikpro.token` only appears after a successful OTP verify.

---

## 3. Storybook

```bash
npm run storybook   # → http://localhost:6006
```

1. Sidebar shows **UI → Button** with stories: Default, Secondary, Outline, Destructive, Ghost, Small, Large.
2. Each variant renders without runtime errors.
3. Controls panel lets me change `variant` and `size` live.

---

## 4. Multi-tenant local dev (when ready)

Use nip.io to mimic `{subdomain}.syndikpro.ma` without `/etc/hosts`:

```
http://blanca.127.0.0.1.nip.io:5173   # frontend
http://blanca.127.0.0.1.nip.io:8000   # backend
```

The backend's `SetTenant` middleware reads the subdomain. Test plan once a protected page exists:

1. Hit the URL with subdomain `blanca` → backend returns tenant data.
2. Hit `unknown.127.0.0.1.nip.io:5173` → backend returns a 404 or tenant-not-found error.

---

## 5. Definition of done for any feature

Before saying "feature X is done":

1. ☐ `npm run typecheck` passes
2. ☐ `npm run lint` passes
3. ☐ `npm run format:check` passes
4. ☐ `npm run build` succeeds
5. ☐ Browser preview verified — screenshots in both FR and AR if new copy was added
6. ☐ `Console` tab is clean (no warnings/errors)
7. ☐ Manual test steps written here or in the chat reply
8. ☐ New env vars added to `frontend/.env.example`
9. ☐ Commit on a `feat/frontend-*` branch with a Conventional Commit message
