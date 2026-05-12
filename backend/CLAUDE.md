# SyndikPro — CLAUDE.md (Abdellah · Backend)

## My role
I am Abdellah. I own everything inside `backend/` plus root config files.
I NEVER touch `frontend/`. If I find a frontend bug I open a GitHub Issue.
My first output every morning: update `docs/api.md` before writing any code.

## Project
SaaS B2B multi-tenant — condo management for Morocco.
Stack: Laravel 11 · MySQL 8 · Redis · PHP 8.3

## Mono-repo structure
```
syndikpro/          ← root (I manage this)
├── backend/        ← MY ZONE
├── frontend/       ← Mouad's zone — NEVER TOUCH
├── docs/api.md     ← API contract I write first
├── docker-compose.yml
├── CLAUDE.md
└── .gitignore
```

## My stack
- PHP 8.3 + Laravel 11
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
Every client = 1 tenant with isolated data.
ALL tables have `tenant_id`. SetTenant middleware auto-injects tenant on every request.
Tenant resolved from subdomain: `blanca.syndikpro.ma` → tenant with subdomain=blanca.

## Roles (6 levels)
```
super_admin       → SyndikPro team (me/Mouad/Fikri)
manager           → Syndic company owner (ex: Fikri at Blanca)
gestionnaire      → Employee managing N residences
agent_recouvrement → Collections specialist
conseil           → Elected copropriétaire (read-only)
resident          → End copropriétaire (own data only)
```

## DB tables (dependency order for migrations)
```
tenants → users → residences → lots → coproprietaires
→ prestataires → appels_fonds → appels_fonds_lignes
→ paiements → tickets → notifications_log
→ assemblees → votes_ag
```

## Folder structure inside backend/
```
app/
├── Http/Controllers/Api/
│   ├── Auth/AuthController.php
│   ├── SuperAdmin/
│   ├── Manager/
│   ├── Gestionnaire/
│   ├── AgentRecouvrement/
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

## Auth flow (OTP)
1. POST /api/auth/request-otp → {phone} → generate 6-digit OTP, store hashed, 5min TTL, send WhatsApp
2. POST /api/auth/verify-otp → {phone, otp} → verify → return Sanctum token + user + role
3. All protected routes: middleware(['auth:sanctum', 'role:X'])
4. GET /api/auth/me → returns user + permissions + tenant info

## Business rules (critical)
- Tantièmes: each lot has a share out of 1000 (e.g., lot A = 45/1000)
- Appel de fonds calculation: montant_du = montant_total × (tantieme/1000)
- Sum of all tantièmes in a résidence MUST equal exactly 1000
- WhatsApp = priority 1, SMS = fallback, email = backup
- Currency: always MAD/DH, never € or $
- Loi 18-00: all PDFs must reference this law
- Languages: FR (primary), AR (secondary, RTL)

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
- Branch naming: `feat/backend-auth-otp`, `fix/backend-tantieme-calc`
- Commit format: `feat(auth): add OTP endpoint` (Conventional Commits)
- Max 2 days per branch — split if bigger
- Pull from develop every morning: `git pull origin develop && git rebase develop`
- Update docs/api.md BEFORE coding any new endpoint
- Update backend/.env.example when adding new env vars

## Demo data (DemoSeeder must generate)
- 1 tenant: Blanca Syndic (subdomain: blanca, plan: business)
- 1 manager: Mohammed Fikri (+212600000001)
- 2 gestionnaires
- 1 résidence: Résidence Atlas (Casablanca, 20 lots)
- 20 lots with tantièmes summing to exactly 1000
- 20 copropriétaires with real Moroccan names (Hassan Benali, Fatima Chraibi, etc.)
- 1 appel de fonds: "Charges Q2 2026" (18,000 DH total)
- Lines auto-calculated by tantième
- 15 paiements (75% paid, 5 overdue)
- 3 tickets (1 urgent: ascenseur, 2 normal)

## ENV variables I need
```
APP_NAME=SyndikPro
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=syndikpro
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

## My Jira tasks (sprint 1 priority)
KAN-9:  [SETUP] Repo GitHub + team invite
KAN-10: [SETUP] Laravel 11 init
KAN-12: [SETUP] DB schema + migrations
KAN-22: [SETUP] VPS + domain + SSL + CI/CD
KAN-13: [COMPTA] Residences + lots + tantièmes API
KAN-14: [COMPTA] Appels de fonds auto-generation
KAN-15: [COMPTA] Payments + impayés tracking
KAN-16: [WA] WhatsApp Business API setup (start NOW — Meta takes 7-14 days)
KAN-17: [WA] Auto relances system
KAN-21: [TICKETS] Maintenance ticket system

## Performance rules
- All queries must use indexes (tenant_id, residence_id, status columns)
- N+1 queries forbidden — always eager load relations
- Cache dashboard KPIs in Redis (TTL 5 min)
- PDF generation always async via Job (never in request cycle)
- WhatsApp sends always async via Job
