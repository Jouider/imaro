# imaro — CLAUDE.md (Abdellah · Backend)

## My role
I am Abdellah. I own everything inside `backend/` plus root config files.
I NEVER touch `frontend/`. If I find a frontend bug I open a GitHub Issue.
My first output every morning: update `docs/api.md` before writing any code.

## Project
imaro — SaaS B2B multi-tenant — condo management for Morocco (by Digitoyou).
Competitor: SyndicConnect (app.syndicconnect.ma) — we surpass on UX, security, features.
Stack: Laravel 11 · MySQL 8 · Redis · PHP 8.4

## Mono-repo structure
```
imaro/              ← root (I manage this)
├── backend/        ← MY ZONE
├── frontend/       ← Mouad's zone — NEVER TOUCH
├── docs/api.md     ← API contract I write first
├── docker-compose.yml
├── CLAUDE.md
└── .gitignore
```

## My stack
- PHP 8.4 + Laravel 11 (le VPS tourne en 8.4 ; composer.lock exige >= 8.4)
- MySQL 8 (main DB) + Redis (cache + queues)
- Laravel Sanctum (token auth)
- Laravel Horizon (queue dashboard)
- Spatie/laravel-permission (roles)
- Spatie/laravel-multitenancy (tenant isolation)
- barryvdh/laravel-dompdf (PDF generation)
- Laravel Telescope (debug, dev only)
- Pest PHP (tests)
- Twilio BSP (WhatsApp Business API)
- Brevo (transactional email)

## Multi-tenant architecture
Every client = 1 tenant (= 1 cabinet syndic) with isolated data.
ALL tables have `tenant_id`. SetTenant middleware auto-injects tenant on every request.
Tenant resolved from subdomain: `blanca.imaro.ma` → tenant with subdomain=blanca.

## Roles (5 levels)
```
super_admin       → imaro team (Abdellah/Mouad — Digitoyou)
manager           → Cabinet syndic owner (ex: Fikri, "Gest Syndic SARL")
gestionnaire      → Employee managing N résidences
conseil           → Elected copropriétaire (read + complaints only)
resident          → End copropriétaire (own lot data only, via mobile app)
```
> Vocabulary note: "résidence" in our code = "copropriété" in the industry.
> "coproprietaire" in our code = "propriétaire" in SyndicConnect. We keep our naming.

## Core business concept: Exercice (CRITICAL — missing from sprint 1)
Every résidence runs on annual exercises.
All financial data (appels_fonds, paiements, depenses, budgets) belongs to an exercice.
```
Tenant (cabinet syndic)
  └── Résidence (ex: Résidence Atlas, 20 lots)
        ├── Exercice 2024 (statut: cloture)
        ├── Exercice 2025 (statut: cloture)
        └── Exercice 2026 (statut: actif) ← all operations here
              ├── Appels de fonds
              ├── Paiements
              ├── Dépenses
              └── Budget
```

## DB tables (dependency order for migrations)
```
tenants
→ users
→ residences                  (copropriété in industry vocab)
→ exercices                   ← NEW sprint 2 — annual fiscal year
→ lots
→ coproprietaires             (propriétaire in industry vocab)
→ historique_coproprietaires  ← NEW sprint 2
→ prestataires                (fournisseur in industry vocab)
→ comptes_bancaires           ← NEW sprint 2
→ rubriques_budget            ← NEW sprint 2
→ postes_budgetaires          ← NEW sprint 2
→ appels_fonds                (linked to exercice_id in sprint 2)
→ appels_fonds_lignes
→ paiements                   (linked to exercice_id in sprint 2)
→ depenses                    ← NEW sprint 2
→ contrats                    ← NEW sprint 2
→ tickets                     (réclamation in industry vocab)
→ messages_ticket             ← NEW sprint 2 (threaded messaging)
→ annonces                    ← NEW sprint 2
→ lectures_annonce            ← NEW sprint 2
→ travaux                     ← NEW sprint 3
→ dossiers_ged                ← NEW sprint 3
→ documents_ged               ← NEW sprint 3
→ echeances                   ← NEW sprint 3
→ notifications_log
→ assemblees
→ votes_ag
```

## 16 Modules roadmap
```
MODULE 1  — Dashboard (KPIs + analytics)              ✅ sprint 1 (basic)
MODULE 2  — Résidences (CRUD + exercices)             ✅ sprint 1 + exercices sprint 2
MODULE 3  — Lots (CRUD + tantièmes + historique)      ✅ sprint 1
MODULE 4  — Copropriétaires (CRUD + invite)           ✅ sprint 1 + invites sprint 2
MODULE 5  — Paiements (encaissements + reçus PDF)     ✅ sprint 1
MODULE 6  — Budgets (3 types + comparatif réel)       ❌ sprint 2
MODULE 7  — Dépenses (upload factures + validation)   ❌ sprint 2
MODULE 8  — Prestataires (CRUD + note + alertes)      ❌ sprint 2
MODULE 9  — Contrats (avec alertes expiration)        ❌ sprint 2
MODULE 10 — Tickets/Réclamations (statuts + thread)   ⚠️  sprint 1 simple → sprint 2 complet
MODULE 11 — Annonces (ciblage + push + accusé lu)     ❌ sprint 2
MODULE 12 — Suivi des travaux (avancement + photos)   ❌ sprint 3
MODULE 13 — Échéances & Rappels                       ❌ sprint 3
MODULE 14 — Documents GED (arborescence + accès)      ❌ sprint 3
MODULE 15 — Appels de fonds (auto-génération)         ✅ sprint 1
MODULE 16 — Assemblées Générales (AG + vote online)   ❌ sprint 3
```

## Folder structure inside backend/
```
app/
├── Http/Controllers/Api/
│   ├── Auth/AuthController.php
│   ├── SuperAdmin/
│   ├── Manager/
│   ├── Gestionnaire/
│   ├── Conseil/
│   └── Resident/
├── Http/Middleware/
│   ├── SetTenant.php
│   └── CheckRole.php
├── Http/Requests/       ← ALL validation here, never in controllers
├── Http/Resources/      ← ALL API responses use Resources
├── Models/
├── Services/
│   ├── WhatsAppService.php
│   ├── SmsService.php
│   ├── PdfService.php
│   └── NotificationService.php
├── Jobs/
│   ├── SendWhatsAppNotification.php
│   └── SendRelancesAutomatiques.php
└── Events/

database/
├── migrations/          ← in dependency order
└── seeders/
    └── DemoSeeder.php   ← realistic Moroccan demo data

routes/
└── api.php              ← grouped by role
```

## API response format (always)
```json
{
  "status": "success",
  "message": "Appel de fonds créé",
  "data": { ... }
}
```
Error format:
```json
{
  "status": "error",
  "message": "Validation échouée",
  "errors": { "field": ["message"] }
}
```

## Auth flow (implémentation réelle)
Admin users (manager, gestionnaire, conseil, agent_recouvrement, super_admin):
1. POST /api/auth/login → {email, password} → vérifie Hash::check → Sanctum token + user + tenant
2. Rate limit : 5 essais / 10 min par email (RateLimiter Laravel)
3. All protected routes: middleware(['auth:sanctum', 'role:X'])
4. GET /api/auth/me → returns user + permissions + tenant info
5. POST /api/auth/logout → révoque le token courant

Resident (portail mobile):
1. POST /api/auth/resident/login → {phone, code} → code d'accès hashé en BDD
2. Première connexion → status "first_login" → POST /api/auth/resident/activate pour set le mot de passe perso
3. Rate limit identique aux admins

Note : le flow OTP WhatsApp envisagé initialement n'a PAS été implémenté pour les admins.
Email + password est le standard. WhatsApp/SMS reste utilisé pour les notifications métier
(appels de fonds, relances, annonces) via WhatsAppService + Jobs async.

## Legal compliance (MANDATORY)
Every new feature, endpoint, or module MUST comply with:
- **Loi 18-00** (statut de la copropriété des immeubles bâtis, modifiée par Loi 106-12)
- **Décret 2.23.700** (règles comptables des syndicats, effectif 1er janvier 2026)

Before coding any new feature, check `docs/loi-18-00-conformite.md` for:
1. Which articles of Loi 18-00 apply to this feature
2. Which accounting rules of Décret 2.23.700 apply
3. Required majorités for AG-related decisions (relative, 3/4, unanimité)
4. Financial data must align with the 7-class chart of accounts (Classes 1,3,4,5,6,7)
5. Any document retention obligations (5 years minimum)

Key legal rules that MUST be enforced in code:
- AG convocation: 15 days minimum notice (Art. 16quinquies)
- AG quorum: 50% copropriétaires present (Art. 18)
- Syndic election: 3/4 majority (Art. 19)
- Impayés: mise en demeure + 30j = toutes provisions exigibles (Art. 25)
- Prescription charges: 5 ans (Art. 43)
- Compte bancaire séparé obligatoire par syndicat (Art. 26)
- Budget voté obligatoire avant tout décaissement (Décret 2.23.700)
- Comptabilité d'engagement, pas de caisse simple (Décret 2.23.700)
- Audit expert-comptable obligatoire si recettes > 1 000 000 MAD (Décret 2.23.700)
- Conservation documents 5 ans minimum (Décret 2.23.700)

## Business rules (critical)
- Tantièmes: each lot has a share out of 1000 (e.g., lot A = 45/1000)
- Appel de fonds calculation: montant_du = montant_total × (tantieme / total_tantieme)
- Sum of all tantièmes in a résidence MUST equal exactly 1000
- All financial data MUST belong to an exercice (year) — enforced from sprint 2
- WhatsApp = priority 1, SMS = fallback, email = backup
- Currency: always MAD/DH, never € or $
- Loi 18-00: all PDFs must reference this law
- Languages: FR (primary), AR (secondary, RTL)
- Passwords NEVER shown in plain text (SyndicConnect critical flaw — we fix this)

## Commands
```bash
php artisan serve                           # Start dev server (port 8000)
php artisan migrate                         # Run migrations
php artisan migrate:fresh --seed            # Reset + seed demo data
php artisan db:seed --class=DemoSeeder     # Seed only
php artisan horizon                         # Start queue worker
php artisan make:model X -mfsc             # Model+migration+factory+seeder+controller
php artisan make:request StoreXRequest     # Form request
php artisan make:resource XResource        # API resource
./vendor/bin/pest                          # Run tests
./vendor/bin/pest --filter=AuthTest        # Single test
php artisan route:list --path=api          # List API routes
```

## Git rules
- NEVER push to main or develop directly
- Branch naming: `feat/backend-exercices`, `fix/backend-tantieme-calc`
- Commit format: `feat(exercices): add annual fiscal year support` (Conventional Commits)
- Max 2 days per branch — split if bigger
- Pull from develop every morning: `git pull origin develop && git rebase develop`
- Update docs/api.md BEFORE coding any new endpoint
- Update backend/.env.example when adding new env vars

## Demo data (DemoSeeder must generate)
- 1 tenant: Gest Syndic SARL (subdomain: gestsyndic, plan: business)
- 1 manager: Mohammed Fikri (+212600000001)
- 2 gestionnaires
- 1 résidence: Résidence Atlas (Casablanca, 20 lots)
- 1 exercice actif: 2026 (date_debut: 2026-01-01, date_fin: 2026-12-31)
- 20 lots with tantièmes summing to exactly 1000
- 20 coproprietaires with real Moroccan names (Hassan Benali, Fatima Chraibi, etc.)
- 1 appel de fonds: "Charges Q2 2026" (18,000 DH total) — linked to exercice 2026
- Lines auto-calculated by tantième
- 15 paiements (75% paid, 5 overdue)
- 3 tickets (1 urgente: ascenseur, 2 normale)

## ENV variables
```
APP_NAME=imaro
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=imaro
DB_USERNAME=root
DB_PASSWORD=secret
REDIS_HOST=127.0.0.1
QUEUE_CONNECTION=redis
TWILIO_SID=
TWILIO_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+212XXXXXXXXX
BREVO_API_KEY=
SENTRY_LARAVEL_DSN=
```

## Jira tasks status
### Sprint 1 — DONE ✅
KAN-9:  [SETUP] Repo GitHub + team invite
KAN-10: [SETUP] Laravel 11 init
KAN-12: [SETUP] DB schema + migrations
KAN-13: [COMPTA] Résidences + lots + tantièmes API
KAN-14: [COMPTA] Appels de fonds auto-generation
KAN-15: [COMPTA] Paiements + impayés tracking
KAN-21: [TICKETS] Tickets/réclamations system

### Sprint 2 — TODO
KAN-22: [SETUP] VPS + domain + SSL + CI/CD
KAN-16: [WA] WhatsApp Business API setup (BLOCKED — Meta approval 7-14 days)
KAN-17: [WA] Auto relances (blocked on KAN-16)
[NEW]   Add exercices table + link appels_fonds & paiements
[NEW]   MODULE 6: Budgets (fonctionnement / investissement / exceptionnel)
[NEW]   MODULE 7: Dépenses (upload factures + validation 2 niveaux)
[NEW]   MODULE 8: Prestataires/fournisseurs complet
[NEW]   MODULE 9: Contrats (alertes expiration)
[NEW]   MODULE 11: Annonces (push + accusé de lecture)
[NEW]   Manager API (CRUD résidences, gestion gestionnaires, rapports)

## Performance rules
- All queries must use indexes (tenant_id, residence_id, exercice_id, statut columns)
- N+1 queries forbidden — always eager load relations
- Cache dashboard KPIs in Redis (TTL 5 min)
- PDF generation always async via Job (never in request cycle)
- WhatsApp sends always async via Job
