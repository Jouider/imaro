# Imaro — Backend Progress (2026-05-21)

> **Pour Mouad** — ce fichier récapitule l'état exact du backend : tous les endpoints disponibles, les formats de réponse réels, les champs à connaître, et ce qui n'est pas encore implémenté.

---

## Stack & démarrage

```bash
cd backend
php artisan serve          # http://localhost:8000
php artisan migrate        # migrations
php artisan db:seed --class=DemoSeeder  # données démo
php artisan storage:link   # OBLIGATOIRE — rend les fichiers uploadés accessibles via URL
```

Base URL dev : `http://localhost:8000/api`

---

## Auth

| Méthode | Endpoint | Corps |
|---|---|---|
| POST | `/api/auth/otp/request` | `{ "phone": "+212600000001" }` |
| POST | `/api/auth/otp/verify` | `{ "phone": "+212600000001", "otp": "123456" }` |
| GET | `/api/auth/me` | — (Bearer token) |
| POST | `/api/auth/logout` | — (Bearer token) |

Réponse verify :
```json
{
  "status": "success",
  "data": {
    "token": "1|abc...",
    "user": { "id": 1, "name": "Mohammed Fikri", "role": "gestionnaire" }
  }
}
```

> **Dev bypass** : en DEV le DemoSeeder crée un gestionnaire avec phone `+212600000001`. L'OTP loggué dans `storage/logs/laravel.log`.

---

## Enveloppe API

```json
{ "status": "success", "data": { ... } }
{ "status": "error", "message": "...", "errors": { "field": ["msg"] } }
```

Toutes les listes sont complètes (pas de pagination forcée). Le champ `meta` est présent sur certains endpoints mais le frontend peut l'ignorer.

---

## Gestionnaire — tous les endpoints

> Header requis : `Authorization: Bearer {token}` + `Accept: application/json`

### Dashboard
```
GET /api/gestionnaire/dashboard
```
```json
{
  "kpi": {
    "nb_residences": 1,
    "nb_coproprietaires": 20,
    "ca_mensuel": 18000,
    "total_impayes": 6000
  },
  "top_impayes": [
    { "coproprietaire": { "id": 1, "name": "Hassan Benali" }, "lot": "A101", "montant": 1200, "jours": 45 }
  ],
  "tickets_urgents": [
    { "id": 1, "titre": "Fuite ascenseur", "priorite": "urgent", "statut": "ouvert", "residence": { "id": 1, "name": "Résidence Atlas" }, "created_at": "2026-05-10T08:00:00Z" }
  ],
  "assemblees_a_venir": [
    { "id": 1, "titre": "AG Ordinaire 2026", "date": "2026-06-15T10:00:00Z", "residence": { "name": "Résidence Atlas" } }
  ]
}
```

---

### Résidences
```
GET  /api/gestionnaire/residences
GET  /api/gestionnaire/residences/:id
PUT  /api/gestionnaire/residences/:id
```
```json
{
  "id": 1,
  "name": "Résidence Atlas",
  "adresse": "123 Bd Anfa",
  "ville": "Casablanca",
  "nb_lots": 20,
  "total_tantieme": 1000,
  "taux_recouvrement": 75.0,
  "mode_cotisation": "tantieme",
  "cotisation_mensuelle": null,
  "exercice_actif": { "id": 1, "annee": 2026, "statut": "actif" },
  "groupes_habitations": [...],
  "immeubles": [...]
}
```

> **`mode_cotisation`** : `"tantieme"` (prorata sur 1000) ou `"fixe"` (même montant pour tous les lots). Si `"fixe"`, `cotisation_mensuelle` contient le montant par lot (ex : 2500 DH).

---

### Groupes d'habitation (Tranches)
> Optionnel — à utiliser uniquement pour les grandes résidences avec plusieurs tranches.

```
GET    /api/gestionnaire/residences/:id/groupes-habitations
POST   /api/gestionnaire/residences/:id/groupes-habitations
PUT    /api/gestionnaire/residences/:id/groupes-habitations/:gh_id
DELETE /api/gestionnaire/residences/:id/groupes-habitations/:gh_id
```
```json
{
  "id": 1,
  "nom": "Tranche A",
  "description": "Bâtiment Nord",
  "total_tantieme": 1000,
  "immeubles": [...]
}
```
Corps POST/PUT : `{ nom, description?, total_tantieme? }`

> Si une résidence a des GH, les budgets/exercices/appels de fonds sont gérés **par GH** (pas au niveau résidence).

---

### Immeubles
```
GET    /api/gestionnaire/residences/:id/immeubles
POST   /api/gestionnaire/residences/:id/immeubles
PUT    /api/gestionnaire/residences/:id/immeubles/:immeuble_id
DELETE /api/gestionnaire/residences/:id/immeubles/:immeuble_id
GET    /api/gestionnaire/immeubles/:immeuble_id/lots
```
```json
{
  "id": 1,
  "nom": "Immeuble A",
  "adresse": null,
  "nb_etages": 4,
  "nb_lots": 16,
  "groupe_habitation_id": 1,
  "groupe_habitation": { "id": 1, "nom": "Tranche A" }
}
```
Corps POST : `{ nom, groupe_habitation_id?, adresse?, nb_etages? }`

---

### Lots
```
GET    /api/gestionnaire/residences/:id/lots   → { lots: [...], total_tantieme: 1000, sum_tantieme: 1000 }
GET    /api/gestionnaire/immeubles/:id/lots    → { lots: [...] }
POST   /api/gestionnaire/residences/:id/lots
PUT    /api/gestionnaire/lots/:id
DELETE /api/gestionnaire/lots/:id
```
```json
{
  "id": 1,
  "numero": "A101",
  "type": "appartement",
  "etage": 1,
  "superficie": 85.5,
  "tantieme": 120,
  "immeuble_id": 1,
  "immeuble": { "id": 1, "nom": "Immeuble A" },
  "proprietaire": { "id": 1, "name": "Hassan Benali" }
}
```
Corps POST : `{ numero, type, etage, superficie, tantieme, immeuble_id }` ← **`immeuble_id` maintenant obligatoire**

---

### Copropriétaires
```
GET /api/gestionnaire/residences/:id/coproprietaires
GET /api/gestionnaire/coproprietaires
```
```json
{
  "id": 1,
  "name": "Hassan Benali",
  "phone": "+212661000001",
  "email": "hassan@email.com",
  "solde": -1200,
  "lot": { "id": 1, "numero": "A101", "type": "appartement", "tantieme": 120 }
}
```

---

### Exercices
```
GET  /api/gestionnaire/residences/:id/exercices
POST /api/gestionnaire/residences/:id/exercices
POST /api/gestionnaire/residences/:id/exercices/:exercice_id/cloture
```
```json
{ "id": 1, "annee": 2026, "statut": "actif", "date_debut": "2026-01-01", "date_fin": "2026-12-31" }
```
Corps POST : `{ annee, date_debut, date_fin }`

---

### Appels de fonds
```
GET  /api/gestionnaire/appels-fonds
POST /api/gestionnaire/appels-fonds
PUT  /api/gestionnaire/appels-fonds/:id
GET  /api/gestionnaire/appels-fonds/:id
POST /api/gestionnaire/appels-fonds/:id/envoyer
```
```json
{
  "id": 1,
  "titre": "Charges Q1 2026",
  "reference": "AF-2026-001",
  "residence": { "id": 1, "name": "Résidence Atlas" },
  "exercice": { "id": 1, "annee": 2026 },
  "description": "Charges trimestrielles",
  "montant_total": 24000,
  "montant_recouvre": 18000,
  "taux_recouvrement": 75.0,
  "date_echeance": "2026-03-31",
  "statut": "envoye"
}
```
Corps POST : `{ titre, residence_id, exercice_id?, montant_total, date_echeance, description? }`

> Les lignes par tantième sont **auto-générées** au POST. `taux_recouvrement` est calculé côté backend.

---

### Paiements & Impayés
```
GET  /api/gestionnaire/paiements
POST /api/gestionnaire/paiements
GET  /api/gestionnaire/impayes
```
```json
{
  "id": 1,
  "reference": "PAY-2026-001",
  "date_paiement": "2026-02-15",
  "montant": 1000,
  "mode": "virement",
  "coproprietaire": { "id": 1, "name": "Hassan Benali", "lot": { "numero": "A101" } }
}
```
Impayé :
```json
{
  "coproprietaire": { "id": 1, "name": "Hassan Benali" },
  "lot": { "numero": "A101" },
  "residence": { "name": "Résidence Atlas" },
  "montant_du": 2400,
  "montant_restant": 1200,
  "jours_retard": 45
}
```

---

### Tickets
```
GET  /api/gestionnaire/tickets          ?statut=ouvert&priorite=urgent
GET  /api/gestionnaire/tickets/:id
PUT  /api/gestionnaire/tickets/:id      { statut: "ouvert"|"en_cours"|"resolu" }
POST /api/gestionnaire/tickets/:id/clos
```
```json
{
  "id": 1,
  "description": "Fuite d'eau couloir B2",
  "categorie": "plomberie",
  "priorite": "urgent",
  "statut": "en_cours",
  "images": ["http://localhost:8000/storage/tickets/photo1.jpg"],
  "residence": { "id": 1, "name": "Résidence Atlas" },
  "lot": { "id": 1, "numero": "A101" },
  "user": { "id": 1, "name": "Hassan Benali" },
  "created_at": "2026-05-10T08:00:00Z",
  "updated_at": "2026-05-12T14:00:00Z"
}
```

---

### Assemblées
```
GET  /api/gestionnaire/assemblees
POST /api/gestionnaire/assemblees
```
```json
{
  "id": 1,
  "titre": "AG Ordinaire 2026",
  "type": "ordinaire",
  "date": "2026-06-15T10:00:00Z",
  "lieu": "Salle RDC",
  "statut": "convoquee",
  "quorum_requis": 50,
  "quorum_atteint": false,
  "participants_count": null,
  "ordre_du_jour": ["Approbation des comptes 2025", "Budget prévisionnel 2026"],
  "residence": { "id": 1, "name": "Résidence Atlas" }
}
```
Corps POST : `{ titre, type, residence_id, date, lieu?, quorum_requis?, ordre_du_jour? }`

> `ordre_du_jour` : envoyer soit un `string` (une entrée par ligne `\n`), soit ne pas l'envoyer. Retourné en `string[]`.

---

### Annonces
```
GET    /api/gestionnaire/annonces        ?statut=publiee&residence_id=1
POST   /api/gestionnaire/annonces
PUT    /api/gestionnaire/annonces/:id
POST   /api/gestionnaire/annonces/:id/publier
POST   /api/gestionnaire/annonces/:id/archiver
DELETE /api/gestionnaire/annonces/:id
```
```json
{
  "id": 1,
  "titre": "Travaux ascenseur",
  "contenu": "L'ascenseur sera hors service le 20 mai.",
  "priorite": "urgente",
  "statut": "publiee",
  "date_publication": "2026-05-10",
  "publiee_at": "2026-05-10T09:00:00Z",
  "nb_lectures": 0,
  "residence": { "id": 1, "name": "Résidence Atlas" }
}
```
Corps POST/PUT : `{ titre, contenu, priorite?, residence_id? }`

> `residence` est `null` si l'annonce s'applique à toutes les résidences. `nb_lectures` retourne `0` pour l'instant (table `lectures_annonce` sprint 3).

---

### Prestataires
```
GET  /api/gestionnaire/prestataires      ?statut=actif&specialite=ascenseurs
POST /api/gestionnaire/prestataires
PUT  /api/gestionnaire/prestataires/:id
```
```json
{
  "id": 1,
  "name": "Ascenseurs Maroc SARL",
  "specialite": "ascenseurs",
  "phone": "+212522000001",
  "email": "contact@asc-maroc.ma",
  "adresse": null,
  "note_satisfaction": 4.2,
  "nb_interventions": 12,
  "statut": "actif"
}
```
Corps POST : `{ nom, telephone, specialite, email? }`
Corps PUT : `{ nom?, telephone?, specialite?, email?, statut? }`

> Champ `adresse` présent dans la réponse mais non stocké en DB pour l'instant — retourne `null`. Si tu en as besoin dis-moi.

---

### Contrats
```
GET  /api/gestionnaire/contrats          ?residence_id=1&statut=actif
POST /api/gestionnaire/contrats
```
```json
{
  "id": 1,
  "titre": "Contrat maintenance ascenseurs 2026",
  "type_contrat": "maintenance",
  "montant_annuel": 18000,
  "date_debut": "2026-01-01",
  "date_fin": "2026-12-31",
  "statut": "actif",
  "renouvellement_auto": false,
  "jours_avant_expiration": 229,
  "residence": { "id": 1, "name": "Résidence Atlas" },
  "prestataire": { "id": 1, "name": "Ascenseurs Maroc SARL", "specialite": "ascenseurs" }
}
```
Corps POST : `{ titre, type, residence_id, prestataire_id, montant, date_debut, date_fin }`

Types valides : `maintenance` | `nettoyage` | `gardiennage` | `ascenseur` | `autre`

---

### Budgets
```
GET    /api/gestionnaire/budgets?residence_id=1&exercice_id=1   → { budget: Budget | null }
POST   /api/gestionnaire/budgets
POST   /api/gestionnaire/budgets/:id/approuver
POST   /api/gestionnaire/budgets/:id/postes
PUT    /api/gestionnaire/budgets/:id/postes/:poste_id
DELETE /api/gestionnaire/budgets/:id/postes/:poste_id
```
```json
{
  "id": 1,
  "statut": "brouillon",
  "total_prevu": 120000,
  "total_realise": 84000,
  "taux_execution": 70,
  "exercice": { "id": 1, "annee": 2026 },
  "residence": { "id": 1, "name": "Résidence Atlas" },
  "postes": [
    {
      "id": 1,
      "categorie": "entretien",
      "description": "Maintenance ascenseurs",
      "montant_prevu": 18000,
      "montant_realise": 18000,
      "prestataire_id": 1,
      "prestataire": { "id": 1, "nom": "Atlas Ascenseurs SARL" },
      "contrat_id": 1,
      "contrat": { "id": 1, "titre": "Contrat maintenance 2026" },
      "nombre": 12,
      "prix_unitaire": 1500.00,
      "cout_mensuel": 1500.00,
      "nb_mois": 12,
      "date_debut": "2026-01-01",
      "date_fin": "2026-12-31"
    }
  ]
}
```
Corps POST budget : `{ residence_id, exercice_id }`

Corps POST/PUT poste — **2 modes** :

**Mode simple** (montant direct) :
```json
{ "categorie": "entretien", "description": "...", "montant_prevu": 18000, "montant_realise": 0 }
```

**Mode détaillé** (calcul automatique) :
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
> Le backend calcule automatiquement : `cout_mensuel = nombre × prix_unitaire`, `nb_mois` depuis les dates, `montant_prevu = cout_mensuel × nb_mois`.

Catégories : `entretien` | `gardiennage` | `nettoyage` | `administratif` | `travaux` | `assurance` | `autre`

---

### Documents
```
GET    /api/gestionnaire/documents       ?type=reglement&residence_id=1
POST   /api/gestionnaire/documents       (multipart/form-data)
DELETE /api/gestionnaire/documents/:id
```
```json
{
  "id": 1,
  "nom": "Règlement de copropriété 2024",
  "type": "reglement",
  "date": "2024-01-15",
  "taille_ko": 1240,
  "url": "http://localhost:8000/storage/documents/reglement.pdf",
  "residence": { "id": 1, "name": "Résidence Atlas" }
}
```
Corps POST (multipart) :
```
nom          = "Règlement..."
type         = "reglement"
file         = <fichier>       (max 20 Mo — pdf, jpg, png, doc, docx)
residence_id = 1               (optionnel)
date         = "2024-01-15"    (optionnel)
```
Types valides : `reglement` | `pv_ag` | `contrat` | `facture` | `autre`

> **Important** : appeler `php artisan storage:link` une fois pour que les URLs fonctionnent en dev.

---

## Portail copropriétaire — tous les endpoints

> Rôle requis : `resident` | Header : `Authorization: Bearer {token}`

### Dashboard
```
GET /api/portail/dashboard
```
```json
{
  "balance": -1200,
  "statut": "en_retard",
  "prochain_appel": { "montant": 1000, "date": "2026-06-01" }
}
```
`statut` : `"a_jour"` | `"en_retard"` — `prochain_appel` peut être `null`

---

### Opérations
```
GET /api/portail/operations
```
```json
{
  "id": 1,
  "type": "paiement",
  "libelle": "Paiement charges",
  "montant": 1000,
  "date": "2026-02-15T00:00:00Z",
  "statut": "valide",
  "recu_url": "http://localhost:8000/storage/recus/001.pdf"
}
```
`type` : `"paiement"` (montant +) | `"appel_fonds"` (montant -)

---

### Annonces portail
```
GET /api/portail/annonces
```
```json
{ "id": 1, "titre": "Travaux ascenseur", "contenu": "...", "priorite": "urgente", "date": "2026-05-15T00:00:00Z" }
```

---

### Assemblées portail
```
GET /api/portail/assemblees
```
```json
{
  "id": 1,
  "titre": "AG Ordinaire 2026",
  "type": "ordinaire",
  "date": "2026-06-15T10:00:00Z",
  "lieu": "Salle RDC",
  "statut": "convoquee",
  "quorum_requis": 50,
  "ordre_du_jour": ["Approbation des comptes 2025", "Budget 2026"]
}
```

---

### Réclamations portail
```
GET  /api/portail/reclamations
POST /api/portail/reclamations   (multipart/form-data)
```
```json
{
  "id": 1,
  "categorie": "plomberie",
  "description": "Fuite d'eau",
  "statut": "ouvert",
  "priorite": "normale",
  "photos": ["http://localhost:8000/storage/tickets/photo1.jpg"],
  "created_at": "2026-05-10T08:00:00Z"
}
```
Corps POST (multipart) :
```
titre       = "Fuite d'eau"
description = "..."
categorie   = "plomberie"
photos[]    = <fichier>    (jusqu'à 5, max 5 Mo chacune)
```
Catégories : `plomberie` | `electricite` | `ascenseur` | `nettoyage` | `securite` | `autre`

---

### Documents portail
```
GET /api/portail/documents
```
```json
{ "id": 1, "nom": "Règlement copropriété", "type": "reglement", "date": "2024-01-15", "taille_ko": 1240, "url": "http://localhost:8000/storage/documents/reglement.pdf" }
```
> Retourne uniquement les documents de la résidence du résident + les documents globaux (sans résidence).

---

### Profil portail
```
GET /api/portail/profil
PUT /api/portail/profil    { name?, email? }
```
```json
{
  "id": 1,
  "name": "Hassan Benali",
  "phone": "+212661000001",
  "email": "hassan@email.com",
  "lot": { "id": 1, "numero": "A101", "type": "appartement", "etage": 1, "superficie": 85.5 },
  "residence": { "id": 1, "name": "Résidence Atlas", "adresse": "123 Bd Anfa, Casablanca" }
}
```

---

### Appels de fonds — mise à jour
Le champ `groupe_habitation_id` est maintenant accepté dans le POST. Si la résidence a des GH (tranches), passer `groupe_habitation_id` pour scoper l'appel à une tranche uniquement.

**Calcul auto adaptatif** :
- `mode_cotisation = "tantieme"` → `montant_du = montant_total × (lot.tantieme / total_tantieme_scope)`
- `mode_cotisation = "fixe"` → `montant_du = montant_total / nb_lots_scope`

---

## Ce qui n'est pas encore implémenté (sprint 3)

| Fonctionnalité | Raison |
|---|---|
| `nb_lectures` sur annonces | Table `lectures_annonce` prévue sprint 3 — retourne `0` pour l'instant |
| `participants_count` sur assemblées | Retourne `null` pour l'instant |
| Notifications WhatsApp | Bloqué KAN-16 (Meta approval 7-14 jours) |
| PDF reçus paiements | Async Job — non déclenché en dev |
| GED (travaux, dossiers) | Sprint 3 |
| Assemblées générales (votes) | Sprint 3 |
| Invite résident par email | Sprint 3 |

---

## Notes pour le dev frontend

- **Storage URL dev** : `http://localhost:8000/storage/...` (après `php artisan storage:link`)
- **CORS** : `*` configuré — pas de blocage en dev ni sur Vercel preview
- **Auth OTP dev** : OTP visible dans `backend/storage/logs/laravel.log`
- **Données démo** : `php artisan migrate:fresh --seed` — 2 résidences, 30 lots, 1 exercice actif 2026
  - **Résidence Atlas** (Casablanca, 20 lots) : mode tantième — 2 tranches (Tranche A : 16 lots, Tranche B : 4 lots)
  - **Résidence Anfa Gardens** (Casablanca, 10 lots) : mode fixe 2500 DH/lot — 1 immeuble, pas de tranche
- **Rôles disponibles en démo** : `gestionnaire` (Mohammed Fikri, +212600000001) et `resident` (Hassan Benali, +212661000001)
