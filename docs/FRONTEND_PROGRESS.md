# Imaro — Frontend Progress (2026-05-18)

> **Pour Abdellah** — ce fichier récapitule ce qui est construit côté frontend, les endpoints API attendus pour chaque page, et le format exact des réponses. Mis à jour après chaque sprint.

---

## ⚡ Dernières modifications — 18 mai 2026 (soir)

### Nouveau système d'authentification — IMPORTANT à implémenter

Le modèle auth a changé. Voici la logique complète :

| Qui | Méthode | Endpoint |
|---|---|---|
| **Gestionnaire / Syndic** | Email + Mot de passe (fourni par Imaro) | `POST /api/auth/login` |
| **Copropriétaire (email)** | Email + Mot de passe (généré auto) | `POST /api/auth/login` |
| **Copropriétaire (WhatsApp)** | Téléphone + OTP WhatsApp | `POST /api/auth/otp/request` + `POST /api/auth/otp/verify` |

> La page `/login` affiche d'abord un sélecteur de rôle. Si "Syndic / Gestionnaire" → formulaire email + password. Si "Copropriétaire" → numéro de téléphone + OTP WhatsApp (inchangé).

### Création de copropriétaire par le gestionnaire — NOUVEAU

Le gestionnaire peut maintenant créer des comptes copropriétaires depuis la page Copropriétaires. Dialog avec deux méthodes :

**Méthode Email** → le système génère un mot de passe temporaire que le gestionnaire partage.
**Méthode WhatsApp** → le copropriétaire reçoit un OTP lors de sa première connexion.

### Autres fonctionnalités

| Quoi | Fichier(s) | Impact backend |
|---|---|---|
| **Page Mon Profil (gestionnaire)** — logo syndic, notifications, GDPR | `pages/gestionnaire/ProfilPage.tsx` | `PATCH /api/gestionnaire/profil` (voir section ci-dessous) |
| **Topbar** — logo syndic, cloche, FR\|AR pill, avatar dropdown | `layouts/GestionnaireLayout.tsx` | `GET /api/gestionnaire/notifications` |
| **Système de notifications** — 5 types, mark-as-read, dismiss | `stores/notifStore.ts` | `GET /api/gestionnaire/notifications` |
| **Logo syndic** — upload PNG/JPG → localStorage | `stores/settingsStore.ts` | `POST /api/gestionnaire/profil/logo` |
| **Language switcher** — pill FR \| AR | `components/LanguageSwitcher.tsx` | Rien |

---

## Endpoints attendus — Authentification (PRIORITÉ 1)

### Login email (gestionnaire + copropriétaire email)

```
POST /api/auth/login
```

Corps :
```json
{ "email": "syndic@imaro.ma", "password": "monMotDePasse" }
```

Réponse succès :
```json
{
  "status": "success",
  "data": {
    "token": "sanctum-token-abc123",
    "user": {
      "id": 2,
      "name": "Ahmed Berrada",
      "phone": "+212612000002",
      "role": "gestionnaire"
    },
    "tenant": {
      "id": 1,
      "name": "Atlas Syndic",
      "subdomain": "atlas",
      "plan": "standard"
    }
  }
}
```

Réponse erreur :
```json
{ "status": "error", "message": "Identifiants incorrects" }
```
→ HTTP 401

> **Important** : Même format de réponse que `POST /api/auth/otp/verify`. Le frontend utilise exactement le même `setSession({ token, user, tenant })`.

### OTP WhatsApp — inchangé

```
POST /api/auth/otp/request   { "phone": "+212612345678" }
POST /api/auth/otp/verify    { "phone": "+212612345678", "otp": "123456" }
```

---

## Endpoints attendus — Création de copropriétaire (PRIORITÉ 1)

```
POST /api/gestionnaire/residences/:id/coproprietaires
```

Corps (méthode email) :
```json
{
  "auth_method": "email",
  "name": "Youssef El Mansouri",
  "email": "youssef@gmail.com",
  "phone": "+212612345678",
  "residence_id": 1
}
```

Corps (méthode WhatsApp) :
```json
{
  "auth_method": "phone",
  "name": "Youssef El Mansouri",
  "phone": "+212612345678",
  "email": null,
  "residence_id": 1
}
```

Réponse (méthode email) :
```json
{
  "status": "success",
  "data": {
    "coproprietaire": {
      "id": 42,
      "name": "Youssef El Mansouri",
      "phone": "+212612345678",
      "lot": { "id": 0, "numero": "—", "tantieme": 0 },
      "solde_actuel": 0
    },
    "temp_password": "ABC12XY8"
  }
}
```

Réponse (méthode WhatsApp) :
```json
{
  "status": "success",
  "data": {
    "coproprietaire": { ... },
    "temp_password": null
  }
}
```

> **Logique backend** :
> - Méthode email : crée un `User` avec `email`, génère un mot de passe aléatoire (8 chars alphanum), retourne `temp_password` en clair **une seule fois**.
> - Méthode WhatsApp : crée un `User` avec `phone` uniquement, `temp_password = null`. Le copropriétaire se connectera via OTP WhatsApp.
> - Dans les deux cas, assigner le copropriétaire à la résidence et créer sa relation `UserResidence`.
> - L'assignment du lot se fait séparément via `PUT /api/gestionnaire/residences/:id/lots/:lotId` (qui existe déjà).

### Workflow Git — rappel

- Notre branche `feat/gestionnaire-dashboard` → **PR vers `develop`** dès que tu es prêt à tester
- 1 approbation → merge → staging auto-deploy
- Fin de sprint : `develop → main` (2 approbations) → production

---

## ⚡ Modifications du 18 mai 2026 (matin)

| Quoi | Impact backend |
|---|---|
| Logo syndic upload (localStorage) | Upload endpoint à prévoir |
| Notification center (localStorage) | `GET /api/gestionnaire/notifications` |
| FR\|AR pill | Rien |

---

## ⚡ Modifications du 17 mai 2026

### Ce qui était nouveau ce jour-là

| Quoi | Impact backend |
|---|---|
| **Rapports PDF** — onglet Rapports dans Comptabilité avec génération de 4 PDFs (Rapport Financier, Journal, Balance, Grand Livre) | ✅ **Aucun nouveau endpoint** — tout est généré client-side avec jsPDF |
| **Vercel déployé** — toutes les pages Sprint 2→5 + Rapports en ligne | Rien |
| **Fix typage** — `ComptabilitePage.tsx` corrections lint/TS | Rien |

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

## Endpoints attendus — Profil gestionnaire & Notifications

À implémenter dans `routes/api/gestionnaire.php`.

### Profil gestionnaire

```
GET   /api/gestionnaire/profil
PATCH /api/gestionnaire/profil
POST  /api/gestionnaire/profil/logo    (multipart)
```

Réponse GET :
```json
{
  "status": "success",
  "data": {
    "profil": {
      "id": 2,
      "name": "Ahmed Berrada",
      "phone": "+212612000002",
      "role": "gestionnaire",
      "logo_url": "https://storage.../logo-syndic.png",
      "notif_paiement": true,
      "notif_ticket": true,
      "notif_assemblee": true,
      "notif_retard": true
    }
  }
}
```

Corps PATCH (JSON) :
```json
{
  "name": "Ahmed Berrada",
  "notif_paiement": true,
  "notif_ticket": false,
  "notif_assemblee": true,
  "notif_retard": true
}
```

POST `/profil/logo` (multipart) :
```
file = <image PNG/JPG, max 2 Mo>
```
Réponse :
```json
{ "status": "success", "data": { "logo_url": "https://storage.../logo.png" } }
```

> **Important** : Pour l'instant le logo est stocké en base64 dans le localStorage du navigateur (`imaro.settings`). Quand tu implémentes l'endpoint, le frontend basculera automatiquement vers l'URL S3 retournée — aucun changement frontend nécessaire, juste brancher le service.

---

### Notifications gestionnaire

```
GET   /api/gestionnaire/notifications
PATCH /api/gestionnaire/notifications/:id/read
PATCH /api/gestionnaire/notifications/read-all
DELETE /api/gestionnaire/notifications/:id
```

Réponse GET :
```json
{
  "status": "success",
  "data": {
    "notifications": [
      {
        "id": "n1",
        "type": "paiement",
        "title": "Paiement reçu",
        "message": "Youssef El Mansouri a réglé 1 500 MAD — Lot B3",
        "time": "2026-05-18T10:22:00Z",
        "read": false
      }
    ]
  }
}
```

`type` valides : `"paiement"` | `"ticket"` | `"assemblee"` | `"retard"` | `"info"`

> **Pour l'instant** : Le frontend utilise un store Zustand persisté en localStorage (`imaro.notifs`) avec des données mock. Quand l'endpoint sera prêt, on branchera `GET /notifications` dans un `useQuery` et on remplacera les mutations locales par des `useMutation`. Aucun changement UI.
>
> **Push en temps réel** : Si vous voulez des notifications live (nouveau ticket soumis → cloche sonne), prévoir un endpoint WebSocket ou Server-Sent Events. À discuter en Sprint 4.

---

## Endpoints attendus — Comptabilité (gestionnaire)

À implémenter dans `routes/api/gestionnaire.php` (middleware auth Sanctum + rôle `gestionnaire`).

> **Aucun endpoint nouveau n'est nécessaire pour l'onglet Rapports** — les PDFs sont entièrement générés côté client (jsPDF) à partir des données déjà exposées par les endpoints dashboard, journal et balance ci-dessous.

---

### Exercices comptables

```
GET  /api/gestionnaire/residences/:id/exercices
POST /api/gestionnaire/residences/:id/exercices
```

Réponse GET :
```json
{
  "status": "success",
  "data": {
    "exercices": [
      {
        "id": 1,
        "annee": 2025,
        "statut": "ouvert",
        "date_debut": "2025-01-01",
        "date_fin": "2025-12-31",
        "solde_initial": 5000.00,
        "residence_id": 1
      }
    ]
  }
}
```

Corps POST :
```json
{ "annee": 2026, "date_debut": "2026-01-01", "date_fin": "2026-12-31", "solde_initial": 0 }
```

`statut` : `"ouvert"` | `"cloture"`

---

### Dashboard comptabilité

```
GET /api/gestionnaire/exercices/:id/dashboard
```

```json
{
  "status": "success",
  "data": {
    "dashboard": {
      "total_charges": 48500.00,
      "total_produits": 52000.00,
      "solde": 3500.00,
      "taux_recouvrement": 87.5,
      "charges_par_categorie": [
        { "categorie": "Entretien", "montant": 18000.00 },
        { "categorie": "Gardiennage", "montant": 14400.00 },
        { "categorie": "Assurance", "montant": 6000.00 },
        { "categorie": "Eau/Électricité", "montant": 10100.00 }
      ],
      "evolution_mensuelle": [
        { "mois": "Jan", "charges": 4200, "produits": 4500 },
        { "mois": "Fév", "charges": 3800, "produits": 4200 }
      ]
    }
  }
}
```

> Ce endpoint alimente : les 4 KPI cards, le graphique barres "Évolution mensuelle" et le camembert "Répartition charges".

---

### Journal comptable

```
GET /api/gestionnaire/exercices/:id/journal
```

Paramètres optionnels : `?compte=401&type=debit&date_debut=2025-01-01&date_fin=2025-12-31`

```json
{
  "status": "success",
  "data": {
    "ecritures": [
      {
        "id": 1,
        "date": "2025-01-15",
        "libelle": "Facture gardiennage janv.",
        "compte_debit": "614",
        "compte_credit": "401",
        "montant": 1200.00,
        "piece": "FAC-2025-001",
        "exercice_id": 1
      }
    ]
  }
}
```

> Utilisé par l'onglet Journal et par `generateJournalPdf()` pour le PDF.

---

### Grand livre

```
GET /api/gestionnaire/exercices/:id/grand-livre
```

Paramètre optionnel : `?compte=614`

```json
{
  "status": "success",
  "data": {
    "comptes": [
      {
        "numero": "614",
        "intitule": "Charges de gardiennage",
        "solde_initial": 0,
        "total_debit": 14400.00,
        "total_credit": 0,
        "solde_final": 14400.00,
        "ecritures": [
          { "date": "2025-01-15", "libelle": "Gardiennage janv.", "debit": 1200.00, "credit": 0 }
        ]
      }
    ]
  }
}
```

---

### Balance des comptes

```
GET /api/gestionnaire/exercices/:id/balance
```

```json
{
  "status": "success",
  "data": {
    "balance": [
      {
        "compte": "614",
        "intitule": "Charges de gardiennage",
        "debit": 14400.00,
        "credit": 0,
        "solde": 14400.00
      }
    ]
  }
}
```

> Utilisé par l'onglet Balance et par `generateBalancePdf()` + `generateGrandLivrePdf()`.

---

### Dépenses (charges)

```
GET    /api/gestionnaire/exercices/:id/depenses
POST   /api/gestionnaire/exercices/:id/depenses
DELETE /api/gestionnaire/exercices/:id/depenses/:depId
```

Réponse GET :
```json
{
  "status": "success",
  "data": {
    "depenses": [
      {
        "id": 1,
        "date": "2025-01-15",
        "description": "Facture gardiennage",
        "categorie": "Gardiennage",
        "montant": 1200.00,
        "prestataire": "Société Sécurité Atlas",
        "statut": "paye",
        "exercice_id": 1
      }
    ]
  }
}
```

Corps POST :
```json
{
  "date": "2025-01-15",
  "description": "Facture gardiennage",
  "categorie": "Gardiennage",
  "montant": 1200.00,
  "prestataire": "Société Sécurité Atlas",
  "statut": "paye"
}
```

`statut` : `"paye"` | `"en_attente"` | `"annule"`

---

### Encaissements

```
POST /api/gestionnaire/exercices/:id/encaissements
```

Corps :
```json
{
  "coproprietaire_id": 5,
  "montant": 1500.00,
  "date": "2025-02-10",
  "reference": "VIR-2025-047",
  "appel_fonds_id": 3
}
```

Réponse :
```json
{
  "status": "success",
  "data": {
    "encaissement": {
      "id": 12,
      "coproprietaire_id": 5,
      "montant": 1500.00,
      "date": "2025-02-10",
      "reference": "VIR-2025-047"
    }
  }
}
```

---

### Comptes PCG (référentiel)

```
GET /api/gestionnaire/comptes-pcg
```

```json
{
  "status": "success",
  "data": {
    "comptes": [
      { "numero": "401", "intitule": "Fournisseurs", "classe": 4 },
      { "numero": "512", "intitule": "Banque", "classe": 5 },
      { "numero": "614", "intitule": "Charges de gardiennage", "classe": 6 },
      { "numero": "706", "intitule": "Cotisations copropriétaires", "classe": 7 }
    ]
  }
}
```

> Ce endpoint est utilisé dans les selects du Journal (choix des comptes débit/crédit). Il peut retourner une liste statique — pas besoin de CRUD.

---

### Clôture d'exercice

```
POST /api/gestionnaire/exercices/:id/cloturer
```

Body : vide `{}`

Réponse :
```json
{
  "status": "success",
  "data": {
    "exercice": {
      "id": 1,
      "annee": 2025,
      "statut": "cloture",
      "date_cloture": "2026-01-31"
    }
  }
}
```

> La clôture passe le statut de `"ouvert"` à `"cloture"`. Une fois clôturé, l'exercice est en lecture seule (le frontend désactive les boutons d'ajout/suppression). La vérification se fait côté backend : retourner `422` si des écritures sont en déséquilibre débit/crédit.

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
| `services/comptabilite.service.ts` | exercices, dashboard, journal, grand livre, balance, dépenses CRUD, encaissements, comptes PCG, clôture |
| `services/portail.service.ts` | portail dashboard, operations, annonces, assemblees, reclamations (GET + POST), documents, profil |
| `lib/pdf-reports.ts` | ⚠️ **Aucun endpoint** — génération PDF pure navigateur (jsPDF) |

---

## Notes importantes

- **Stockage fichiers** : les documents et photos sont uploadés en multipart. Le backend doit retourner une `url` publique (S3/R2). Le frontend ne stocke pas de fichiers localement.
- **Pagination** : aucune page ne pagine côté frontend pour l'instant — les listes sont complètes. À implémenter côté backend si les collections dépassent ~500 items.
- **CORS** : le backend doit autoriser `http://localhost:5173` (dev) et `https://frontend-eta-indol-78.vercel.app` (Vercel preview).
- **Tickets — champ `images` vs `photos`** : le frontend utilise `images: string[]` dans le type `Ticket`. Retourne bien ce champ (pas `photos`).
- **Assemblées — `ordre_du_jour`** : le frontend attend un `string[]`. Si le backend stocke un texte brut, le split par `\n` en Laravel avant de retourner.
- **Rapports PDF — `user.name`** : le nom affiché en en-tête des PDFs vient de `user.name` retourné par l'auth. Ce champ doit contenir le **nom de la société de gestion** (ex: "Atlas Syndic SARL"), pas juste le prénom du gestionnaire.
- **Déploiement Vercel** : déployé manuellement via `vercel --prod` depuis `frontend/`. Pas de CI/CD GitHub → Vercel pour l'instant. À mettre en place quand on passe sur `develop`/`main`.
