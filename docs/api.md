# SyndikPro — API Contract

**Base URL:** `https://{subdomain}.syndikpro.ma/api`
**Local dev:** `http://localhost:8000/api`
**Auth:** `Authorization: Bearer {sanctum_token}`
**Content-Type:** `application/json`
**Currency:** MAD (DH) — always
**Languages:** FR (primary), AR (secondary, RTL)

---

## Response Envelope

**Success**
```json
{
  "status": "success",
  "message": "Appel de fonds créé",
  "data": { ... }
}
```

**Error / Validation**
```json
{
  "status": "error",
  "message": "Validation échouée",
  "errors": { "field": ["message"] }
}
```

---

## Multi-Tenant

Tenant is resolved from the subdomain: `blanca.syndikpro.ma` → tenant `blanca`.
`SetTenant` middleware auto-injects `tenant_id` on every request. All resources are scoped to the current tenant.

---

## Roles

| Role | Description |
|---|---|
| `super_admin` | SyndikPro team — full platform access |
| `manager` | Syndic company owner |
| `gestionnaire` | Employee managing N residences |
| `agent_recouvrement` | Collections specialist |
| `conseil` | Elected copropriétaire — read-only |
| `resident` | End copropriétaire — own data only |

---

## 1. Auth (OTP — no password)

### POST /api/auth/request-otp
Request a 6-digit OTP via WhatsApp (fallback: SMS).

**Body**
```json
{ "phone": "+212600000001" }
```

**Response 200**
```json
{
  "status": "success",
  "message": "OTP envoyé via WhatsApp",
  "data": { "expires_in": 300 }
}
```

**Notes**
- OTP stored hashed in Redis, TTL 5 min
- WhatsApp = priority 1, SMS = fallback

---

### POST /api/auth/verify-otp
Verify OTP and get Sanctum token.

**Body**
```json
{ "phone": "+212600000001", "otp": "482719" }
```

**Response 200**
```json
{
  "status": "success",
  "message": "Authentifié",
  "data": {
    "token": "1|abc...",
    "user": {
      "id": 1,
      "name": "Mohammed Fikri",
      "phone": "+212600000001",
      "role": "manager"
    },
    "tenant": {
      "id": 1,
      "name": "Blanca Syndic",
      "subdomain": "blanca",
      "plan": "business"
    }
  }
}
```

**Response 422** — invalid or expired OTP

---

### GET /api/auth/me
`auth:sanctum`

Returns current user, permissions, and tenant info.

**Response 200**
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": 1,
      "name": "Mohammed Fikri",
      "phone": "+212600000001",
      "role": "manager",
      "permissions": ["manage-residences", "manage-users", "view-reports"]
    },
    "tenant": {
      "id": 1,
      "name": "Blanca Syndic",
      "subdomain": "blanca",
      "plan": "business"
    }
  }
}
```

---

### POST /api/auth/logout
`auth:sanctum`

Revokes current Sanctum token.

**Response 200**
```json
{ "status": "success", "message": "Déconnecté" }
```

---

## 2. Residences (KAN-13)

`auth:sanctum` · roles: `manager`, `gestionnaire`

### GET /api/residences
List all residences for the current tenant.

**Query params**
| Param | Type | Description |
|---|---|---|
| `per_page` | int | Default 15 |
| `search` | string | Filter by name or city |

**Response 200**
```json
{
  "status": "success",
  "data": {
    "residences": [
      {
        "id": 1,
        "name": "Résidence Atlas",
        "address": "Bd Mohammed V, Casablanca",
        "city": "Casablanca",
        "lots_count": 20,
        "total_tantiemes": 1000,
        "gestionnaire": { "id": 2, "name": "Youssef Benali" }
      }
    ],
    "meta": { "total": 1, "per_page": 15, "current_page": 1 }
  }
}
```

---

### POST /api/residences
`role:manager`

**Body**
```json
{
  "name": "Résidence Atlas",
  "address": "Bd Mohammed V",
  "city": "Casablanca",
  "gestionnaire_id": 2
}
```

**Response 201**

---

### GET /api/residences/{id}

**Response 200** — includes lots list

---

### PUT /api/residences/{id}
`role:manager`

---

### DELETE /api/residences/{id}
`role:manager` — soft delete only

---

## 3. Lots & Tantièmes (KAN-13)

`auth:sanctum` · roles: `manager`, `gestionnaire`

**Business rule:** Sum of all `tantieme` values in a résidence MUST equal exactly **1000**.
**Calculation:** `montant_du = montant_total × (tantieme / 1000)`

### GET /api/residences/{residence_id}/lots

**Response 200**
```json
{
  "status": "success",
  "data": {
    "lots": [
      {
        "id": 1,
        "numero": "A01",
        "type": "appartement",
        "etage": 1,
        "surface_m2": 85,
        "tantieme": 45,
        "coproprietaire": {
          "id": 1,
          "name": "Hassan Benali",
          "phone": "+212600000010"
        }
      }
    ],
    "total_tantiemes": 1000
  }
}
```

---

### POST /api/residences/{residence_id}/lots

**Body**
```json
{
  "numero": "A01",
  "type": "appartement",
  "etage": 1,
  "surface_m2": 85,
  "tantieme": 45,
  "coproprietaire_id": 1
}
```

**Validation:** After insert, sum of tantièmes in the résidence must not exceed 1000.

**Response 201**

---

### PUT /api/residences/{residence_id}/lots/{id}

---

### DELETE /api/residences/{residence_id}/lots/{id}
Soft delete. Blocked if lot has unpaid appels de fonds.

---

## 4. Copropriétaires

`auth:sanctum` · roles: `manager`, `gestionnaire`

### GET /api/coproprietaires

**Query params:** `residence_id`, `search`, `per_page`

**Response 200**
```json
{
  "status": "success",
  "data": {
    "coproprietaires": [
      {
        "id": 1,
        "name": "Hassan Benali",
        "phone": "+212600000010",
        "email": "h.benali@example.com",
        "lots": [{ "id": 1, "numero": "A01", "tantieme": 45 }],
        "solde_du": 850.00
      }
    ]
  }
}
```

---

### POST /api/coproprietaires

**Body**
```json
{
  "name": "Hassan Benali",
  "phone": "+212600000010",
  "email": "h.benali@example.com",
  "cin": "BE123456",
  "lot_ids": [1]
}
```

---

### GET /api/coproprietaires/{id}

Includes lots, paiements, and impayés.

---

### PUT /api/coproprietaires/{id}

---

## 5. Appels de Fonds (KAN-14)

`auth:sanctum` · roles: `manager`, `gestionnaire`

### GET /api/appels-fonds

**Query params:** `residence_id`, `statut` (`brouillon`|`publié`|`clôturé`), `per_page`

**Response 200**
```json
{
  "status": "success",
  "data": {
    "appels_fonds": [
      {
        "id": 1,
        "titre": "Charges Q2 2026",
        "residence": { "id": 1, "name": "Résidence Atlas" },
        "montant_total": 18000.00,
        "statut": "publié",
        "date_echeance": "2026-06-30",
        "taux_recouvrement": 75,
        "montant_recouvre": 13500.00,
        "montant_restant": 4500.00,
        "lignes_count": 20
      }
    ]
  }
}
```

---

### POST /api/appels-fonds
Auto-generates one line per lot, calculated by tantième.

**Body**
```json
{
  "titre": "Charges Q2 2026",
  "residence_id": 1,
  "montant_total": 18000.00,
  "date_echeance": "2026-06-30",
  "description": "Charges de copropriété Q2 2026"
}
```

**Logic:** For each lot in the résidence:
`montant_du = 18000 × (tantieme / 1000)`

**Response 201**
```json
{
  "status": "success",
  "message": "Appel de fonds créé",
  "data": {
    "appel_fonds": { ... },
    "lignes": [
      {
        "lot_id": 1,
        "lot_numero": "A01",
        "coproprietaire": "Hassan Benali",
        "tantieme": 45,
        "montant_du": 810.00
      }
    ]
  }
}
```

---

### GET /api/appels-fonds/{id}

Full detail with all lignes and paiement status per lot.

---

### PUT /api/appels-fonds/{id}
Only allowed when `statut = brouillon`.

---

### POST /api/appels-fonds/{id}/publier
`role:manager`

Changes status from `brouillon` → `publié`. Triggers WhatsApp notifications to all copropriétaires.

**Response 200**

---

### POST /api/appels-fonds/{id}/cloture
`role:manager`

Changes status to `clôturé`.

---

### GET /api/appels-fonds/{id}/pdf
Returns PDF (generated async via Job, referenced by Loi 18-00).
Returns a signed URL if already generated, or queues generation and returns 202.

**Response 202** — generation queued
**Response 200** — `{ "url": "..." }`

---

## 6. Paiements (KAN-15)

`auth:sanctum` · roles: `manager`, `gestionnaire`, `agent_recouvrement`

### GET /api/paiements

**Query params:** `residence_id`, `appel_fonds_id`, `statut` (`payé`|`partiel`|`impayé`), `per_page`

**Response 200**
```json
{
  "status": "success",
  "data": {
    "paiements": [
      {
        "id": 1,
        "lot": { "id": 1, "numero": "A01" },
        "coproprietaire": { "id": 1, "name": "Hassan Benali" },
        "appel_fonds": { "id": 1, "titre": "Charges Q2 2026" },
        "montant_du": 810.00,
        "montant_paye": 810.00,
        "statut": "payé",
        "date_paiement": "2026-04-15",
        "mode_paiement": "virement"
      }
    ]
  }
}
```

---

### POST /api/paiements
Enregistrer un paiement.

**Body**
```json
{
  "appel_fonds_ligne_id": 1,
  "montant": 810.00,
  "date_paiement": "2026-04-15",
  "mode_paiement": "virement",
  "reference": "VIR-2026-001",
  "notes": ""
}
```

**Logic:** If `montant < montant_du` → statut = `partiel`. If `montant >= montant_du` → statut = `payé`.

**Response 201**

---

### GET /api/impayés
Liste des copropriétaires avec solde impayé.

**Query params:** `residence_id`, `appel_fonds_id`, `overdue_only` (bool)

**Response 200**
```json
{
  "status": "success",
  "data": {
    "impayes": [
      {
        "coproprietaire": { "id": 3, "name": "Fatima Chraibi", "phone": "+212600000012" },
        "lot": { "numero": "B03" },
        "montant_du": 720.00,
        "montant_paye": 0,
        "montant_restant": 720.00,
        "jours_retard": 15,
        "appel_fonds": { "id": 1, "titre": "Charges Q2 2026" }
      }
    ],
    "total_impaye": 4500.00
  }
}
```

---

### POST /api/impayés/{ligne_id}/relance
Envoyer une relance manuelle via WhatsApp/SMS.

**Body**
```json
{ "canal": "whatsapp" }
```

**Response 200** — job queued async

---

## 7. Tickets Maintenance (KAN-21)

`auth:sanctum`

### GET /api/tickets
`roles: manager, gestionnaire`

**Query params:** `residence_id`, `statut` (`ouvert`|`en_cours`|`résolu`|`fermé`), `priorite` (`urgent`|`normal`|`faible`), `per_page`

**Response 200**
```json
{
  "status": "success",
  "data": {
    "tickets": [
      {
        "id": 1,
        "titre": "Ascenseur en panne",
        "description": "Ascenseur bloc A bloqué au 3ème étage",
        "priorite": "urgent",
        "statut": "ouvert",
        "residence": { "id": 1, "name": "Résidence Atlas" },
        "coproprietaire": { "id": 1, "name": "Hassan Benali" },
        "created_at": "2026-05-10T09:00:00Z"
      }
    ]
  }
}
```

---

### POST /api/tickets
`roles: resident, conseil, gestionnaire, manager`

**Body**
```json
{
  "titre": "Ascenseur en panne",
  "description": "Ascenseur bloc A bloqué au 3ème étage",
  "priorite": "urgent",
  "residence_id": 1,
  "lot_id": 1
}
```

**Response 201**

---

### GET /api/tickets/{id}

---

### PUT /api/tickets/{id}
`roles: gestionnaire, manager` — update statut, assign prestataire

**Body**
```json
{
  "statut": "en_cours",
  "prestataire_id": 1,
  "notes_internes": "Technicien contacté"
}
```

---

### POST /api/tickets/{id}/close
`roles: gestionnaire, manager`

---

## 8. Prestataires

`auth:sanctum` · roles: `manager`, `gestionnaire`

### GET /api/prestataires

**Response 200**
```json
{
  "status": "success",
  "data": {
    "prestataires": [
      {
        "id": 1,
        "name": "Ascenseurs Maroc SARL",
        "specialite": "ascenseurs",
        "phone": "+212522000001",
        "email": "contact@asc-maroc.ma"
      }
    ]
  }
}
```

---

### POST /api/prestataires

**Body**
```json
{
  "name": "Ascenseurs Maroc SARL",
  "specialite": "ascenseurs",
  "phone": "+212522000001",
  "email": "contact@asc-maroc.ma",
  "adresse": "Casablanca"
}
```

---

## 9. Assemblées Générales

`auth:sanctum` · roles: `manager`, `gestionnaire`

### GET /api/assemblees

---

### POST /api/assemblees

**Body**
```json
{
  "titre": "AG Ordinaire 2026",
  "residence_id": 1,
  "date": "2026-06-15",
  "lieu": "Salle de réunion, Résidence Atlas",
  "ordre_du_jour": ["Approbation des comptes 2025", "Budget 2026", "Élection syndic"]
}
```

---

### POST /api/assemblees/{id}/votes
Enregistrer un vote.

**Body**
```json
{
  "resolution": "Approbation des comptes 2025",
  "coproprietaire_id": 1,
  "vote": "pour"
}
```

---

## 10. Notifications Log

`auth:sanctum` · roles: `manager`, `gestionnaire`

### GET /api/notifications
Historique des notifications envoyées (WhatsApp / SMS / email).

**Query params:** `coproprietaire_id`, `canal`, `statut` (`envoyé`|`échoué`|`en_attente`), `per_page`

**Response 200**
```json
{
  "status": "success",
  "data": {
    "notifications": [
      {
        "id": 1,
        "destinataire": "Hassan Benali",
        "phone": "+212600000010",
        "canal": "whatsapp",
        "type": "relance_impaye",
        "statut": "envoyé",
        "sent_at": "2026-05-11T08:30:00Z"
      }
    ]
  }
}
```

---

## 11. Super Admin (KAN-13 setup)

`auth:sanctum` · `role:super_admin`

### GET /api/super-admin/tenants

### POST /api/super-admin/tenants

**Body**
```json
{
  "name": "Blanca Syndic",
  "subdomain": "blanca",
  "plan": "business",
  "manager_name": "Mohammed Fikri",
  "manager_phone": "+212600000001"
}
```

### PUT /api/super-admin/tenants/{id}
### DELETE /api/super-admin/tenants/{id}

### GET /api/super-admin/stats
Platform-wide stats: tenants count, MRR, active users.

---

## 12. Dashboard KPIs

`auth:sanctum` · roles: `manager`, `gestionnaire`

### GET /api/dashboard

Cached in Redis (TTL 5 min).

**Response 200**
```json
{
  "status": "success",
  "data": {
    "residences_count": 3,
    "lots_count": 60,
    "taux_recouvrement": 75,
    "montant_recouvre": 13500.00,
    "montant_restant": 4500.00,
    "tickets_ouverts": 3,
    "tickets_urgents": 1,
    "appels_fonds_actifs": 1,
    "paiements_ce_mois": 8
  }
}
```

---

## HTTP Status Codes

| Code | Usage |
|---|---|
| 200 | OK |
| 201 | Created |
| 202 | Accepted (async job queued) |
| 204 | No Content (delete) |
| 401 | Unauthenticated |
| 403 | Unauthorized (wrong role) |
| 404 | Not found |
| 422 | Validation error |
| 500 | Server error |

---

## Notifications (async, always via Job)

| Event | Canal | Destinataire |
|---|---|---|
| OTP request | WhatsApp → SMS | Copropriétaire |
| Appel de fonds publié | WhatsApp → SMS → email | Tous copropriétaires de la résidence |
| Relance impayé (auto J+7, J+15, J+30) | WhatsApp → SMS | Copropriétaire impayé |
| Relance impayé (manuelle) | WhatsApp | Copropriétaire impayé |
| Ticket créé | WhatsApp | Gestionnaire assigné |
| Ticket résolu | WhatsApp | Copropriétaire concerné |

---

*Last updated: 2026-05-12 — sprint 1 (KAN-13, KAN-14, KAN-15, KAN-21)*
