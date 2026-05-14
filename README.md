# imaro

SaaS B2B multi-tenant — gestion de copropriété pour le Maroc (by Digitoyou).
**Stack:** Laravel 11 · MySQL 8 · Redis · PHP 8.3 · Loi 18-00

---

## Structure du mono-repo

```
imaro/
├── backend/          # Laravel 11 API (Abdellah)
├── frontend/         # Next.js app  (Mouad)
├── docs/api.md       # Contrat API
├── docker-compose.yml
└── .gitignore
```

---

## Prérequis

| Outil | Version minimale |
|---|---|
| PHP | 8.3 |
| Composer | 2.x |
| Node.js | 20+ |
| MySQL | 8.0 |
| Redis | 7.x |
| Git | 2.x |

---

## Setup Backend (Laravel)

```bash
# 1. Cloner le repo
git clone https://github.com/Jouider/syndikpro.git
cd imaro/backend

# 2. Installer les dépendances PHP
composer install

# 3. Copier et configurer les variables d'environnement
cp .env.example .env
# Éditer .env : DB_*, REDIS_*, TWILIO_*, BREVO_*

# 4. Générer la clé d'application
php artisan key:generate

# 5. Créer la base de données
mysql -u root -p -e "CREATE DATABASE imaro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 6. Lancer les migrations + seed de démo
php artisan migrate:fresh --seed

# 7. Lier le storage public
php artisan storage:link

# 8. Démarrer le serveur de développement
php artisan serve
# → http://localhost:8000
```

### Variables d'environnement requises

Copier `backend/.env.example` et remplir :

```env
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

TWILIO_SID=              # Obtenir sur console.twilio.com
TWILIO_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+212XXXXXXXXX

BREVO_API_KEY=           # Obtenir sur brevo.com
SENTRY_LARAVEL_DSN=
```

> **Important WhatsApp :** La validation Meta prend 7 à 14 jours ouvrés.
> Démarrer la demande dès le premier jour (KAN-16).

---

## Setup Frontend

```bash
cd imaro/frontend
npm install
cp .env.example .env.local
# Éditer VITE_API_URL=http://localhost:8000/api
npm run dev
# → http://localhost:5173
```

---

## Docker (optionnel)

```bash
# Démarrer MySQL + Redis
docker-compose up -d

# Arrêter
docker-compose down
```

---

## Commandes utiles (Backend)

```bash
php artisan serve                        # Serveur dev (port 8000)
php artisan migrate                      # Migrations
php artisan migrate:fresh --seed         # Reset + données de démo
php artisan db:seed --class=DemoSeeder  # Seed uniquement
php artisan horizon                      # Queue worker (Redis)
php artisan route:list --path=api        # Lister les routes API
./vendor/bin/pest                        # Tests (39 tests)
./vendor/bin/pest --filter=AuthTest      # Test unitaire ciblé
```

---

## Données de démo (DemoSeeder)

Après `migrate:fresh --seed` :

| Compte | Téléphone | Rôle |
|---|---|---|
| Mohammed Fikri | +212600000001 | manager |
| Karim Alaoui | +212600000002 | gestionnaire |
| Leila Mansouri | +212600000003 | gestionnaire |

- **Tenant :** Blanca Syndic (`blanca.imaro.ma`)
- **Résidence :** Résidence Atlas — 20 lots, tantièmes = 1 000/1 000
- **Exercice :** 2026 (actif) — 01/01/2026 → 31/12/2026
- **Appel de fonds :** Charges Q2 2026 — 18 000 DH — lié à l'exercice 2026
- **15 paiements** (75 % réglé, 5 impayés)
- **3 tickets** (1 urgent : ascenseur, 2 normal)

---

## Architecture multi-tenant

Chaque client = 1 tenant (cabinet syndic) avec données isolées.
Le tenant est résolu depuis le sous-domaine :
`blanca.imaro.ma` → tenant `subdomain=blanca`

Toutes les tables ont une colonne `tenant_id`.
Le middleware `SetTenant` l'injecte automatiquement sur chaque requête.

---

## Concept Exercice (année fiscale)

Chaque résidence fonctionne par exercices annuels.
Toutes les données financières (appels de fonds, paiements, dépenses, budgets) sont rattachées à un exercice.

```
Tenant (cabinet syndic)
  └── Résidence (ex: Résidence Atlas)
        ├── Exercice 2024 (clôturé)
        ├── Exercice 2025 (clôturé)
        └── Exercice 2026 (actif)
              ├── Appels de fonds
              ├── Paiements
              └── Dépenses (sprint 2)
```

---

## Rôles

| Rôle | Qui | Accès |
|---|---|---|
| `super_admin` | Équipe imaro (Digitoyou) | Tout |
| `manager` | Propriétaire du cabinet syndic | Son tenant |
| `gestionnaire` | Employé gérant N résidences | Résidences assignées |
| `conseil` | Copropriétaire élu | Lecture + réclamations |
| `resident` | Copropriétaire final | Ses données uniquement |

---

## Modules

| Module | Statut |
|---|---|
| Auth OTP WhatsApp | ✅ Sprint 1 |
| Dashboard gestionnaire | ✅ Sprint 1 |
| Résidences + lots + tantièmes | ✅ Sprint 1 |
| Copropriétaires | ✅ Sprint 1 |
| Appels de fonds auto-génération | ✅ Sprint 1 |
| Paiements + impayés | ✅ Sprint 1 |
| Tickets / Réclamations | ✅ Sprint 1 |
| Exercices (années fiscales) | ✅ Sprint 2 |
| Budgets (3 types) | ❌ Sprint 2 |
| Dépenses | ❌ Sprint 2 |
| Prestataires / Contrats | ❌ Sprint 2 |
| Annonces | ❌ Sprint 2 |
| Manager API | ❌ Sprint 2 |
| Suivi des travaux | ❌ Sprint 3 |
| Documents GED | ❌ Sprint 3 |
| Assemblées Générales + votes | ❌ Sprint 3 |

---

## Workflow Git

```
main        ← production (protégée — PR obligatoire)
staging     ← pré-production / recette QA
develop     ← intégration continue
feat/*      ← nouvelles fonctionnalités
fix/*       ← corrections de bugs
```

```bash
# Démarrage d'une feature
git checkout develop
git pull origin develop
git checkout -b feat/backend-exercices

# Fin de feature → PR vers develop
git push origin feat/backend-exercices
gh pr create --base develop --title "feat(exercices): add annual fiscal year"
```

**Règles :**
- Ne jamais pusher directement sur `main` ou `develop`
- Nommage : `feat/backend-*`, `fix/backend-*`
- Format commit : Conventional Commits (`feat(auth): ...`)
- Branches de max 2 jours — découper si plus grand
- Pull depuis develop chaque matin : `git pull origin develop && git rebase develop`

---

## API

Voir [`docs/api.md`](docs/api.md) pour le contrat complet.

**Format de réponse standard :**
```json
{
  "status": "success",
  "message": "...",
  "data": {}
}
```

**Auth :** OTP WhatsApp → token Sanctum (30 jours)
**Base URL :** `https://{subdomain}.imaro.ma/api`

**Tester avec Postman :** importer `backend/postman/SyndikPro.postman_collection.json`

---

## Sprints

### Sprint 1 — DONE ✅
| Ticket | Description |
|---|---|
| KAN-9 | Repo GitHub + invitations équipe |
| KAN-10 | Init Laravel 11 |
| KAN-12 | Schéma DB + migrations |
| KAN-13 | API Résidences + lots + tantièmes |
| KAN-14 | Auto-génération appels de fonds |
| KAN-15 | Paiements + suivi impayés |
| KAN-21 | Système de tickets maintenance |

### Sprint 2 — EN COURS
| Ticket | Description | Statut |
|---|---|---|
| KAN-22 | VPS + domaine + SSL + CI/CD | ❌ |
| KAN-16 | WhatsApp Business API | ⏳ Bloqué Meta (7-14j) |
| KAN-17 | Relances automatiques | ⏳ Bloqué KAN-16 |
| — | Exercices (années fiscales) | ✅ |
| — | Budgets, Dépenses, Prestataires | ❌ |
| — | Annonces, Manager API | ❌ |

---

## Équipe

| Membre | Zone | GitHub |
|---|---|---|
| Abdellah | Backend (`backend/`) | @Jouider |
| Mouad | Frontend (`frontend/`) | — |

> Les bugs frontend détectés côté backend sont ouverts en GitHub Issue — ne pas modifier `frontend/`.
