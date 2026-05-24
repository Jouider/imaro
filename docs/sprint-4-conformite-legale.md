# Sprint 4 — Conformité légale MVP

> **Pour Abdellah (backend)** — tout ce dont tu as besoin pour démarrer.
> **Référence concurrent**: voir `docs/imaro-vs-kassaba.md` pour le contexte.
> **Objectif sprint**: rendre Imaro **légalement utilisable** par un syndic professionnel marocain (Décret 2.23.700 + Loi 18-00).
> **Durée cible**: 2 semaines.

---

## 1. Vue d'ensemble

Six features à livrer ensemble :

| # | Feature | Frontend (Mouad) | Backend (Abdellah) |
|---|---|---|---|
| 4.1 | Audit trail | ✅ Page `AuditTrailPage` (mockée) | Schéma `audit_logs` + middleware Sanctum |
| 4.2 | Annexes 10 / 13-1 / 13-2 | ✅ Page `AnnexesPage` (mockée) | Génération PDF + endpoints |
| 4.3 | Calendrier de conformité | ✅ Page `ConformitePage` (mockée) | Moteur de cycle + endpoints |
| 4.4 | Pénalités de retard | 🟡 Section dans `RecouvrementPage` | Config + calcul auto |
| 4.5 | Risque de prescription | 🟡 KPI dans `RecouvrementPage` | Calcul agrégé |
| 4.6 | Occupants/locataires | 🟡 Section dans CoproprietairesPage | Schéma `occupants` + CRUD |

Pendant ton sprint backend, le frontend est **déjà branché en mode mock** — quand tu livres un endpoint, je passe juste de `withMock` à l'appel réel.

---

## 2. Schémas DB à créer

### 2.1 `audit_logs` (Feature 4.1)

```sql
CREATE TABLE audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  user_email VARCHAR(255) NULL,
  category ENUM('immeuble','lot','coproprietaire','paiement','depense',
                'budget','ag','document','user','auth','system') NOT NULL,
  action VARCHAR(100) NOT NULL,            -- ex: "Building.created", "Payment.updated"
  severity ENUM('info','warning','sensitive','error') NOT NULL DEFAULT 'info',
  target_type VARCHAR(100) NULL,           -- nom du modèle ciblé
  target_id BIGINT UNSIGNED NULL,
  target_label VARCHAR(255) NULL,          -- nom lisible (ex: "bianca beach")
  payload JSON NULL,                       -- diff avant/après pour les updates
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tenant_created (tenant_id, created_at DESC),
  INDEX idx_category (tenant_id, category),
  INDEX idx_target (tenant_id, target_type, target_id),
  INDEX idx_severity (tenant_id, severity)
);
```

**Middleware Laravel** : créer un trait `LogsActivity` à appliquer sur tous les modèles métier. Sur `created`/`updated`/`deleted`, write dans `audit_logs`.

**Actions sensibles** (`severity='sensitive'`) à tracer obligatoirement :
- Suppression d'un copropriétaire / lot / résidence
- Modification d'un budget validé
- Verrouillage de clôture d'exercice
- Login admin depuis IP non habituelle
- Changement de rôle d'un utilisateur
- Export massif (>100 enregistrements)

### 2.2 `penalty_configs` + champs sur `paiements` (Feature 4.4)

```sql
CREATE TABLE penalty_configs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  residence_id BIGINT UNSIGNED NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  grace_period_days INT UNSIGNED NOT NULL DEFAULT 15,
  rate_type ENUM('fixed','percentage','daily') NOT NULL DEFAULT 'percentage',
  rate_value DECIMAL(10,4) NOT NULL DEFAULT 5.0000,    -- 5% ou 50 MAD selon rate_type
  cap_max_montant DECIMAL(10,2) NULL,                   -- plafond optionnel
  ag_approved_at DATE NULL,                             -- date d'approbation AG
  ag_id BIGINT UNSIGNED NULL,                           -- AG qui a voté
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE KEY unique_residence (residence_id)
);

-- Sur paiements existants, ajouter :
ALTER TABLE paiements
  ADD COLUMN penalty_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN penalty_calculated_at TIMESTAMP NULL,
  ADD COLUMN mise_en_demeure_sent_at TIMESTAMP NULL,
  ADD COLUMN mise_en_demeure_pdf_url VARCHAR(500) NULL;
```

**Job nocturne** (`PenaltyCalculatorJob`) : tous les jours à 02h, recalcule `penalty_amount` sur tous les impayés dépassant `grace_period_days`.

### 2.3 `occupants` (Feature 4.6)

```sql
CREATE TABLE occupants (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  lot_id BIGINT UNSIGNED NOT NULL,
  coproprietaire_id BIGINT UNSIGNED NULL,    -- si l'occupant est aussi proprio
  nom VARCHAR(255) NOT NULL,
  telephone VARCHAR(20) NULL,
  email VARCHAR(255) NULL,
  type ENUM('proprietaire_occupant','locataire','usufruitier','autre') NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NULL,                         -- bail
  contact_urgence_nom VARCHAR(255) NULL,
  contact_urgence_telephone VARCHAR(20) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  INDEX idx_lot (lot_id),
  INDEX idx_tenant (tenant_id)
);
```

**Règle métier** : un lot peut avoir N occupants à un instant T (parfois colocation), mais 1 seul `proprietaire_occupant` actif (= le copropriétaire qui habite son lot).

### 2.4 `compliance_calendar_tasks` (Feature 4.3)

```sql
CREATE TABLE compliance_calendar_tasks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  residence_id BIGINT UNSIGNED NOT NULL,
  exercice INT UNSIGNED NOT NULL,            -- 2026
  phase ENUM('operations_mensuelles','cloture_exercice','preparation_ag','archivage') NOT NULL,
  task_key VARCHAR(100) NOT NULL,             -- 'jan_appel_emis', 'cloture_2025_lock', etc.
  task_label VARCHAR(255) NOT NULL,
  due_date DATE NULL,
  status ENUM('pending','in_progress','done','skipped','overdue') NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMP NULL,
  completed_by BIGINT UNSIGNED NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE KEY unique_task (residence_id, exercice, task_key),
  INDEX idx_residence_exercice (residence_id, exercice),
  INDEX idx_status (status, due_date)
);
```

**Seed obligatoire** : à la création d'un nouvel exercice pour une résidence, créer automatiquement toutes les tasks du cycle annuel selon Décret 2.23.700 :

| Phase | Task key | Label | Due date |
|---|---|---|---|
| operations_mensuelles | `appel_emis_${mois}` (×12) | Appel de fonds émis ${mois} | dernier jour du mois |
| cloture_exercice | `arret_comptes_${exercice}` | Arrêt des comptes ${exercice} | 31 mars exercice+1 |
| cloture_exercice | `audit_interne_${exercice}` | Audit interne | 30 avril |
| cloture_exercice | `provisions_creances` | Provisions créances douteuses | 30 avril |
| preparation_ag | `convocation_envoyee` | Convocations AG envoyées | 15 jours avant AG |
| preparation_ag | `documents_disposition` | Documents à disposition | 15 jours avant AG |
| preparation_ag | `tenue_ag` | Tenue de l'AG | (date AG) |
| archivage | `pv_signe` | PV de l'AG signé | 1 mois après AG |
| archivage | `annexes_generees` | Annexes 10, 13-1, 13-2 générées | 1 mois après AG |
| archivage | `archivage_complet` | Archivage exercice clôturé | 2 mois après AG |

### 2.5 Annexes (Feature 4.2)

**Pas de nouvelle table** — les annexes sont **calculées à la volée** depuis les données existantes (paiements, dépenses, budgets, comptes). Mais on a besoin d'un cache pour la performance :

```sql
CREATE TABLE annexes_cache (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  residence_id BIGINT UNSIGNED NOT NULL,
  exercice INT UNSIGNED NOT NULL,
  annexe_num VARCHAR(10) NOT NULL,           -- '10', '13-1', '13-2', '3', etc.
  data JSON NOT NULL,                         -- agrégat calculé
  pdf_path VARCHAR(500) NULL,                 -- chemin Storage::disk('private')
  generated_at TIMESTAMP NOT NULL,
  generated_by BIGINT UNSIGNED NOT NULL,
  UNIQUE KEY unique_annexe (residence_id, exercice, annexe_num)
);
```

**Format des annexes obligatoires** :

#### Annexe 10 — État des Contributions des Copropriétaires
```json
{
  "exercice": 2026,
  "residence": { "id": 1, "nom": "Atlas Casablanca" },
  "contributions": [
    {
      "lot_numero": "A-01",
      "coproprietaire_nom": "Hassan Benali",
      "tantieme": 45,
      "appels_emis": 3600.00,
      "paiements_recus": 3000.00,
      "solde": -600.00,
      "statut": "en_retard"
    }
  ],
  "totaux": {
    "tantiemes": 1000,
    "appels": 12000.00,
    "paiements": 10200.00,
    "solde": -1800.00
  }
}
```

#### Annexe 13-1 — État de la situation financière (Bilan)
```json
{
  "exercice": 2026,
  "actif": {
    "immobilisations": 50000.00,
    "creances": 1800.00,
    "tresorerie": { "banque": 25000.00, "caisse": 500.00 },
    "total": 77300.00
  },
  "passif": {
    "fonds_copro": 50000.00,
    "fonds_reserve": 20000.00,
    "resultat_exercice": 5000.00,
    "dettes": 2300.00,
    "total": 77300.00
  }
}
```

#### Annexe 13-2 — Compte de gestion général
```json
{
  "exercice": 2026,
  "produits": {
    "appels_fonds": 12000.00,
    "autres_recettes": 500.00,
    "produits_financiers": 200.00,
    "total": 12700.00
  },
  "charges": {
    "entretien_courant": 4500.00,
    "fluides": 2800.00,
    "honoraires_syndic": 1800.00,
    "charges_personnel": 0,
    "autres_charges": 600.00,
    "total": 9700.00
  },
  "resultat": 3000.00
}
```

**Template PDF** : utiliser **DomPDF** ou **Browsershot** (Playwright), avec un layout Imaro (header navy/orange, logo). Je peux te fournir le mockup HTML/CSS.

---

## 3. Endpoints à exposer

### Auth & convention
- Toutes les routes sous `/api/gestionnaire/` (déjà en place).
- Bearer token Sanctum (déjà en place).
- Enveloppe standard `{ status, data, errors? }` (déjà en place).
- Pagination Laravel standard `?page=&per_page=` (déjà en place).

### 3.1 Audit trail

```
GET    /api/audit-logs
       Query: from, to, category, severity, action, target_type, target_id,
              user_id, search, page, per_page
       Resp: { logs: AuditLog[], stats: { total, errors, sensitive, error_rate } }

GET    /api/audit-logs/export?format={csv|json}&filters...
       Resp: file download
```

**Type AuditLog** :
```ts
{
  id: number
  category: 'immeuble'|'lot'|'coproprietaire'|...
  action: string                    // "Building.created"
  severity: 'info'|'warning'|'sensitive'|'error'
  target_type?: string
  target_id?: number
  target_label?: string
  user_email?: string
  payload?: Record<string,unknown>  // diff avant/après
  ip_address?: string
  created_at: string                // ISO
}
```

### 3.2 Annexes

```
GET    /api/residences/:id/annexes?exercice=2026
       Resp: { requises: ['10','13-1','13-2'], disponibles: ['10','13-1','13-2','3','4'] }

GET    /api/residences/:id/annexes/:annexe_num?exercice=2026
       Resp: { data: AnnexeData, generated_at?: string, pdf_url?: string }

POST   /api/residences/:id/annexes/:annexe_num/regenerate
       Body: { exercice: 2026 }
       Resp: { data: AnnexeData, pdf_url: string }

GET    /api/residences/:id/annexes/:annexe_num.pdf?exercice=2026
       Resp: PDF file stream
```

### 3.3 Calendrier de conformité

```
GET    /api/residences/:id/compliance-calendar?exercice=2026
       Resp: {
         exercice: 2026,
         regime: 'simplifie'|'normal',
         seuil_recettes: 200000,
         progression_pct: 14,
         phases: [
           { phase: 'operations_mensuelles', progress: 50, tasks: [...] },
           ...
         ]
       }

POST   /api/compliance-tasks/:task_id/complete
       Resp: { task: ComplianceTask }

POST   /api/compliance-tasks/:task_id/skip
       Body: { reason: string }
```

**Calcul du régime** : recettes annuelles ≤ 200 000 MAD = `simplifie`, sinon `normal`. Le régime change les annexes requises (simplifié = 10, 13-1, 13-2 seulement).

### 3.4 Pénalités

```
GET    /api/residences/:id/penalty-config
       Resp: PenaltyConfig

PUT    /api/residences/:id/penalty-config
       Body: { enabled, grace_period_days, rate_type, rate_value, cap_max_montant, ag_id }
       Resp: PenaltyConfig

POST   /api/residences/:id/penalties/recalculate
       Resp: { recalculated: number, total_penalty_amount: number }

POST   /api/paiements/:id/mise-en-demeure
       Resp: { paiement: Paiement, pdf_url: string }
```

### 3.5 Recouvrement (prescription)

```
GET    /api/residences/:id/recouvrement
       Query: exercice?
       Resp: {
         total_impaye: number,
         total_penalites: number,
         nb_lots_en_retard: number,
         prescription_risks: [
           { coproprietaire_id, lot_numero, montant, date_origine, jours_restants, severite: 'low'|'medium'|'high'|'critical' }
         ],
         lots: [
           { lot_id, lot_numero, coproprietaire_nom, montant_du, montant_penalites, anciennete_jours, statut }
         ]
       }
```

**Règle de prescription** (Loi 18-00 + Code des obligations marocain) : créances de charges de copropriété **prescrites après 5 ans** (sans interruption). Alertes :
- `low` : ancienneté < 3 ans
- `medium` : 3 ans ≤ ancienneté < 4 ans
- `high` : 4 ans ≤ ancienneté < 4.5 ans
- `critical` : ancienneté ≥ 4.5 ans (action légale immédiate requise)

### 3.6 Occupants

```
GET    /api/lots/:id/occupants
POST   /api/lots/:id/occupants
PUT    /api/occupants/:id
DELETE /api/occupants/:id

GET    /api/residences/:id/occupants  -- liste agrégée pour la résidence
```

---

## 4. Type contracts (TS pour le frontend)

Je vais publier ces types dans `frontend/src/services/*.service.ts` — ils doivent matcher exactement ce que tu renvoies :

```ts
// audit.service.ts
export type AuditLog = {
  id: number
  category: 'immeuble' | 'lot' | 'coproprietaire' | 'paiement' | 'depense'
          | 'budget' | 'ag' | 'document' | 'user' | 'auth' | 'system'
  action: string
  severity: 'info' | 'warning' | 'sensitive' | 'error'
  target_type?: string
  target_id?: number
  target_label?: string
  user_email?: string
  payload?: Record<string, unknown>
  ip_address?: string
  created_at: string
}

// annexe.service.ts
export type AnnexeStatus = { num: string; required: boolean; available: boolean; last_generated?: string }
export type AnnexeData = Record<string, unknown>  // shape dépend de annexe_num

// compliance.service.ts
export type ComplianceTask = {
  id: number
  phase: 'operations_mensuelles' | 'cloture_exercice' | 'preparation_ag' | 'archivage'
  task_key: string
  task_label: string
  due_date?: string
  status: 'pending' | 'in_progress' | 'done' | 'skipped' | 'overdue'
  completed_at?: string
}

// penalty.service.ts
export type PenaltyConfig = {
  enabled: boolean
  grace_period_days: number
  rate_type: 'fixed' | 'percentage' | 'daily'
  rate_value: number
  cap_max_montant?: number
  ag_approved_at?: string
}

// recouvrement.service.ts
export type PrescriptionRisk = {
  coproprietaire_id: number
  lot_numero: string
  montant: number
  date_origine: string
  jours_restants: number
  severite: 'low' | 'medium' | 'high' | 'critical'
}

// occupant.service.ts
export type Occupant = {
  id: number
  lot_id: number
  coproprietaire_id?: number
  nom: string
  telephone?: string
  email?: string
  type: 'proprietaire_occupant' | 'locataire' | 'usufruitier' | 'autre'
  date_debut: string
  date_fin?: string
}
```

---

## 5. Ordre de livraison conseillé

Pour que le frontend puisse débrancher les mocks au fur et à mesure :

1. **Semaine 1 — Jour 1-2** : `audit_logs` schema + middleware + endpoints `GET /api/audit-logs`. **Le plus simple, débloque la sécurité B2B.**
2. **Semaine 1 — Jour 3** : `occupants` schema + CRUD.
3. **Semaine 1 — Jour 4-5** : `penalty_configs` + endpoint config + `PenaltyCalculatorJob`.
4. **Semaine 2 — Jour 1-2** : `compliance_calendar_tasks` + seeder + endpoints.
5. **Semaine 2 — Jour 3-4** : Annexe 10 (la plus simple, agrégat direct) + endpoint + PDF.
6. **Semaine 2 — Jour 5** : Annexes 13-1 et 13-2 (plus complexes, dépendent du plan comptable — peut glisser au Sprint 5).

---

## 6. Référentiels légaux à connaître

- **Loi 18-00** sur la copropriété (texte officiel) — articles 16-20 pour les AG, art 25 pour les comptes, art 26 pour le bilan semestriel.
- **Décret 2.23.700** (juillet 2023) — annexes comptables obligatoires (1-13), régime simplifié vs normal.
- **Code des obligations et contrats marocain** — prescription quinquennale des créances périodiques.

PDFs des textes officiels disponibles ici (à uploader dans `/docs/legal/`) :
- `loi-18-00.pdf`
- `decret-2-23-700.pdf`

---

## 7. Tests à écrire (backend)

Ce qu'on s'attend à voir en PR :

- `AuditLogsTest` : création auto sur `Building::create()`, `Paiement::update()`, etc.
- `PenaltyCalculatorJobTest` : 0 jours grace → 0 pénalité ; 16 jours grace, 5% rate, 1000 MAD impayé → 50 MAD pénalité.
- `ComplianceCalendarSeederTest` : à la création d'un exercice, 22 tasks créées (12 mensuelles + 10 cycle).
- `PrescriptionRiskTest` : créance datée 4.6 ans → severité `critical`.
- `AnnexeGeneratorTest` : Annexe 10 sur résidence avec 5 lots, 3 payés, 2 impayés → totaux corrects.

---

## 8. Questions ouvertes à clarifier ensemble

- **Pénalités AG** : faut-il un endpoint pour stocker la décision d'AG qui a voté les pénalités (preuve légale) ? Je pense `penalty_configs.ag_id` suffit.
- **Mise en demeure** : génération PDF côté backend ou côté frontend (jsPDF) ? Backend est plus solide juridiquement.
- **Annexes pour résidence multi-immeubles** : agrégat par résidence ou par immeuble ? Convention Décret = par résidence (= par syndic), pas par immeuble.
- **Audit logs rétention** : combien de temps on garde ? Je propose 7 ans (durée légale comptable MA).

---

## 9. ⭐ MAJ — PDFs des 11 annexes générés côté frontend (mai 2026)

Toutes les annexes du **Décret 2.23.700** sont maintenant générées par le frontend
en jsPDF dans `src/lib/annexes-pdf.ts`. Le bouton **PDF** sur `/gestionnaire/annexes`
télécharge un document signé Imaro avec :
- En-tête navy/orange + logo Imaro inverted + badge "DOCUMENT OFFICIEL"
- QR code scannable navy-sur-blanc encodant `https://imaro.ma/verify/{doc-code}`
- Footer "Conforme au décret n° 2.23.700"

### 9.1 Ce que le frontend a **déjà**

| Annexe | Frontend | Source de données actuelle |
|---|---|---|
| **3 — Bilan complet** | ✅ généré (2 pages) avec sections ACTIF/PASSIF par groupe (Plan Comptable Marocain) | Zéros par défaut |
| **4 — Compte de résultat complet** | ✅ généré (multi-pages, 30+ comptes 6xxx/7xxx) | Zéros par défaut |
| **5 — Suivi du budget** | ✅ généré (Prévu vs Réalisé vs Écart) | Zéros par défaut |
| **6 — Travaux non courants** | ✅ généré (KPIs + table) | Zéros par défaut |
| **7 — Mouvements de trésorerie** | ✅ généré (Encaissements + Décaissements) | Zéros par défaut |
| **8 — Suivi des emprunts** | ✅ généré (KPIs + table tableau d'amortissement) | Zéros par défaut |
| **9 — Suivi des équipements** | ✅ généré (KPIs + inventaire) | Zéros par défaut |
| **10 — Contributions copropriétaires** | ✅ généré | **Données réelles** depuis `getCoproprietaires` + `getImpayes` |
| **11 — Bilan simplifié** | ✅ généré | Zéros par défaut |
| **12 — Compte de résultat simplifié** | ✅ généré (avec hero "Résultat Final") | Zéros par défaut |
| **13-1 — Bilan très simplifié** | ✅ généré | Zéros par défaut |
| **13-2 — Compte de gestion + budget** | ✅ généré | Zéros par défaut |

### 9.2 Ce dont j'ai besoin de toi (par ordre de priorité)

#### 🥇 Priorité 1 — Endpoint de **vérification QR**

```
GET /api/verify/:docCode
→ Page HTML publique (pas de auth) qui affiche :
  - "Document authentique ✓" ou "Document non trouvé"
  - Métadonnées : résidence, exercice, type d'annexe, date génération, gestionnaire
  - Hash SHA-256 du contenu pour preuve d'intégrité
```

Quand un copropriétaire / auditor scanne le QR, c'est ce qui s'affiche. Il faut
stocker un enregistrement par PDF généré :

```sql
CREATE TABLE annexes_generated (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id BIGINT UNSIGNED NOT NULL,
  residence_id BIGINT UNSIGNED NOT NULL,
  exercice INT UNSIGNED NOT NULL,
  annexe_num VARCHAR(10) NOT NULL,       -- '3', '4', ..., '13-2'
  doc_code VARCHAR(64) UNIQUE NOT NULL,  -- 'IMA-ATLA-2026-A10-D336'
  content_hash CHAR(64) NOT NULL,        -- SHA-256
  generated_by BIGINT UNSIGNED NOT NULL,
  generated_at TIMESTAMP NOT NULL,
  payload_json JSON NOT NULL,            -- l'agrégat utilisé pour la génération
  pdf_url VARCHAR(500) NULL,             -- optionnel : si on stocke aussi le PDF
  INDEX idx_doc_code (doc_code),
  INDEX idx_residence_exercice (residence_id, exercice)
);
```

À chaque génération côté frontend, le frontend POSTe les métadonnées :
```
POST /api/annexes/register
{ doc_code, residence_id, exercice, annexe_num, content_hash, payload }
→ { id, verify_url }
```

#### 🥈 Priorité 2 — Endpoints **données par annexe**

Pour que les PDFs aient des chiffres réels (pas des zéros), j'ai besoin des
agrégats déjà calculés côté backend. Le frontend les passe ensuite directement
aux générateurs.

```
GET /api/residences/:id/annexes/3?exercice=YYYY
→ Annexe3Input (cf. types frontend src/lib/annexes-pdf.ts)
   {
     actif: { sections: [{ title, rows: [{code,libelle,currentValue,previousValue}], total }], total },
     passif: { sections: [...], total },
   }

GET /api/residences/:id/annexes/4?exercice=YYYY
→ Annexe4Input
   {
     totals: { charges, produits, resultat },
     chargesSections: [{ title, rows: [{code,libelle,q:{n1,n,n0,nMinus1}}], total }],
     produitsSections: [...],
     totalCharges, totalProduits, resultatNet,  // tous Quad
   }

GET /api/residences/:id/annexes/5?exercice=YYYY
→ Annexe5Input { totals: {prevu,realise,ecart}, rows: [{libelle,prevu,realise,ecart}] }

GET /api/residences/:id/annexes/6?exercice=YYYY
→ Annexe6Input { totals: {vote,engage,regle,reste}, rows: [{libelle,date,montantVote,montantEngage,montantRegle}] }

GET /api/residences/:id/annexes/7?exercice=YYYY
→ Annexe7Input { totals: {soldeOuverture,encaissements,decaissements,soldeCloture}, encaissements: [...], decaissements: [...] }

GET /api/residences/:id/annexes/8?exercice=YYYY
→ Annexe8Input { totals: {emprunte,paye,reste}, rows: [{libelle,organisme,dateDebut,montantInitial,paye,reste}] }

GET /api/residences/:id/annexes/9?exercice=YYYY
→ Annexe9Input { totals: {nbArticles,valeurTotale,valeurNetteTotale}, rows: [{designation,categorie,dateAcquisition,valeurAcquisition,valeurNette}] }

GET /api/residences/:id/annexes/10?exercice=YYYY
→ Annexe10Input { totals: {soldeInitial,appele,paye,soldeFinal}, rows: [{lotNumero,coproprietaireNom,...}] }
   (côté frontend déjà calculé partiellement depuis `Coproprietaire.solde` et `Impaye`)

GET /api/residences/:id/annexes/11?exercice=YYYY
→ Annexe11Input { totals: {actif,passif}, actifRows: [...], passifRows: [...] }

GET /api/residences/:id/annexes/12?exercice=YYYY
→ Annexe12Input { resultatFinal, chargesCourantes: [...], totalChargesCourantes, ..., resultatCourant, resultatNonCourant, resultatFinalQuad }

GET /api/residences/:id/annexes/13-1?exercice=YYYY
→ Annexe13_1Input { current: {fondsReserve,creances,dettes,tresorerie}, previous: {...} }

GET /api/residences/:id/annexes/13-2?exercice=YYYY
→ Annexe13_2Input { excedent, recettes: {cotisations,fondsReserve,autresAg,autresProduits}, depenses: {matieres,servicesExterieurs,impotsTaxes,personnel,autresCharges} }
```

**Source des données dans la base** (où tu les calcules) :
- Annexes 3, 4, 11, 12 : agrégats du **journal comptable** (`ecritures_comptables.ecriture_lignes`)
  groupés par classe (6xxx pour charges, 7xxx pour produits, 1xxx/2xxx/3xxx/5xxx pour bilan).
  Filtre par `exercice` (la table `exercices` qui existe déjà).
- Annexe 5 : `budgets` (qu'on a) vs réalisé du compte de résultat.
- Annexe 6 : nouvelle table `travaux_exceptionnels` (déjà documentée plus haut).
- Annexe 7 : agrégats `paiements` + `depenses` groupés par mois ou par catégorie.
- Annexe 8 : nouvelle table `emprunts` (déjà documentée plus haut).
- Annexe 9 : nouvelle table `equipements` (déjà documentée plus haut).
- Annexe 10 : `coproprietaires` + agrégats `paiements` + `appels_fonds_lignes`.
- Annexes 13-1 / 13-2 : versions simplifiées des données des Annexes 3 et 4.

#### 🥉 Priorité 3 — **Liste annexes par résidence/exercice**

L'endpoint actuel mocké `GET /api/residences/:id/compliance/annexes?exercice=YYYY`
doit retourner :

```json
{
  "exercice": 2026,
  "regime": "simplifie" | "normal",  // calculé sur recettes annuelles ≤ 200000 MAD
  "annexes": [
    { "num": "10",   "required": true,  "available": true,  "last_generated": "2026-..." },
    { "num": "13-1", "required": true,  "available": true,  "last_generated": null },
    { "num": "13-2", "required": true,  "available": true,  "last_generated": null },
    { "num": "3",    "required": false, "available": true,  "last_generated": null },
    ...
    { "num": "12",   "required": false, "available": true,  "last_generated": null }
  ]
}
```

`required` est dérivé du régime :
- **Régime simplifié** (≤ 200 000 MAD/an) : 10, 13-1, 13-2 obligatoires
- **Régime normal** : 3, 4, 10 obligatoires (et les autres restent disponibles si données présentes)

`available: true` = on a assez de données pour générer un PDF significatif.

---

## 10. ⚠ Important — message à Abdellah

**Statut actuel** : tu peux merger la PR `feat/frontend-sprint4-conformite` dès
maintenant, tout fonctionne avec des données nulles. Les PDFs sont déjà beaux,
ils manquent juste les chiffres.

**Quand tu auras un peu de temps**, attaque dans cet ordre :

1. **Verify endpoint** (1-2 jours) — débloque la fonctionnalité QR
2. **Annexe 10** (2 jours) — agrégats à partir des paiements + appels de fonds existants
3. **Annexes 13-1 + 13-2** (3 jours) — les autres requises ; demandent plan comptable
4. **Annexes 3, 4** (3 jours) — bilan + compte de résultat complets ; le plus gros morceau
5. **Annexes 11, 12** (1 jour) — versions simplifiées des 3+4, presque gratuit une fois 3+4 faits
6. **Annexes 5, 6, 7, 8, 9** (2 jours) — modules dédiés

**Total estimé** : ~12-14 jours pour avoir tous les PDFs avec données réelles.

Tu peux livrer **incrementalement** — chaque endpoint qui arrive remplit son
annexe sans casser le reste. Le frontend bascule automatiquement de "données
zéro" à "données réelles" dès qu'on remplace le ctx par les vraies données.

Si tu as la moindre question sur les formats JSON attendus, ping-moi et je te
donne un exemple complet. Tous les types TypeScript sont dans
`frontend/src/lib/annexes-pdf.ts` (exportés en haut de chaque section).
