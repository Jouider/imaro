# imaro — API Contract

**Base URL prod :** `https://api.imaro.ma/api`
**Base URL staging :** `https://api-staging.imaro.ma/api`
**Local dev :** `http://localhost:8000/api`
**Auth :** `Authorization: Bearer {sanctum_token}`
**Content-Type :** `application/json` (sauf upload fichiers → `multipart/form-data`)
**Currency :** MAD (DH) — toujours
**Languages :** FR (primary), AR (secondary, RTL)

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

Tenant résolu depuis le sous-domaine : `blanca.imaro.ma` → tenant `blanca`.
Le middleware `SetTenant` injecte automatiquement le `tenant_id` sur chaque requête. Toutes les ressources sont isolées par tenant.

---

## Roles

| Role | Description | Prefix |
|---|---|---|
| `super_admin` | Équipe imaro (Digitoyou) — accès total | `/api/admin/` |
| `manager` | Propriétaire du cabinet syndic | `/api/manager/` + `/api/gestionnaire/` |
| `gestionnaire` | Employé du cabinet, N résidences assignées | `/api/gestionnaire/` |
| `conseil` | Copropriétaire élu — lecture + réclamations | `/api/conseil/` |
| `resident` | Copropriétaire — portail mobile, ses données uniquement | `/api/portail/` |

---

## 1. Auth

### POST /api/auth/login
Login email + mot de passe pour : **manager, gestionnaire, conseil, super_admin**.

**Body**
```json
{ "email": "fikri@blancasyndic.ma", "password": "imaro2026" }
```

**Response 200**
```json
{
  "status": "success",
  "message": "Connexion réussie",
  "data": {
    "token": "1|abc...",
    "token_type": "Bearer",
    "expires_in": 2592000,
    "user": {
      "id": 1,
      "name": "Mohammed Fikri",
      "phone": "+212600000001",
      "email": "fikri@blancasyndic.ma",
      "role": "manager",
      "lang": "fr",
      "status": "active",
      "last_login_at": "2026-05-18T16:39:09+00:00",
      "tenant": {
        "id": 1,
        "name": "Blanca Syndic",
        "subdomain": "blanca",
        "plan": "business"
      }
    }
  }
}
```

**Erreurs**
- `401` — email ou mot de passe incorrect
- `403` — compte désactivé, ou rôle `resident` (utiliser le portail)
- `429` — trop de tentatives (5 max / 10 min)

---

### POST /api/auth/resident/login
Login téléphone + code d'accès pour les **résidents**.

**Body**
```json
{ "phone": "+212600000010", "code": "AT3K9M2P" }
```

**Response 200 — connexion normale**
```json
{
  "status": "success",
  "message": "Connexion réussie",
  "data": {
    "token": "2|xyz...",
    "token_type": "Bearer",
    "expires_in": 2592000,
    "user": { ... }
  }
}
```

**Response 200 — première connexion** *(pas de token — frontend doit afficher l'écran d'activation)*
```json
{
  "status": "first_login",
  "message": "Première connexion. Veuillez créer votre code d'accès personnel.",
  "data": { "phone": "+212600000010" }
}
```

**Erreurs**
- `401` — numéro ou code incorrect
- `403` — compte désactivé
- `429` — trop de tentatives (5 max / 10 min)

---

### POST /api/auth/resident/activate
Première connexion résident — crée le code personnel et retourne le token directement.

**Body**
```json
{
  "phone": "+212600000010",
  "temp_code": "AT3K9M2P",
  "new_code": "hassan123",
  "new_code_confirmation": "hassan123"
}
```

**Response 200**
```json
{
  "status": "success",
  "message": "Code créé. Bienvenue sur imaro !",
  "data": {
    "token": "3|abc...",
    "token_type": "Bearer",
    "expires_in": 2592000,
    "user": { ... }
  }
}
```

**Erreurs**
- `401` — numéro ou code temporaire incorrect
- `422` — compte déjà activé (must_change_code = false)
- `429` — trop de tentatives

---

### GET /api/auth/me
`auth:sanctum`

Retourne l'utilisateur courant, ses rôles et permissions.

**Auto-refresh** : si le token expire dans moins de 7 jours, la réponse
inclut un nouveau token (30j de TTL) dans `data.token` et l'ancien est
révoqué. Le client doit alors swap le token stocké. Détectable via
`data.refreshed === true`.

**Response 200 — token frais (pas de refresh)**
```json
{
  "status": "success",
  "data": {
    "user":   { "id": 1, "name": "Mohammed Fikri", "role": "manager" },
    "tenant": { "id": 1, "name": "Blanca Syndic", "subdomain": "blanca" }
  }
}
```

**Response 200 — token bientôt expiré (refresh émis)**
```json
{
  "status": "success",
  "data": {
    "user":       { "id": 1, "name": "Mohammed Fikri", "role": "manager" },
    "tenant":     { "id": 1, "name": "Blanca Syndic", "subdomain": "blanca" },
    "token":      "12|abcdef...",
    "token_type": "Bearer",
    "expires_in": 2592000,
    "refreshed":  true
  }
}
```

---

### POST /api/auth/logout
`auth:sanctum`

Révoque le token Sanctum courant.

**Response 200**
```json
{ "status": "success", "message": "Déconnecté avec succès." }
```

---

## 2. Dashboard

`auth:sanctum` · `role:manager|gestionnaire`

### GET /api/gestionnaire/dashboard
KPIs scopés aux résidences du gestionnaire (ou toutes pour le manager). Mis en cache Redis 5 min.

**Response 200**
```json
{
  "status": "success",
  "data": {
    "kpi": {
      "nb_residences": 1,
      "nb_coproprietaires": 20,
      "ca_mensuel": 13860.00,
      "total_impayes": 4140.00
    },
    "top_impayes": [
      {
        "coproprietaire": { "id": 16, "name": "Meriem Ouazzani" },
        "lot": "Apt 16",
        "montant": 900.00,
        "jours": 0
      }
    ],
    "tickets_urgents": [
      {
        "id": 1,
        "titre": "L'ascenseur est en panne...",
        "priorite": "urgent",
        "statut": "ouvert",
        "residence": { "id": 1, "name": "Résidence Atlas" },
        "created_at": "2026-05-17T14:45:10+00:00"
      }
    ],
    "assemblees_a_venir": [
      {
        "id": 1,
        "titre": "AG Ordinaire 2026",
        "date": "2026-06-14T15:00:00+00:00",
        "residence": { "name": "Résidence Atlas" }
      }
    ]
  }
}
```

---

## 3. Résidences

`auth:sanctum` · `role:manager|gestionnaire`

### GET /api/gestionnaire/residences
Liste les résidences assignées au gestionnaire (ou toutes pour le manager).

**Query params :** `search`, `per_page` (défaut 15)

**Response 200**
```json
{
  "status": "success",
  "data": {
    "residences": [
      {
        "id": 1,
        "name": "Résidence Atlas",
        "address": "12 Boulevard Zerktouni",
        "city": "Casablanca",
        "nb_lots": 20,
        "total_tantieme": 1000,
        "mode_cotisation": "tantieme",
        "cotisation_mensuelle": null,
        "status": "active",
        "gestionnaire": { "id": 2, "name": "Karim Alaoui" },
        "exercices": [ { "id": 1, "annee": 2026, "statut": "actif" } ]
      }
    ],
    "meta": { "total": 1, "per_page": 15, "current_page": 1, "last_page": 1 }
  }
}
```

---

### GET /api/gestionnaire/residences/{id}
Détail complet avec GH, immeubles, lots.

**Response 200** (extrait)
```json
{
  "id": 1,
  "name": "Résidence Atlas",
  "mode_cotisation": "tantieme",
  "cotisation_mensuelle": null,
  "groupes_habitations": [
    {
      "id": 1,
      "nom": "Tranche A",
      "total_tantieme": 1000,
      "immeubles": [
        { "id": 1, "nom": "Immeuble A", "nb_etages": 4, "nb_lots": 16 }
      ]
    }
  ],
  "immeubles": [
    { "id": 1, "nom": "Immeuble A", "groupe_habitation_id": 1 }
  ]
}
```

---

### POST /api/gestionnaire/residences

Crée une nouvelle résidence. Le `tenant_id` est injecté depuis le middleware ;
le `gestionnaire_id` est automatiquement défini sur l'utilisateur courant si
celui-ci a le rôle `gestionnaire`.

**Body**
| Champ | Type | Requis | Notes |
|---|---|---|---|
| `name` | string | ✓ | max 255 |
| `address` | string | ✗ | max 500 |
| `city` | string | ✓ | max 100 |
| `mode_cotisation` | `'tantieme' \| 'fixe'` | ✓ | |
| `montant_fixe` | number | si `mode_cotisation='fixe'` | DH, persisté dans `cotisation_mensuelle` |
| `jour_echeance` | int (1–28) | ✗ | Jour du mois où les cotisations sont dues |

**Response 201** → `data` = objet Résidence créé (cf. shape ci-dessus, sans wrapper `residence`).

---

### PUT /api/gestionnaire/residences/{id}

**Body** (partiel — tous les champs du POST sont supportés en `sometimes`)
```json
{
  "name": "Résidence Atlas",
  "city": "Casablanca",
  "mode_cotisation": "fixe",
  "montant_fixe": 2500.00,
  "jour_echeance": 5,
  "status": "active"
}
```

**Response 200** → `data` = objet Résidence à jour (pas de wrapper `residence`).

---

### DELETE /api/gestionnaire/residences/{id}
Soft-delete (les lots / paiements liés sont conservés en historique).

**Response 200**
```json
{ "status": "success", "message": "Résidence supprimée", "data": { "id": 12 } }
```

---

### GET /api/gestionnaire/residences/{id}/overview
KPIs financiers et opérationnels affichés dans l'espace de gestion.

**Response 200**
```json
{
  "status": "success",
  "data": {
    "nb_lots": 24,
    "nb_coproprietaires": 22,
    "taux_recouvrement": 83.0,
    "paye_ce_mois": 29880,
    "en_attente": 2448,
    "en_retard": 3672,
    "nb_impayes": 4,
    "tresorerie": 89640,
    "fonds_reserve": 0
  }
}
```

Notes :
- `taux_recouvrement` = total payé / total dû (sur appels de fonds non brouillon)
- `en_attente` = restant à recouvrer pour les appels dont l'échéance est à venir
- `en_retard` = restant à recouvrer pour les appels dont l'échéance est passée
- `nb_impayes` = nombre de lignes en retard (non payées + échéance dépassée)
- `tresorerie` = total encaissé − total dépensé (toutes périodes)
- `fonds_reserve` = 0 tant que le module Réserve n'est pas livré (sprint 3+)

---

## 3b. Groupes d'Habitation (Tranches)

`auth:sanctum` · `role:manager|gestionnaire`

> Optionnel. À utiliser pour les résidences avec plusieurs bâtiments/tranches indépendants. Si présent, les budgets et appels de fonds sont gérés au niveau de la tranche.

### GET /api/gestionnaire/residences/{id}/groupes-habitations

Retourne la liste des tranches de la résidence, avec `nb_immeubles` dénormalisé
(via `withCount`). La relation `immeubles[]` n'est PAS chargée ici pour limiter
la payload — utilise l'endpoint `/immeubles` pour la liste détaillée.

**Response 200**
```json
{
  "status": "success",
  "data": {
    "groupes_habitations": [
      {
        "id": 1,
        "nom": "Tranche A",
        "code": "TA",
        "residence_id": 1,
        "description": "Bâtiment Nord — 16 appartements",
        "total_tantieme": 1000,
        "nb_immeubles": 2
      }
    ]
  }
}
```

---

### POST /api/gestionnaire/residences/{id}/groupes-habitations

**Body**
| Champ | Type | Requis | Notes |
|---|---|---|---|
| `nom` | string | ✓ | max 255, unique par résidence |
| `code` | string | ✗ | max 20, unique par résidence si fourni (ex: "TA", "TN") |
| `description` | string | ✗ | |
| `total_tantieme` | number | ✗ | défaut 1000 |

**Response 201** — même shape que GET, avec `nb_immeubles = 0`.

**Erreurs :**
- `422` — nom ou code déjà utilisé dans cette résidence

---

### PUT /api/gestionnaire/residences/{id}/groupes-habitations/{gh}

**Body** (tous champs optionnels)
```json
{ "nom": "Tranche A - Révisé", "code": "TA1", "description": "...", "total_tantieme": 1000 }
```

---

### DELETE /api/gestionnaire/residences/{id}/groupes-habitations/{gh}

Supprime la tranche. Les immeubles rattachés voient leur `groupe_habitation_id`
mis à `null` (pas de cascade destructive — la FK est `nullOnDelete`, et le
controller le fait aussi explicitement pour rester audit-friendly).

**Response 200** — `{ "status": "success", "message": "Groupe supprimé" }`

---

## 3c. Immeubles

`auth:sanctum` · `role:manager|gestionnaire`

> Obligatoire entre résidence et lot. Chaque lot appartient à un immeuble.

### GET /api/gestionnaire/residences/{id}/immeubles

**Response 200**
```json
{
  "status": "success",
  "data": {
    "immeubles": [
      {
        "id": 1,
        "nom": "Immeuble A",
        "adresse": null,
        "nb_etages": 4,
        "nb_lots": 16,
        "groupe_habitation_id": 1,
        "groupe_habitation": { "id": 1, "nom": "Tranche A" }
      }
    ]
  }
}
```

---

### POST /api/gestionnaire/residences/{id}/immeubles

**Body**
```json
{
  "nom": "Immeuble A",
  "groupe_habitation_id": 1,
  "adresse": "Entrée principale",
  "nb_etages": 4
}
```

> `groupe_habitation_id` optionnel. Si fourni, doit appartenir à la résidence.

---

### PUT /api/gestionnaire/residences/{id}/immeubles/{immeuble}
### DELETE /api/gestionnaire/residences/{id}/immeubles/{immeuble}

**Erreurs :**
- `422` — impossible de supprimer si l'immeuble contient des lots

---

### GET /api/gestionnaire/immeubles/{immeuble}/lots
Liste les lots d'un immeuble spécifique.

---

## 4. Exercices

`auth:sanctum` · `role:manager|gestionnaire`

Chaque résidence fonctionne par exercices annuels. Toutes les opérations financières (appels de fonds, paiements, dépenses, budgets) sont rattachées à un exercice.

### GET /api/gestionnaire/residences/{id}/exercices

**Response 200**
```json
{
  "status": "success",
  "data": [
    { "id": 1, "annee": 2026, "date_debut": "2026-01-01", "date_fin": "2026-12-31", "statut": "actif" },
    { "id": 2, "annee": 2025, "date_debut": "2025-01-01", "date_fin": "2025-12-31", "statut": "cloture" }
  ]
}
```

---

### POST /api/gestionnaire/residences/{id}/exercices

**Body**
```json
{ "annee": 2027, "date_debut": "2027-01-01", "date_fin": "2027-12-31" }
```

**Validation :** Un seul exercice par année par résidence.

**Response 201**
```json
{ "status": "success", "message": "Exercice 2027 créé.", "data": { "id": 3, "annee": 2027, "statut": "actif" } }
```

---

### POST /api/gestionnaire/residences/{id}/exercices/{exercice}/cloture
Action irréversible.

**Response 200**
```json
{ "status": "success", "message": "Exercice 2026 clôturé.", "data": { "statut": "cloture" } }
```

**Erreurs :** `422` — exercice déjà clôturé

---

## 5. Lots & Tantièmes

`auth:sanctum` · `role:manager|gestionnaire`

**Règle :** La somme des tantièmes de tous les lots d'une résidence doit être exactement **1000**.
**Calcul tantième :** `montant_du = montant_total × (tantieme / 1000)`
**Calcul fixe :** `montant_du = montant_total / nb_lots`

> **Nouveau :** chaque lot appartient obligatoirement à un **immeuble** (`immeuble_id` requis au POST).

### GET /api/gestionnaire/residences/{id}/lots

**Response 200**
```json
{
  "status": "success",
  "data": {
    "lots": [
      {
        "id": 1,
        "numero": "A101",
        "type": "appartement",
        "etage": 1,
        "superficie": 85.00,
        "tantieme": 65,
        "immeuble_id": 1,
        "immeuble": { "id": 1, "nom": "Immeuble A" },
        "coproprietaire": { "id": 1, "name": "Hassan Benali", "phone": "+212600000010" }
      }
    ],
    "total_tantieme": 1000,
    "sum_tantieme": 1000
  }
}
```

---

### GET /api/gestionnaire/immeubles/{immeuble}/lots
Filtre les lots par immeuble directement.

---

### POST /api/gestionnaire/residences/{id}/lots

**Body**
```json
{
  "numero": "A101",
  "type": "appartement",
  "etage": 1,
  "superficie": 85.00,
  "tantieme": 65,
  "immeuble_id": 1
}
```

Types valides : `appartement` | `local_commercial` | `parking` | `cave`

**Validation :** `immeuble_id` obligatoire et doit appartenir à la résidence. La somme des tantièmes ne doit pas dépasser `total_tantieme`.

**Response 201**

---

### PUT /api/gestionnaire/residences/{id}/lots/{lot}
### PUT /api/gestionnaire/lots/{lot} *(route plate)*
### DELETE /api/gestionnaire/residences/{id}/lots/{lot}
### DELETE /api/gestionnaire/lots/{lot} *(route plate)*

Soft delete. Bloqué si le lot a des appels de fonds impayés.

---

## 6. Copropriétaires

`auth:sanctum` · `role:manager|gestionnaire`

### GET /api/gestionnaire/residences/{id}/coproprietaires

**Query params :** `search`, `per_page`

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
        "email": "hassan.benali@email.ma",
        "type": "proprietaire",
        "date_entree": "2024-01-01",
        "solde_actuel": -900.00,
        "lot": { "id": 1, "numero": "Apt 1", "tantieme": 65 },
        "residence": { "id": 1, "name": "Résidence Atlas" }
      }
    ],
    "meta": { "total": 20, "per_page": 15, "current_page": 1, "last_page": 2 }
  }
}
```

---

### GET /api/gestionnaire/coproprietaires
Liste globale — toutes les résidences du gestionnaire.

---

### POST /api/gestionnaire/coproprietaires/{id}/generate-code
Génère un code d'accès temporaire pour un résident et l'envoie par WhatsApp (simulé par log en attendant Twilio).

Le code est affiché **une seule fois** au gestionnaire — non récupérable ensuite.

**Response 200**
```json
{
  "status": "success",
  "message": "Code d'accès généré pour Hassan Benali.",
  "data": {
    "code": "AT3K9M2P",
    "phone": "+212600000010",
    "name": "Hassan Benali"
  }
}
```

**Erreurs :** `403` — résidence non assignée à ce gestionnaire

---

## 7. Appels de Fonds

`auth:sanctum` · `role:manager|gestionnaire`

### GET /api/gestionnaire/appels-fonds

**Query params :** `residence_id`, `groupe_habitation_id`, `statut` (`brouillon`|`envoye`|`partiel`|`paye`), `per_page`

**Response 200**
```json
{
  "status": "success",
  "data": {
    "appels_fonds": [
      {
        "id": 1,
        "libelle": "Charges Q2 2026",
        "residence": { "id": 1, "name": "Résidence Atlas" },
        "exercice": { "id": 1, "annee": 2026 },
        "montant_total": 18000.00,
        "statut": "partiel",
        "date_echeance": "2026-06-30",
        "lignes_count": 16
      }
    ]
  }
}
```

---

### POST /api/gestionnaire/appels-fonds
Génère automatiquement une ligne par lot selon le mode de cotisation.

**Body**
```json
{
  "libelle": "Charges Q2 2026",
  "residence_id": 1,
  "exercice_id": 1,
  "groupe_habitation_id": 1,
  "montant_total": 18000.00,
  "date_echeance": "2026-06-30",
  "description": "Charges de copropriété Q2 2026"
}
```

> `groupe_habitation_id` optionnel. Si fourni, seuls les lots de cette tranche sont inclus.

**Calcul automatique selon `mode_cotisation` de la résidence :**
- `"tantieme"` → `montant_du = montant_total × (lot.tantieme / total_tantieme_scope)`
- `"fixe"` → `montant_du = montant_total / nb_lots_scope`

**Response 201**

---

### GET /api/gestionnaire/appels-fonds/{id}
Détail avec toutes les lignes et statut de paiement par lot.

---

### PUT /api/gestionnaire/appels-fonds/{id}
Modifiable uniquement si `statut = brouillon`.

---

### POST /api/gestionnaire/appels-fonds/{id}/envoyer
Publie l'appel de fonds. Déclenche notifications WhatsApp à tous les copropriétaires.

---

## 8. Paiements & Impayés

`auth:sanctum` · `role:manager|gestionnaire`

### GET /api/gestionnaire/paiements

**Query params :** `residence_id`, `appel_fonds_id`, `statut`, `per_page`

**Response 200**
```json
{
  "status": "success",
  "data": {
    "paiements": [
      {
        "id": 1,
        "coproprietaire": { "id": 1, "name": "Hassan Benali" },
        "lot": { "id": 1, "numero": "Apt 1" },
        "appel_fonds": { "id": 1, "libelle": "Charges Q2 2026" },
        "montant": 810.00,
        "mode": "virement",
        "reference": "VIR-2026-001",
        "date_paiement": "2026-04-15"
      }
    ]
  }
}
```

---

### POST /api/gestionnaire/paiements

**Body**
```json
{
  "appel_fonds_ligne_id": 1,
  "montant": 810.00,
  "mode": "virement",
  "reference": "VIR-2026-001",
  "date_paiement": "2026-04-15",
  "notes": ""
}
```

Modes valides : `especes` | `cheque` | `virement` | `mobile`

**Logic :** `montant < montant_du` → statut `partiel`. `montant >= montant_du` → statut `paye`.

---

### GET /api/gestionnaire/impayes

**Query params :** `residence_id`, `appel_fonds_id`

**Response 200**
```json
{
  "status": "success",
  "data": {
    "impayes": [
      {
        "coproprietaire": { "id": 3, "name": "Fatima Chraibi", "phone": "+212600000012" },
        "lot": { "numero": "Apt 2" },
        "montant_du": 990.00,
        "montant_paye": 0,
        "montant_restant": 990.00,
        "jours_retard": 15
      }
    ],
    "total_impaye": 4140.00
  }
}
```

---

## 9. Tickets / Réclamations

`auth:sanctum`

> Upload de photos : `Content-Type: multipart/form-data`

### GET /api/gestionnaire/tickets
`role:manager|gestionnaire`

**Query params :** `residence_id`, `statut` (`ouvert`|`en_cours`|`resolu`|`clos`), `priorite` (`urgent`|`normal`|`faible`), `categorie`, `per_page`

**Response 200**
```json
{
  "status": "success",
  "data": {
    "tickets": [
      {
        "id": 1,
        "categorie": "ascenseur",
        "description": "L'ascenseur est en panne depuis ce matin.",
        "priorite": "urgent",
        "statut": "ouvert",
        "images": ["https://api.imaro.ma/storage/tickets/1/photo1.jpg"],
        "closed_at": null,
        "created_at": "2026-05-17T14:45:10+00:00",
        "residence": { "id": 1, "name": "Résidence Atlas" },
        "lot": { "id": 1, "numero": "Apt 1" },
        "user": { "id": 5, "name": "Hassan Benali", "phone": "+212600000010" }
      }
    ],
    "meta": { "total": 3, "per_page": 15, "current_page": 1, "last_page": 1 }
  }
}
```

---

### POST /api/gestionnaire/tickets
`Content-Type: multipart/form-data`

| Champ | Type | Requis | Description |
|---|---|---|---|
| `residence_id` | integer | ✅ | |
| `lot_id` | integer | — | |
| `categorie` | string | ✅ | `plomberie` \| `electricite` \| `ascenseur` \| `proprete` \| `securite` \| `autre` |
| `description` | string | ✅ | Min 10, max 2000 chars |
| `priorite` | string | ✅ | `urgent` \| `normal` \| `faible` |
| `images[]` | file | — | Max 5 · jpeg/png/webp · max 5 MB/photo |

**Response 201**

---

### GET /api/gestionnaire/tickets/{id}
### PUT /api/gestionnaire/tickets/{id}
### POST /api/gestionnaire/tickets/{id}/clos
Action irréversible.

---

## 10. Annonces

`auth:sanctum` · `role:manager|gestionnaire`

### GET /api/gestionnaire/annonces

**Query params :** `residence_id`, `statut` (`brouillon`|`publiee`|`archivee`)

---

### POST /api/gestionnaire/annonces

**Body**
```json
{
  "titre": "Coupure d'eau prévue le 20 mai",
  "contenu": "La LYDEC effectuera des travaux...",
  "residence_id": 1,
  "priorite": "urgente"
}
```

Priorités valides : `normale` | `urgente`

---

### PUT /api/gestionnaire/annonces/{id}
### POST /api/gestionnaire/annonces/{id}/publier
### POST /api/gestionnaire/annonces/{id}/archiver
### DELETE /api/gestionnaire/annonces/{id}

---

## 11. Prestataires & Contrats

`auth:sanctum` · `role:manager|gestionnaire`

### GET /api/gestionnaire/prestataires

**Query params :** `statut` (`actif`|`inactif`), `specialite`

**Response 200**
```json
{
  "status": "success",
  "data": {
    "prestataires": [
      {
        "id": 1,
        "nom": "Atlas Ascenseurs SARL",
        "telephone": "+212522334455",
        "specialite": "Maintenance ascenseurs",
        "email": "contact@atlasasc.ma",
        "statut": "actif"
      }
    ]
  }
}
```

---

### POST /api/gestionnaire/prestataires

**Body**
```json
{ "nom": "Atlas Ascenseurs SARL", "telephone": "+212522334455", "specialite": "Maintenance ascenseurs", "email": "contact@atlasasc.ma" }
```

---

### PUT /api/gestionnaire/prestataires/{id}

**Body** (tous champs optionnels)
```json
{ "nom": "...", "telephone": "...", "statut": "inactif" }
```

---

### GET /api/gestionnaire/contrats

**Query params :** `residence_id`, `statut` (`actif`|`expire`|`resilie`)

---

### POST /api/gestionnaire/contrats

**Body**
```json
{
  "titre": "Maintenance ascenseur 2026",
  "type": "ascenseur",
  "residence_id": 1,
  "prestataire_id": 1,
  "montant": 24000.00,
  "date_debut": "2026-03-01",
  "date_fin": "2027-02-28",
  "renouvellement_auto": false
}
```

Types valides : `maintenance` | `nettoyage` | `gardiennage` | `ascenseur` | `autre`

---

## 12. Budgets

`auth:sanctum` · `role:manager|gestionnaire`

### GET /api/gestionnaire/budgets

**Query params :** `residence_id`, `exercice_id`

---

### POST /api/gestionnaire/budgets

**Body**
```json
{ "residence_id": 1, "exercice_id": 1 }
```

---

### POST /api/gestionnaire/budgets/{id}/approuver

---

### POST /api/gestionnaire/budgets/{id}/postes
Ajouter un poste budgétaire. Deux modes disponibles :

**Mode simple** (montant saisi manuellement) :
```json
{
  "categorie": "gardiennage",
  "description": "Salaire gardien + charges",
  "montant_prevu": 60000.00,
  "montant_realise": 25000.00
}
```

**Mode détaillé avec prestataire** (montant calculé automatiquement) :
```json
{
  "categorie": "entretien",
  "description": "Maintenance ascenseurs",
  "prestataire_id": 1,
  "contrat_id": 1,
  "nombre": 1,
  "prix_unitaire": 1500.00,
  "date_debut": "2026-01-01",
  "date_fin": "2026-12-31"
}
```

> Le backend calcule : `cout_mensuel = nombre × prix_unitaire`, `nb_mois` depuis les dates, `montant_prevu = cout_mensuel × nb_mois`.
> `prestataire_id`, `contrat_id`, `nombre`, `prix_unitaire`, `date_debut`, `date_fin` sont tous optionnels — compatibles avec l'ancien format.

**Response** (poste créé) :
```json
{
  "id": 1,
  "categorie": "entretien",
  "description": "Maintenance ascenseurs",
  "montant_prevu": 18000.00,
  "montant_realise": 0,
  "prestataire_id": 1,
  "prestataire": { "id": 1, "nom": "Atlas Ascenseurs SARL" },
  "contrat_id": 1,
  "contrat": { "id": 1, "titre": "Contrat maintenance 2026" },
  "nombre": 1,
  "prix_unitaire": 1500.00,
  "cout_mensuel": 1500.00,
  "nb_mois": 12,
  "date_debut": "2026-01-01",
  "date_fin": "2026-12-31"
}
```

Catégories valides : `entretien` | `gardiennage` | `nettoyage` | `administratif` | `travaux` | `assurance` | `autre`

---

### PUT /api/gestionnaire/budgets/{id}/postes/{poste}
### DELETE /api/gestionnaire/budgets/{id}/postes/{poste}

---

## 13. Documents

`auth:sanctum` · `role:manager|gestionnaire`

> Upload : `Content-Type: multipart/form-data`

### GET /api/gestionnaire/documents

**Query params :** `residence_id`, `type`

---

### POST /api/gestionnaire/documents

| Champ | Type | Requis | Description |
|---|---|---|---|
| `nom` | string | ✅ | Nom du document |
| `type` | string | ✅ | `reglement` \| `pv_ag` \| `contrat` \| `facture` \| `autre` |
| `residence_id` | integer | — | Null = document global cabinet |
| `file` | file | ✅ | PDF · max 10 MB |
| `date` | date | — | Date du document |

---

### DELETE /api/gestionnaire/documents/{id}

---

## 14. Assemblées Générales

`auth:sanctum` · `role:manager|gestionnaire`

### GET /api/gestionnaire/assemblees

**Query params :** `residence_id`, `statut` (`planifiee`|`tenue`|`annulee`)

---

### POST /api/gestionnaire/assemblees

**Body**
```json
{
  "titre": "AG Ordinaire 2026",
  "type": "ordinaire",
  "residence_id": 1,
  "date": "2026-06-14T15:00:00",
  "lieu": "Salle de réunion RDC",
  "quorum_requis": 50,
  "ordre_du_jour": "Approbation comptes 2025\nBudget 2026\nQuestions diverses"
}
```

Types valides : `ordinaire` | `extraordinaire`

---

## 15. Super Admin

`auth:sanctum` · `role:super_admin`

### GET /api/admin/tenants
### POST /api/admin/tenants

**Body**
```json
{
  "name": "Blanca Syndic",
  "subdomain": "blanca",
  "plan": "business",
  "manager_name": "Mohammed Fikri",
  "manager_email": "fikri@blancasyndic.ma",
  "manager_phone": "+212600000001"
}
```

### PUT /api/admin/tenants/{id}
### DELETE /api/admin/tenants/{id}

---

## HTTP Status Codes

| Code | Usage |
|---|---|
| 200 | OK |
| 201 | Created |
| 202 | Accepted (job async en file) |
| 204 | No Content (delete) |
| 401 | Non authentifié |
| 403 | Rôle insuffisant ou compte désactivé |
| 404 | Ressource non trouvée |
| 422 | Erreur de validation |
| 429 | Trop de tentatives (rate limit) |
| 500 | Erreur serveur |

---

## Notifications (async, toujours via Job)

| Événement | Canal | Destinataire |
|---|---|---|
| Code d'accès résident généré | WhatsApp (simulé log) | Résident |
| Appel de fonds envoyé | WhatsApp → SMS | Tous copropriétaires de la résidence |
| Relance impayé auto (J+7, J+15, J+30) | WhatsApp → SMS | Copropriétaire impayé |
| Relance impayé manuelle | WhatsApp | Copropriétaire impayé |
| Ticket créé | WhatsApp | Gestionnaire assigné |
| Ticket résolu | WhatsApp | Copropriétaire concerné |
| Annonce publiée | WhatsApp push | Résidents de la résidence |

> WhatsApp = priorité 1. SMS = fallback. Les envois sont toujours asynchrones via Laravel Horizon.
> Twilio BSP — compte actif, sender `+212704768521` online. Templates Meta en cours d'approbation.

### Couche notifications (architecture interne)

`NotificationManager` route chaque message vers une chaîne de providers définie
dans `config/notifications.php` (fallback automatique), et logge chaque tentative
dans `notifications_log` (`statut`: `envoye` | `echec` | `skipped`).

**Méthodes :**
- `send(NotificationMessage)` — synchrone, 1 canal, avec fallback.
- `sendMany(iterable<NotificationMessage>)` — fan-out multi-canal (1 message pré-rendu par canal, car le corps diffère : SMS court, WhatsApp = template, Email long).
- `queue()` / `queueMany()` — versions asynchrones via `SendNotificationJob` (Horizon).

**Préférences utilisateur (`users.notification_prefs`, opt-out, défaut activé) :**
catégories `paiement` | `ticket` | `assemblee` | `retard`. Si une catégorie est
désactivée, le message portant `category: <cat>` est ignoré (`statut: skipped`, pas d'envoi).

**Toujours envoyés malgré les prefs :**
- Messages sans catégorie (`category: null`) — transactionnels/sécurité (OTP, onboarding).
- Messages légaux avec `force: true` — mise en demeure (Art. 25), convocation AG (Art. 16quinquies).

**WhatsApp hors fenêtre 24h :** obligatoirement un template Meta approuvé. Le caller
passe le Content SID + variables via `meta: ['content_sid' => ..., 'content_variables' => [...]]`.
SIDs résolus depuis `config('notifications.whatsapp_templates.<name>')`.

---

## Comptes de démo

| Rôle | Email | Mot de passe |
|---|---|---|
| Manager | fikri@blancasyndic.ma | imaro2026 |
| Gestionnaire 1 | alaoui@blancasyndic.ma | imaro2026 |
| Gestionnaire 2 | mansouri@blancasyndic.ma | imaro2026 |
| Conseil | elfassi@email.ma | imaro2026 |
| Résident | +212600000010 | Générer via `POST /gestionnaire/coproprietaires/1/generate-code` |

---

---

> DevOps flow complet : voir [docs/devops.md](./devops.md)

---

*Last updated: 2026-05-21 — hiérarchie GH > Immeuble > Lot, mode cotisation fixe/tantième, postes budgétaires avec prestataire et calcul automatique*
