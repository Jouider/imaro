# Imaro — Frontend Progress (2026-05-16)

> **Pour Abdellah** — ce fichier récapitule ce qui est construit côté frontend, les endpoints API attendus pour chaque page, et le format exact des réponses. Mis à jour après chaque sprint.

---

## Stratégie mock

Toutes les fonctions de service utilisent le pattern suivant :

```typescript
async function withMock<T>(call: () => Promise<T>, mock: T): Promise<T> {
  if (!import.meta.env.DEV && !import.meta.env.VITE_SHOW_DEV_BYPASS) return call()
  try { return await call() } catch { return mock }
}
```

- **En DEV ou sur Vercel preview** : appelle l'API réelle ; si elle échoue (réseau inaccessible), retourne les données mock silencieusement.
- **En production réelle** : appelle toujours l'API réelle, les erreurs se propagent normalement.

Quand ton backend local est démarré, le frontend se connecte dessus automatiquement via `VITE_API_URL`.

---

## Espaces

| Espace | URL | Guard |
|---|---|---|
| Landing (publique) | `/` | aucun |
| Portail copropriétaire | `/portail/*` | `PortailGuard` (token Sanctum) |
| Gestionnaire | `/gestionnaire/*` | `GestionnaireGuard` (token Sanctum) |

Auth : OTP par WhatsApp → `POST /api/auth/otp/request` + `POST /api/auth/otp/verify` → token Sanctum dans `localStorage`.

---

## Pages gestionnaire — état

| Page | Route | Fichier | État |
|---|---|---|---|
| Dashboard | `/gestionnaire/dashboard` | `DashboardPage.tsx` | ✅ UI + mock |
| Résidences (liste) | `/gestionnaire/residences` | `residences/ResidencesPage.tsx` | ✅ UI + mock |
| Résidence (détail) | `/gestionnaire/residences/:id` | `residences/ResidencePage.tsx` | ✅ UI + mock — onglets Lots / Copropriétaires / Exercices |
| Copropriétaires | `/gestionnaire/coproprietaires` | `CoproprietairesPage.tsx` | ✅ UI + mock |
| Appels de fonds | `/gestionnaire/appels-fonds` | `AppelsFondsPage.tsx` | ✅ UI + mock — aperçu répartition par tantième |
| Paiements | `/gestionnaire/paiements` | `PaiementsPage.tsx` | ✅ UI + mock — onglets Historique / Impayés |
| Tickets | `/gestionnaire/tickets` | `TicketsPage.tsx` | ✅ UI + mock — vue Tableau ET vue Kanban drag-and-drop |
| Assemblées | `/gestionnaire/assemblees` | `AssembleesPage.tsx` | ✅ UI + mock |
| Annonces | `/gestionnaire/annonces` | `AnnoncesPage.tsx` | ✅ UI + mock |
| Prestataires & Contrats | `/gestionnaire/prestataires` | `PrestatairesPage.tsx` | ✅ UI + mock — onglets Prestataires / Contrats |
| Budgets | `/gestionnaire/budgets` | `BudgetsPage.tsx` | ✅ UI + mock — postes, taux exécution, approbation |
| Documents | `/gestionnaire/documents` | `DocumentsPage.tsx` | ✅ UI + mock — CRUD, filtre type/résidence |

---

## Pages portail copropriétaire — état

| Page | Route | État |
|---|---|---|
| Accueil | `/portail` | ✅ — balance, KPIs, rappel prochain paiement, AGs à venir, annonces |
| Actualités | `/portail/actualites` | ✅ — onglets Annonces / Assemblées (à venir + passées) / **Calendrier** mensuel |
| Finances | `/portail/finances` | ✅ — onglets Finances (historique + filtre) / **Documents** (aperçu + téléchargement) |
| Réclamations | `/portail/reclamations` | ✅ — onglets Signaler (formulaire photo) / Mes réclamations (historique + progression) |
| Profil | `/portail/profil` | ✅ — lot, résidence, langue, thème |

---

## Endpoints attendus — Gestionnaire

### Auth

| Méthode | Endpoint | Corps / Params |
|---|---|---|
| POST | `/api/auth/otp/request` | `{ phone: "+212..." }` |
| POST | `/api/auth/otp/verify` | `{ phone, otp }` → `{ token, user: { id, name, role } }` |

---

### Dashboard

```
GET /api/gestionnaire/dashboard
```

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

---

### Résidences

```
GET  /api/gestionnaire/residences              → { residences: Residence[] }
GET  /api/gestionnaire/residences/:id          → { residence: Residence }
```

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

---

### Lots

```
GET    /api/gestionnaire/residences/:id/lots   → { lots: Lot[], total_tantieme: number }
POST   /api/gestionnaire/residences/:id/lots   → { lot: Lot }
PUT    /api/gestionnaire/lots/:id              → { lot: Lot }
DELETE /api/gestionnaire/lots/:id              → 204
```

> ⚠️ **Important** : la réponse GET doit inclure `total_tantieme` (somme de tous les tantièmes de la résidence). Ce champ est utilisé par l'aperçu de répartition dans AppelsFonds.

```json
{
  "lots": [
    {
      "id": 1,
      "numero": "A101",
      "type": "appartement",
      "etage": 1,
      "superficie": 85.5,
      "tantieme": 120,
      "proprietaire": { "id": 1, "name": "Karim Benali" }
    }
  ],
  "total_tantieme": 1000
}
```

Corps POST/PUT : `{ numero, type, etage, superficie, tantieme }`

---

### Copropriétaires

```
GET /api/gestionnaire/residences/:id/coproprietaires → { coproprietaires: Coproprietaire[] }
GET /api/gestionnaire/coproprietaires                → { coproprietaires: Coproprietaire[] }
```

```json
{
  "id": 1,
  "name": "Karim Benali",
  "phone": "+212661000001",
  "lot": { "id": 1, "numero": "A101" },
  "solde": -1200
}
```

---

### Exercices

```
GET  /api/gestionnaire/residences/:id/exercices  → { exercices: Exercice[] }
POST /api/gestionnaire/residences/:id/exercices  → { exercice: Exercice }
```

```json
{ "id": 1, "annee": 2026, "statut": "actif", "date_debut": "2026-01-01", "date_fin": "2026-12-31" }
```

---

### Appels de fonds

```
GET  /api/gestionnaire/appels-fonds             → { appels_fonds: AppelFonds[] }
POST /api/gestionnaire/appels-fonds             → { appel_fonds: AppelFonds }
POST /api/gestionnaire/appels-fonds/:id/envoyer → { appel_fonds: AppelFonds }
```

```json
{
  "id": 1,
  "titre": "Charges Q1 2026",
  "reference": "AF-2026-001",
  "residence": { "id": 1, "name": "Atlas Casablanca" },
  "exercice": { "id": 1, "annee": 2026 },
  "description": "Charges trimestrielles",
  "montant_total": 24000,
  "montant_recouvre": 18000,
  "taux_recouvrement": 75,
  "date_echeance": "2026-03-31",
  "statut": "envoye"
}
```

Corps POST : `{ titre, residence_id, montant_total, date_echeance, description? }`

> La répartition par tantième est calculée côté frontend à partir de `GET /residences/:id/lots` — pas besoin d'un endpoint dédié.

---

### Paiements

```
GET  /api/gestionnaire/paiements   → { paiements: Paiement[] }
POST /api/gestionnaire/paiements   → { paiement: Paiement }
GET  /api/gestionnaire/impayes     → { impayes: Impaye[] }
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

---

### Tickets

```
GET  /api/gestionnaire/tickets           → { tickets: Ticket[] }
GET  /api/gestionnaire/tickets/:id       → { ticket: Ticket }
PUT  /api/gestionnaire/tickets/:id       → { ticket: Ticket }
POST /api/gestionnaire/tickets/:id/clos  → { ticket: Ticket }
```

Params GET : `statut`, `priorite`

Corps PUT : `{ statut: "ouvert" | "en_cours" | "resolu" }`

> La vue Kanban appelle `PUT /:id` quand l'utilisateur glisse une carte vers une autre colonne. `POST /:id/clos` est appelé séparément pour clôturer définitivement.

Type `Ticket` :
```json
{
  "id": 1,
  "description": "Fuite d'eau dans le couloir B2",
  "categorie": "plomberie",
  "priorite": "urgent",
  "statut": "en_cours",
  "residence": { "id": 1, "name": "Atlas Casablanca" },
  "lot": { "id": 1, "numero": "A101" },
  "user": { "id": 1, "name": "Karim Benali" },
  "images": ["https://storage.../photo1.jpg"],
  "created_at": "2026-05-10T08:00:00Z",
  "updated_at": "2026-05-12T14:00:00Z"
}
```

---

### Assemblées générales

```
GET  /api/gestionnaire/assemblees  → { assemblees: Assemblee[] }
POST /api/gestionnaire/assemblees  → { assemblee: Assemblee }
```

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

Corps POST : `{ titre, type, residence_id, date, lieu, quorum_requis, ordre_du_jour }`

---

### Annonces

```
GET    /api/gestionnaire/annonces               → { annonces: Annonce[] }
POST   /api/gestionnaire/annonces               → { annonce: Annonce }
PUT    /api/gestionnaire/annonces/:id           → { annonce: Annonce }
POST   /api/gestionnaire/annonces/:id/publier   → { annonce: Annonce }
POST   /api/gestionnaire/annonces/:id/archiver  → { annonce: Annonce }
DELETE /api/gestionnaire/annonces/:id           → 204
```

Params GET : `statut`, `residence_id`

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

`residence` peut être `null` si l'annonce s'applique à toutes les résidences.

---

### Prestataires

```
GET  /api/gestionnaire/prestataires      → { prestataires: Prestataire[] }
POST /api/gestionnaire/prestataires      → { prestataire: Prestataire }
PUT  /api/gestionnaire/prestataires/:id  → { prestataire: Prestataire }
```

Params GET : `statut`, `specialite`

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

---

### Budgets

```
GET    /api/gestionnaire/budgets?residence_id=1&exercice_id=1  → { budget: Budget | null }
POST   /api/gestionnaire/budgets                               → { budget: Budget }
POST   /api/gestionnaire/budgets/:id/approuver                 → { budget: Budget }
POST   /api/gestionnaire/budgets/:id/postes                    → { poste: BudgetPoste }
PUT    /api/gestionnaire/budgets/:id/postes/:poste_id          → { poste: BudgetPoste }
DELETE /api/gestionnaire/budgets/:id/postes/:poste_id          → 204
```

Corps POST budget : `{ residence_id, exercice_id }`

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

Catégories : `entretien`, `gardiennage`, `nettoyage`, `administratif`, `travaux`, `assurance`, `autre`

---

### Documents (gestionnaire)

```
GET    /api/gestionnaire/documents          → { documents: GestDoc[] }
POST   /api/gestionnaire/documents          → { document: GestDoc }   (multipart/form-data)
DELETE /api/gestionnaire/documents/:id      → 204
```

Params GET : `type`, `residence_id`

Type `GestDoc` :
```json
{
  "id": 1,
  "nom": "Règlement de copropriété 2024",
  "type": "reglement",
  "residence": { "id": 1, "name": "Atlas Casablanca" },
  "date": "2024-01-15",
  "url": "https://storage.../reglement-copro.pdf",
  "taille_ko": 1240
}
```

Types valides : `reglement` | `pv_ag` | `contrat` | `facture` | `autre`

`residence` peut être `null` si le document concerne toutes les résidences.

Corps POST (multipart) :
```
nom         = "Règlement de copropriété 2024"
type        = "reglement"
residence_id = 1          (optionnel)
date        = "2024-01-15"
file        = <fichier>
```

> Le champ `url` retourné doit être une URL publiquement accessible (S3, Cloudflare R2, etc.) — le frontend ouvre ce lien directement dans un nouvel onglet pour le téléchargement, et l'intègre dans un `<iframe>` pour l'aperçu PDF ou `<img>` pour les images.

---

## Endpoints attendus — Portail copropriétaire

À implémenter dans `routes/api/portail.php` (middleware auth Sanctum + rôle `resident`).

### Dashboard portail

```
GET /api/portail/dashboard
```

```json
{
  "status": "success",
  "data": {
    "balance": -1200,
    "statut": "en_retard",
    "prochain_appel": {
      "montant": 1000,
      "date": "2026-06-01"
    }
  }
}
```

`statut` : `"a_jour"` ou `"en_retard"`. `prochain_appel` peut être `null`.

> Le champ `prochain_appel` alimente la carte de rappel "Prochain paiement" sur la page d'accueil portail.

---

### Opérations (finances)

```
GET /api/portail/operations  → { operations: Operation[] }
```

```json
{
  "id": 1,
  "type": "paiement",
  "libelle": "Paiement charges Q1 2026",
  "montant": 1000,
  "date": "2026-02-15T00:00:00Z",
  "statut": "valide",
  "recu_url": "https://storage.../recu-001.pdf"
}
```

`type` : `"paiement"` (montant positif) ou `"appel_fonds"` (montant négatif)
`recu_url` peut être `null` si le reçu n'est pas disponible.

---

### Annonces portail

```
GET /api/portail/annonces  → { annonces: Annonce[] }
```

```json
{
  "id": 1,
  "titre": "Travaux ascenseur",
  "contenu": "L'ascenseur sera hors service le 20 mai de 8h à 18h.",
  "priorite": "urgente",
  "date": "2026-05-15T00:00:00Z"
}
```

`priorite` : `"normale"` | `"urgente"`

---

### Assemblées portail

```
GET /api/portail/assemblees  → { assemblees: AssembleePortail[] }
```

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

`ordre_du_jour` est un tableau de strings.

> Ces assemblées alimentent à la fois l'onglet **Assemblées** (liste) et l'onglet **Calendrier** (grille mensuelle) de la page Actualités. Le calendrier groupe les assemblées par date.

---

### Réclamations portail

```
GET  /api/portail/reclamations  → { reclamations: Reclamation[] }
POST /api/portail/reclamations  → { reclamation: Reclamation }  (multipart/form-data)
```

```json
{
  "id": 1,
  "reference": "REC-2026-001",
  "titre": "Fuite d'eau dans le couloir",
  "description": "Description détaillée…",
  "statut": "en_cours",
  "priorite": "urgent",
  "photos": ["https://storage.../photo1.jpg"],
  "created_at": "2026-05-10T08:00:00Z"
}
```

Corps POST (multipart) :
```
titre       = "Fuite d'eau"
description = "..."
categorie   = "plomberie"
photos[]    = <fichier1>
photos[]    = <fichier2>   (jusqu'à 5 photos)
```

---

### Documents portail

```
GET /api/portail/documents  → { documents: PortailDocument[] }
```

```json
{
  "id": 1,
  "nom": "Règlement de copropriété — Résidence Al Blanca",
  "type": "reglement",
  "date": "2023-03-01",
  "url": "https://storage.../reglement.pdf",
  "taille_ko": 1240
}
```

Types valides : `reglement` | `pv_ag` | `contrat_facture` | `autre`

> L'endpoint ne retourne que les documents de la résidence du résident authentifié + les documents globaux (sans résidence).
>
> Le champ `url` doit être une URL directement accessible — le frontend ouvre l'aperçu dans un `<iframe>` (PDF) ou `<img>` (image) selon l'extension du fichier, puis propose le téléchargement.

---

### Profil portail

```
GET /api/portail/profil  → { user: ResidentProfile }
PUT /api/portail/profil  → { user: ResidentProfile }
```

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

Corps PUT : `{ name, email }`

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

Erreur auth (401) : `{ "status": "error", "message": "Unauthenticated." }`

---

## Fichiers service frontend

| Fichier | Endpoints qu'il consomme |
|---|---|
| `services/gestionnaire.service.ts` | dashboard, residences, lots, coproprietaires, exercices, appels-fonds, paiements, impayes, tickets (GET/PUT/clos), assemblees |
| `services/annonces.service.ts` | annonces CRUD + publier + archiver |
| `services/prestataires.service.ts` | prestataires CRUD + contrats CRUD |
| `services/budgets.service.ts` | budgets GET/POST + approuver + postes CRUD |
| `services/documents.service.ts` | GET/POST/DELETE /gestionnaire/documents |
| `services/portail.service.ts` | portail dashboard, operations, annonces, assemblees, reclamations (GET + POST), documents, profil |

---

## Notes importantes

- **Stockage fichiers** : les documents et photos sont uploadés en multipart. Le backend doit retourner une `url` publique (S3/R2). Le frontend ne stocke pas de fichiers localement.
- **Pagination** : aucune page ne pagine côté frontend pour l'instant — les listes sont complètes. À implémenter côté backend si les collections dépassent ~500 items.
- **CORS** : le backend doit autoriser `http://localhost:5173` (dev) et `https://frontend-eta-indol-78.vercel.app` (preview).
- **Tickets — champ `images` vs `photos`** : le frontend utilise `images: string[]` dans le type `Ticket`. Retourne bien ce champ (pas `photos`).
- **Assemblées — `ordre_du_jour`** : le frontend attend un `string[]`. Si le backend stocke un texte brut, le split par `\n` en Laravel avant de retourner.
