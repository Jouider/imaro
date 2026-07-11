# imaro — DevOps Flow

---

## 1. Branches & Environnements

```
Feature branches              Staging (preprod)          Production
────────────────              ─────────────────          ──────────

feat/backend-budgets ──┐
feat/frontend-tickets ─┼──►  develop ─────────────────► main
fix/backend-tantieme ──┘         │                         │
                             Auto-deploy               Auto-deploy
                           staging.imaro.ma            imaro.ma
                         api-staging.imaro.ma         api.imaro.ma
```

| Branche        | Environnement  | URL                                          | Deploy            |
|----------------|----------------|----------------------------------------------|-------------------|
| `feat/*`, `fix/*` | Local       | localhost                                    | Manuel            |
| `develop`      | **Staging**    | staging.imaro.ma / api-staging.imaro.ma      | Auto sur push     |
| `main`         | **Production** | imaro.ma / api.imaro.ma                      | Auto sur merge PR |

---

## 2. Workflow quotidien

```
Abdellah (backend)                    Mouad (frontend)
──────────────────                    ────────────────

git checkout -b feat/backend-x        git checkout -b feat/frontend-y
  ... code ...                          ... code ...
git push origin feat/backend-x        git push origin feat/frontend-y
          │                                      │
          ▼                                      ▼
  PR → develop (review rapide)          PR → develop (review rapide)
          │                                      │
          ▼                                      ▼
  Auto-deploy staging                   Auto-deploy staging
          │                                      │
          ▼                                      ▼
  Test sur staging.imaro.ma            Test sur staging.imaro.ma
          │                                      │
          └──────────────────┬───────────────────┘
                             │
              Quand staging est stable (fin de sprint)
                  PR develop → main (les 2 approuvent)
                             │
                             ▼
                    Auto-deploy production
```

---

## 3. Regles

- **Jamais** de push direct sur `main` ou `develop`
- Toute modification passe par une PR
- `develop` → merge rapide (1 approval)
- `main` → merge serieux (2 approvals, tests staging OK)
- Hotfix urgent : `fix/hotfix-x` → PR directe vers `main` + cherry-pick vers `develop`

---

## 4. Naming des branches & commits

**Branches**
```
feat/backend-whatsapp          nouvelle fonctionnalite backend
feat/frontend-dashboard        nouvelle fonctionnalite frontend
fix/backend-tantieme-calc      correction bug backend
fix/frontend-login-screen      correction bug frontend
fix/hotfix-paiement-crash      hotfix urgent production
```

**Commits (Conventional Commits)**
```
feat(auth): add resident first-login activation flow
fix(dashboard): show all residences for manager role
docs(api): update contract with sprint 2 endpoints
refactor(lots): extract tantieme validation to service
chore: sync develop with main
```

---

## 5. CI/CD — GitHub Actions (4 workflows)

| Workflow                       | Declencheur                      | Action                                    |
|--------------------------------|----------------------------------|-------------------------------------------|
| `deploy-backend.yml`           | push `main` · `backend/**`       | pull + composer + migrate + cache + horizon |
| `deploy-frontend.yml`          | push `main` · `frontend/**`      | pull + npm ci + build prod                |
| `deploy-staging-backend.yml`   | push `develop` · `backend/**`    | pull + composer + migrate + cache + horizon-staging |
| `deploy-staging-frontend.yml`  | push `develop` · `frontend/**`   | pull + npm ci + build staging             |

**Ce que fait chaque deploy backend :**
```bash
git pull origin <branch>
sed -i '/TelescopeServiceProvider/d' bootstrap/providers.php
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache && php artisan route:cache && php artisan view:cache
supervisorctl restart horizon
```

---

## 6. Infrastructure VPS

```
Serveur  : Hostinger KVM2 — Ubuntu 24.04 LTS
IP       : 72.62.20.248
SSH      : port 2222 (user: abdellah)
Stack    : PHP 8.4 · Nginx 1.24 · MySQL 8 · Redis 7 · Node 22 · Supervisor
SSL      : Let's Encrypt — expire 2026-08-15 (auto-renouvellement)

/var/www/imaro/          ← Production  (branch: main)
/var/www/imaro-staging/  ← Staging     (branch: develop)
```

---

## 7. Zones de responsabilite

| Zone                    | Responsable | Interdit                          |
|-------------------------|-------------|-----------------------------------|
| `backend/`              | Abdellah    | toucher `frontend/`               |
| `frontend/`             | Mouad       | toucher `backend/`                |
| `docs/api.md`           | Abdellah    | mettre a jour AVANT de coder      |
| `.github/workflows/`    | Abdellah    | —                                 |

> Bug trouve dans la zone de l'autre → ouvrir une **GitHub Issue**, pas toucher le code.

---

*Last updated: 2026-05-18*
