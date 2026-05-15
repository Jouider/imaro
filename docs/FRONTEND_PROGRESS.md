# Imaro — Frontend Progress (2026-05-15)

> **Pour Abdellah** — ce fichier récapitule ce qui est construit côté frontend, les endpoints API attendus pour chaque page, et le format exact des réponses.

---

## Stratégie mock

Toutes les fonctions de service utilisent le pattern suivant :

```typescript
async function withMock<T>(call: () => Promise<T>, mock: T): Promise<T> {
  if (!import.meta.env.DEV) return call()
  try { return await call() } catch { return mock }
}
```

- **En DEV** : appelle l'API réelle ; si elle échoue (réseau inaccessible), retourne les données mock silencieusement.
- **En production** : appelle toujours l'API réelle, les erreurs se propagent normalement.

Quand ton backend local est démarré, le frontend se connecte dessus automatiquement.

---

## Espaces

| Espace | URL | Guard |
|---|---|---|
| Portail copropriétaire | `/portail/*` | `PortailGuard` (token Sanctum) |
| Gestionnaire | `/gestionnaire/*` | `GestionnaireGuard` (token Sanctum) |

Auth : OTP par WhatsApp → `POST /api/auth/otp/request` + `POST /api/auth/otp/verify` → token Sanctum dans `localStorage`.

---

## Pages gestionnaire — état

| Page | Route | Fichier | État |
|---|---|---|---|
| Dashboard | `/gestionnaire/dashboard` | `DashboardPage.tsx` | ✅ UI + mock |
| Résidences (liste) | `/gestionnaire/residences` | `residences/ResidencesPage.tsx` | ✅ UI + mock |
| Résidence (détail) | `/gestionnaire/residences/:id` | `residences/ResidencePage.tsx` | ✅ UI + mock |
| Copropriétaires | `/gestionnaire/coproprietaires` | `CoproprietairesPage.tsx` | ✅ UI + mock |
| Appels de fonds | `/gestionnaire/appels-fonds` | `AppelsFondsPage.tsx` | ✅ UI + mock |
| Paiements | `/gestionnaire/paiements` | `PaiementsPage.tsx` | ✅ UI + mock |
| Tickets | `/gestionnaire/tickets` | `TicketsPage.tsx` | ✅ UI + mock |
| Assemblées | `/gestionnaire/assemblees` | `AssembleesPage.tsx` | ✅ UI + mock |
| Annonces | `/gestionnaire/annonces` | `AnnoncesPage.tsx` | ✅ UI + mock |
| Prestataires & Contrats | `/gestionnaire/prestataires` | `PrestatairesPage.tsx` | ✅ UI + mock |
| Budgets | `/gestionnaire/budgets` | `BudgetsPage.tsx` | ✅ UI + mock |

---

## Endpoints attendus — Gestionnaire

### Auth

| Méthode | Endpoint | Corps / Params |
|---|---|---|
| POST | `/api/auth/otp/request` | `{ phone: "+212..." }` |
| POST | `/api/auth/otp/verify` | `{ phone, otp }` → `{ token, user: { id, name, role } }` |

### Dashboard

```
GET /api/gestionnaire/dashboard
```

Réponse attendue :
```json
{
  "status": "success",
  "data": {
    "kpi": {
      "nb_residences": 5,
      "nb_coproprietaires": 124,
      "ca_mensuel": 48200,
      "total_impayes": 12400
    },
    "top_impayes": [
      { "coproprietaire": { "id": 1, "name": "Mohammed Alami" }, "lot": "A12", "montant": 2400, "jours": 45 }
    ],
    "tickets_urgents": [
      { "id": 1, "titre": "Fuite eau...", "priorite": "urgent", "statut": "ouvert", "residence": { "id": 1, "name": "Atlas Casablanca" }, "created_at": "2026-05-10T10:00:00Z" }
    ],
    "assemblees_a_venir": [
      { "id": 1, "titre": "AG Ordinaire", "date": "2026-06-15T10:00:00Z", "residence": { "name": "Atlas Casablanca" } }
    ]
  }
}
```

### Résidences

```
GET  /api/gestionnaire/residences              → { residences: Residence[] }
GET  /api/gestionnaire/residences/:id          → { residence: Residence }
```

Type `Residence` :
```json
{
  "id": 1,
  "name": "Atlas Casablanca",
  "adresse": "123 Bd Anfa",
  "ville": "Casablanca",
  "nb_lots": 24,
  "taux_recouvrement": 87,
  "exercice_actif": { "id": 1, "annee": 2026, "statut": "actif" }
}
```

### Lots

```
GET    /api/gestionnaire/residences/:id/lots   → { lots: Lot[] }
POST   /api/gestionnaire/residences/:id/lots   → { lot: Lot }
PUT    /api/gestionnaire/lots/:id              → { lot: Lot }
DELETE /api/gestionnaire/lots/:id              → 204
```

Type `Lot` :
```json
{
  "id": 1,
  "numero": "A101",
  "type": "appartement",
  "etage": 1,
  "superficie": 85.5,
  "tantieme": 120,
  "proprietaire": { "id": 1, "name": "Karim Benali" }
}
```

Corps POST/PUT :
```json
{ "numero": "A101", "type": "appartement", "etage": 1, "superficie": 85.5, "tantieme": 120 }
```

### Copropriétaires

```
GET /api/gestionnaire/residences/:id/coproprietaires → { coproprietaires: Coproprietaire[] }
```

Type `Coproprietaire` :
```json
{
  "id": 1,
  "name": "Karim Benali",
  "phone": "+212661000001",
  "lot": { "id": 1, "numero": "A101" },
  "solde": -1200
}
```

### Exercices

```
GET  /api/gestionnaire/residences/:id/exercices  → { exercices: Exercice[] }
POST /api/gestionnaire/residences/:id/exercices  → { exercice: Exercice }
```

Type `Exercice` :
```json
{ "id": 1, "annee": 2026, "statut": "actif", "date_debut": "2026-01-01", "date_fin": "2026-12-31" }
```

### Appels de fonds

```
GET  /api/gestionnaire/appels-fonds             → { appels_fonds: AppelFonds[] }
POST /api/gestionnaire/appels-fonds             → { appel_fonds: AppelFonds }
POST /api/gestionnaire/appels-fonds/:id/envoyer → { appel_fonds: AppelFonds }
```

Type `AppelFonds` :
```json
{
  "id": 1,
  "reference": "AF-2026-001",
  "residence": { "id": 1, "name": "Atlas Casablanca" },
  "exercice": { "id": 1, "annee": 2026 },
  "description": "Charges Q1 2026",
  "montant_total": 24000,
  "montant_recouvre": 18000,
  "echeance": "2026-03-31",
  "statut": "envoye"
}
```

Corps POST :
```json
{ "residence_id": 1, "exercice_id": 1, "description": "Charges Q1", "montant_total": 24000, "echeance": "2026-03-31" }
```

### Paiements

```
GET  /api/gestionnaire/paiements   → { paiements: Paiement[] }
POST /api/gestionnaire/paiements   → { paiement: Paiement }
```

Type `Paiement` :
```json
{
  "id": 1,
  "reference": "PAY-2026-001",
  "date": "2026-02-15",
  "coproprietaire": { "id": 1, "name": "Karim Benali" },
  "lot": { "id": 1, "numero": "A101" },
  "appel_fonds": { "id": 1, "reference": "AF-2026-001" },
  "montant": 1000,
  "mode": "virement",
  "notes": ""
}
```

### Impayés

```
GET /api/gestionnaire/impayes → { impayes: Impaye[] }
```

Type `Impaye` :
```json
{
  "coproprietaire": { "id": 1, "name": "Karim Benali" },
  "lot": { "numero": "A101" },
  "residence": { "name": "Atlas Casablanca" },
  "montant_du": 2400,
  "montant_restant": 1200,
  "jours_retard": 45
}
```

### Tickets

```
GET  /api/gestionnaire/tickets        → { tickets: Ticket[] }
GET  /api/gestionnaire/tickets/:id    → { ticket: Ticket }
PUT  /api/gestionnaire/tickets/:id    → { ticket: Ticket }
POST /api/gestionnaire/tickets/:id/clos → { ticket: Ticket }
```

Type `Ticket` :
```json
{
  "id": 1,
  "reference": "TK-2026-001",
  "titre": "Fuite d'eau dans le couloir",
  "description": "Fuite importante...",
  "categorie": "plomberie",
  "priorite": "urgent",
  "statut": "en_cours",
  "residence": { "id": 1, "name": "Atlas Casablanca" },
  "coproprietaire": { "id": 1, "name": "Karim Benali" },
  "photos": ["https://..."],
  "created_at": "2026-05-10T08:00:00Z",
  "updated_at": "2026-05-12T14:00:00Z"
}
```

Params GET (query string) : `statut`, `priorite`

Corps PUT : `{ statut: "en_cours" | "resolu" | "ouvert" }`

### Assemblées générales

```
GET  /api/gestionnaire/assemblees  → { assemblees: Assemblee[] }
POST /api/gestionnaire/assemblees  → { assemblee: Assemblee }
```

Type `Assemblee` :
```json
{
  "id": 1,
  "titre": "AG Ordinaire 2026",
  "type": "ordinaire",
  "residence": { "id": 1, "name": "Atlas Casablanca" },
  "date": "2026-06-15T10:00:00Z",
  "lieu": "Salle de réunion, RDC",
  "statut": "convoquee",
  "quorum_requis": 50,
  "participants_count": null,
  "ordre_du_jour": "1. Approbation des comptes\n2. Budget prévisionnel"
}
```

Corps POST :
```json
{
  "titre": "AG Ordinaire 2026",
  "type": "ordinaire",
  "residence_id": 1,
  "date": "2026-06-15T10:00:00Z",
  "lieu": "Salle de réunion, RDC",
  "quorum_requis": 50,
  "ordre_du_jour": "1. Approbation des comptes\n2. Budget prévisionnel"
}
```

### Annonces

```
GET    /api/gestionnaire/annonces        → { annonces: Annonce[] }
POST   /api/gestionnaire/annonces        → { annonce: Annonce }
PUT    /api/gestionnaire/annonces/:id    → { annonce: Annonce }
POST   /api/gestionnaire/annonces/:id/publier  → { annonce: Annonce }
POST   /api/gestionnaire/annonces/:id/archiver → { annonce: Annonce }
DELETE /api/gestionnaire/annonces/:id   → 204
```

Type `Annonce` :
```json
{
  "id": 1,
  "titre": "Travaux ascenseur — interruption de service",
  "contenu": "L'ascenseur sera hors service...",
  "statut": "publiee",
  "priorite": "urgente",
  "residence": { "id": 1, "name": "Atlas Casablanca" },
  "date_publication": "2026-05-10",
  "created_at": "2026-05-09T14:00:00Z",
  "nb_lectures": 18
}
```

- `residence` peut être `null` si l'annonce s'applique à toutes les résidences.
- Params GET (query string) : `statut`, `residence_id`

### Prestataires

```
GET  /api/gestionnaire/prestataires      → { prestataires: Prestataire[] }
POST /api/gestionnaire/prestataires      → { prestataire: Prestataire }
PUT  /api/gestionnaire/prestataires/:id  → { prestataire: Prestataire }
```

Params GET : `statut`, `specialite`

Type `Prestataire` :
```json
{
  "id": 1,
  "name": "Ascenseurs Maroc SARL",
  "specialite": "ascenseurs",
  "phone": "+212522000001",
  "email": "contact@asc-maroc.ma",
  "adresse": "15 Bd Anfa, Casablanca",
  "note_satisfaction": 4,
  "nb_interventions": 12,
  "statut": "actif"
}
```

### Contrats

```
GET  /api/gestionnaire/contrats      → { contrats: Contrat[] }
POST /api/gestionnaire/contrats      → { contrat: Contrat }
```

Params GET : `residence_id`, `statut`

Type `Contrat` :
```json
{
  "id": 1,
  "titre": "Contrat maintenance ascenseurs 2026",
  "prestataire": { "id": 1, "name": "Ascenseurs Maroc SARL", "specialite": "ascenseurs" },
  "residence": { "id": 1, "name": "Atlas Casablanca" },
  "type_contrat": "maintenance",
  "montant_annuel": 18000,
  "date_debut": "2026-01-01",
  "date_fin": "2026-12-31",
  "statut": "actif",
  "renouvellement_auto": true,
  "jours_avant_expiration": 230
}
```

### Budgets

```
GET  /api/gestionnaire/budgets?residence_id=1&exercice_id=1  → { budget: Budget | null }
POST /api/gestionnaire/budgets                               → { budget: Budget }
POST /api/gestionnaire/budgets/:id/approuver                 → { budget: Budget }
POST /api/gestionnaire/budgets/:id/postes                    → { poste: BudgetPoste }
PUT  /api/gestionnaire/budgets/:id/postes/:poste_id          → { poste: BudgetPoste }
DELETE /api/gestionnaire/budgets/:id/postes/:poste_id        → 204
```

Corps POST budget : `{ residence_id: 1, exercice_id: 1 }`

Type `Budget` :
```json
{
  "id": 1,
  "exercice": { "id": 1, "annee": 2026 },
  "residence": { "id": 1, "name": "Atlas Casablanca" },
  "statut": "brouillon",
  "total_prevu": 120000,
  "total_realise": 84000,
  "postes": [
    {
      "id": 1,
      "categorie": "entretien",
      "description": "Maintenance ascenseurs",
      "montant_prevu": 18000,
      "montant_realise": 18000
    }
  ]
}
```

Corps POST/PUT poste : `{ categorie, description, montant_prevu, montant_realise }`

Catégories attendues : `entretien`, `gardiennage`, `nettoyage`, `administratif`, `travaux`, `assurance`, `autre`

---

## Pages portail copropriétaire — état

| Page | Route | État |
|---|---|---|
| Accueil | `/portail` | ✅ UI + mock — affiche balance, KPIs, prochaines AGs, annonces |
| Actualités | `/portail/actualites` | ✅ UI + mock — onglets Annonces + Assemblées (à venir / passées) |
| Finances | `/portail/finances` | ✅ UI + mock |
| Réclamations | `/portail/reclamations` | ✅ UI + mock — onglet Signaler + onglet Mes réclamations (historique) |
| Profil | `/portail/profil` | ✅ UI + mock |

### Endpoints portail attendus (à implémenter dans `routes/api/resident.php`)

```
GET  /api/portail/dashboard              → voir type ci-dessous
GET  /api/portail/operations             → { operations: Operation[] }
GET  /api/portail/annonces               → { annonces: Annonce[] }
GET  /api/portail/assemblees             → { assemblees: AssembleePortail[] }
GET  /api/portail/reclamations           → { reclamations: Reclamation[] }
POST /api/portail/reclamations           → { reclamation: Reclamation }  (multipart/form-data, champ photos[])
GET  /api/portail/profil                 → { user: ResidentProfile }
PUT  /api/portail/profil                 → { user: ResidentProfile }
GET  /api/portail/paiements              → { paiements, appels_fonds }
```

Type `AssembleePortail` :
```json
{
  "id": 1,
  "titre": "AG Ordinaire 2026",
  "type": "ordinaire",
  "date": "2026-06-15T10:00:00Z",
  "lieu": "Salle de réunion, RDC, Atlas Casablanca",
  "statut": "convoquee",
  "quorum_requis": 50,
  "participants_count": null,
  "ordre_du_jour": ["Approbation des comptes 2025", "Budget prévisionnel 2026"]
}
```

Type `Reclamation` (portail) :
```json
{
  "id": 1,
  "reference": "REC-2026-001",
  "titre": "Fuite d'eau dans le couloir",
  "description": "Description détaillée…",
  "statut": "en_cours",
  "priorite": "urgent",
  "photos": ["https://..."],
  "created_at": "2026-05-10T08:00:00Z"
}
```

Type `ResidentProfile` :
```json
{
  "id": 1,
  "name": "Karim Benali",
  "phone": "+212661000001",
  "email": "karim.benali@email.com",
  "lot": { "numero": "A101", "type": "appartement", "etage": 1, "superficie": 85.5 },
  "residence": { "name": "Atlas Casablanca", "adresse": "123 Bd Anfa, Casablanca" }
}
```

---

## Enveloppe API

Toutes les réponses suivent :

```json
{
  "status": "success",
  "data": { ... }
}
```

Erreurs de validation (422) :
```json
{
  "status": "error",
  "message": "The given data was invalid.",
  "errors": { "field": ["message"] }
}
```

---

## Page d'accueil (landing)

La page `/` est une landing page publique (aucune auth requise) avec :
- Navbar sticky avec deux boutons de connexion distincts (Gestionnaire → `/login`, Copropriétaire → `/portail/login`)
- Hero section avec gradient marine et badge "Loi 18-00 ✓"
- Stats bar, grille de fonctionnalités, section "En 3 étapes", deux cards portails, footer
- Entièrement i18n (FR + AR) — aucun endpoint backend requis pour cette page

---

## Fichiers service frontend

| Fichier | Endpoints qu'il consomme |
|---|---|
| `services/gestionnaire.service.ts` | dashboard, residences, lots, coproprietaires, exercices, appels-fonds, paiements, impayes, tickets, assemblees |
| `services/annonces.service.ts` | annonces CRUD + publier + archiver |
| `services/prestataires.service.ts` | prestataires CRUD + contrats CRUD |
| `services/budgets.service.ts` | budgets GET/POST + approuver + postes CRUD |
| `services/portail.service.ts` | portail dashboard, operations, annonces, assemblees, reclamations (liste + POST), profil |
