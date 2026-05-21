# API Finances — Documentation backend (Abdellah)

**Généré le :** 2026-05-17  
**Sprint :** 3 — Module Finances  
**Frontend :** Mouad (baamrane)  
**Backend :** Abdellah

---

## 1. Audit — État actuel vs à construire

### Existant (ne pas toucher)

| Endpoint | Méthode | Statut |
|---|---|---|
| `/gestionnaire/paiements` | GET/POST | Existant |
| `/gestionnaire/impayes` | GET | Existant |
| `/gestionnaire/appels-fonds` | GET/POST | Existant |
| `/gestionnaire/appels-fonds/{id}/envoyer` | POST | Existant |
| `/gestionnaire/comptabilite/exercices/{id}/depenses` | GET/POST | Existant |
| `/gestionnaire/comptabilite/exercices/{id}/encaissements` | GET/POST | Existant |
| `/gestionnaire/budgets` | GET/POST | Existant (Budget simple) |
| `/gestionnaire/budgets/{id}/postes` | GET/POST/PUT/DELETE | Existant |

### À construire (nouveaux endpoints)

Voir sections 2, 3, 4 ci-dessous.

---

## 2. Module Paiements — Créances & Encaissements

### 2.1 Créances

#### `GET /gestionnaire/creances`

Retourne les créances (lignes d'appels de fonds) avec leur statut de recouvrement.

**Query params :**
- `statut` : `a_payer | en_retard | paye | partiellement_paye | annulee`
- `search` : recherche par nom copropriétaire ou numéro lot
- `appel_fonds_id` : filtrer par appel de fonds
- `residence_id` : filtrer par résidence

**Réponse 200 :**
```json
{
  "data": [
    {
      "id": 1,
      "appel_fonds_id": 1,
      "appel_fonds_titre": "Charges Q1 2026",
      "coproprietaire_id": 1,
      "coproprietaire_nom": "Hassan Benali",
      "lot_numero": "A-01",
      "montant_initial": 900.00,
      "montant_regle": 0.00,
      "solde_restant": 900.00,
      "date_echeance": "2026-03-31",
      "date_derniere_relance": "2026-04-15",
      "statut": "en_retard",
      "nb_relances": 2,
      "jours_retard": 45
    }
  ]
}
```

**Logique statut :**
- `a_payer` : `montant_regle = 0` ET `date_echeance >= aujourd'hui`
- `en_retard` : `montant_regle < montant_initial` ET `date_echeance < aujourd'hui`
- `paye` : `montant_regle >= montant_initial`
- `partiellement_paye` : `0 < montant_regle < montant_initial` ET `date_echeance >= aujourd'hui`
- `annulee` : annulée manuellement
- `jours_retard` : `MAX(0, today - date_echeance)` en jours

#### `POST /gestionnaire/creances/{id}/relancer`

Envoie une relance WhatsApp au copropriétaire pour cette créance.

**Body :** vide  
**Réponse 200 :** `{ "data": { "message": "Relance envoyée" } }`

**Format WhatsApp :**
```
Bonjour {nom_coproprietaire},

Votre immeuble *{residence_name}* — Résidence Imaro vous rappelle que 
la somme de *{montant_restant} DH* est due depuis le {date_echeance}.

Lot : {lot_numero} | Appel : {appel_fonds_titre}

Merci de régulariser votre situation.
Syndic Imaro
```

#### `POST /gestionnaire/creances/relancer-tout`

Envoie une relance à tous les copropriétaires ayant des créances impayées/en retard.

**Réponse 200 :**
```json
{ "data": { "nb_envoye": 3 } }
```

**Logique :** Ne pas envoyer si une relance a déjà été envoyée dans les dernières 24h pour la même créance.

### 2.2 Encaissements (paiements.service.ts)

> Note : différent de l'endpoint existant dans `comptabilite.service.ts`. Celui-ci est plus riche (est_avance, est_rapproche, recu_path).

#### `GET /gestionnaire/encaissements`

**Query params :**
- `methode` : `especes | virement | cheque | cb | mobile_money`
- `from` : date ISO (YYYY-MM-DD)
- `to` : date ISO
- `search` : nom ou lot

**Réponse 200 :**
```json
{
  "data": [
    {
      "id": 1,
      "creance_id": 2,
      "coproprietaire_id": 2,
      "coproprietaire_nom": "Fatima Chraibi",
      "lot_numero": "A-02",
      "appel_fonds_titre": "Charges Q1 2026",
      "montant": 750.00,
      "date_paiement": "2026-03-18",
      "methode": "virement",
      "reference_cheque": null,
      "compte_destination": "5121",
      "est_avance": false,
      "recu_path": "storage/recus/recu-fatima-2026-03.pdf",
      "est_rapproche": true
    }
  ]
}
```

#### `POST /gestionnaire/encaissements`

Enregistre un encaissement et génère automatiquement une écriture comptable.

**Body :**
```json
{
  "creance_id": 2,
  "montant": 750.00,
  "date_paiement": "2026-03-18",
  "methode": "virement",
  "reference_cheque": null,
  "compte_destination": "5121"
}
```

**Logique métier automatique :**
1. Mettre à jour `creance.montant_regle += montant`
2. Recalculer `creance.statut` selon les règles ci-dessus
3. Créer écriture comptable :
   - Débit `5121` (ou `5122`/`5161` selon `compte_destination`) : montant
   - Crédit `3421` (Créances copropriétaires) : montant
   - Description : `Encaissement lot {lot_numero} — {coproprietaire_nom} — {appel_fonds_titre}`
4. Générer un reçu PDF (async, stocker dans `recu_path`)

**Réponse 201 :** objet Encaissement

#### `POST /gestionnaire/encaissements/avance`

Enregistre un paiement en avance (pas lié à une créance existante).

**Body :**
```json
{
  "coproprietaire_id": 9,
  "montant": 1200.00,
  "date_paiement": "2026-04-10",
  "methode": "virement",
  "compte_destination": "5121",
  "notes": "Avance sur charges Q2"
}
```

**Logique :** Créer un encaissement avec `est_avance = true`, `creance_id = null`. Affecter aux prochaines créances du copropriétaire lors du prochain appel de fonds (job ou trigger).

### 2.3 Virements déclarés

#### `GET /gestionnaire/virements-declares`

**Réponse 200 :**
```json
{
  "data": [
    {
      "id": 1,
      "coproprietaire_id": 10,
      "coproprietaire_nom": "Khalid Bennani",
      "lot_numero": "B-01",
      "montant": 650.00,
      "date_declaration": "2026-05-10",
      "reference": "VIR-MAR-2026-0441",
      "justificatif_path": "storage/virements/virement-khalid.pdf",
      "statut": "en_attente",
      "valide_par": null,
      "date_validation": null
    }
  ]
}
```

#### `POST /gestionnaire/virements-declares/{id}/valider`

Valide un virement déclaré → crée automatiquement un encaissement.

**Réponse 200 :** objet VirementDeclare avec `statut: "valide"`

#### `POST /gestionnaire/virements-declares/{id}/rejeter`

**Body :** `{ "motif": "Référence incorrecte" }`  
**Réponse 200 :** objet VirementDeclare avec `statut: "rejete"`

### 2.4 Décomptes

#### `GET /gestionnaire/decomptes/{coproprietaireId}`

Retourne le décompte individuel complet du copropriétaire pour l'exercice actif.

**Réponse 200 :**
```json
{
  "data": {
    "coproprietaire_id": 1,
    "coproprietaire_nom": "Hassan Benali",
    "lot_numero": "A-01",
    "tantieme": 45,
    "exercice_annee": 2026,
    "total_appele": 900.00,
    "total_paye": 0.00,
    "solde": -900.00,
    "detail": [
      {
        "appel_fonds_titre": "Charges Q1 2026",
        "date_echeance": "2026-03-31",
        "montant_du": 900.00,
        "montant_paye": 0.00,
        "statut": "en_retard"
      }
    ]
  }
}
```

---

## 3. Module Dépenses (Finance)

> Distinct des dépenses comptables simples (`/comptabilite/depenses`). Ce module ajoute : approbation, modèles récurrents, import IA, multi-résidence.

### 3.1 Dépenses Finance

#### `GET /gestionnaire/depenses-finance`

**Query params :**
- `compte` : numéro compte PCG (ex: `6111`)
- `prestataire` : recherche textuelle
- `from`, `to` : dates ISO
- `statut_approbation` : `approuve | en_attente | rejete`
- `residence_id`
- `exercice_id`

**Réponse 200 :**
```json
{
  "data": [
    {
      "id": 1,
      "exercice_id": 1,
      "residence_id": 1,
      "residence_nom": "Atlas Casablanca",
      "titre": "Gardiennage Janvier 2026",
      "montant": 3500.00,
      "date": "2026-01-05",
      "prestataire_id": 1,
      "prestataire_nom": "Sécurité Atlas SARL",
      "compte_charge": "6111",
      "libelle_compte": "Gardiennage/Surveillance",
      "mode_paiement": "virement",
      "justificatif_path": "storage/depenses/facture-gardiennage-jan26.pdf",
      "ecriture_id": 1,
      "est_recurrente": true,
      "statut_approbation": "approuve",
      "approuve_par": "Admin Gestionnaire"
    }
  ]
}
```

#### `POST /gestionnaire/depenses-finance`

**Body :** `multipart/form-data`
- `titre` : string
- `montant` : number
- `date` : YYYY-MM-DD
- `compte_charge` : string (numéro PCG)
- `mode_paiement` : `virement | cheque | especes | cb | prelevement | autre`
- `prestataire` : string (optionnel)
- `justificatif` : File (optionnel)
- `residence_id` : number
- `exercice_id` : number

**Logique métier :**
1. Si `montant > 5000` → `statut_approbation = "en_attente"`, sinon `"approuve"`
2. Créer écriture comptable automatique :
   - Débit `{compte_charge}` : montant
   - Crédit `4411` (Fournisseurs) : montant
3. Si justificatif fourni : stocker dans `storage/depenses/`
4. Si modèle récurrent associé : lier avec `est_recurrente = true`

**Réponse 201 :** objet DepenseFinance

#### `DELETE /gestionnaire/depenses-finance/{id}`

**Réponse 204 :** vide (supprimer aussi l'écriture comptable si non verrouillée)

#### `POST /gestionnaire/depenses-finance/{id}/approuver`

Approuve une dépense en attente. Notifie le gestionnaire principal.

**Réponse 200 :** objet DepenseFinance avec `statut_approbation: "approuve"`

#### `POST /gestionnaire/depenses-finance/{id}/rejeter`

**Body :** `{ "motif": "Justificatif insuffisant" }`  
**Réponse 200 :** objet DepenseFinance avec `statut_approbation: "rejete"`

#### `GET /gestionnaire/depenses-finance/stats`

**Réponse 200 :**
```json
{
  "data": {
    "total_periode": 12050.00,
    "nb_depenses": 6,
    "montant_moyen": 2008.33,
    "en_attente_approbation": 1,
    "evolution_mensuelle": [
      { "mois": "Jan", "montant": 5000.00 },
      { "mois": "Fév", "montant": 4000.00 },
      { "mois": "Mar", "montant": 650.00 },
      { "mois": "Avr", "montant": 2400.00 },
      { "mois": "Mai", "montant": 0.00 }
    ],
    "top_comptes": [
      { "compte": "6111", "libelle": "Gardiennage", "montant": 3500.00, "pct": 29.0 }
    ],
    "top_prestataires": [
      { "nom": "Sécurité Atlas SARL", "montant": 3500.00, "nb": 1 }
    ]
  }
}
```

#### `POST /gestionnaire/depenses-finance/import-ia`

Analyse une facture (PDF/image) par OCR + LLM et suggère les champs.

**Body :** `multipart/form-data` — `file` : File

**Réponse 200 :**
```json
{
  "data": {
    "titre": "Facture Gardiennage Juin",
    "montant": 3500.00,
    "date": "2026-06-01",
    "fournisseur": "Sécurité Atlas SARL",
    "compte_charge_suggere": "6111",
    "confiance": "haute"
  }
}
```

**Niveaux de confiance :**
- `haute` : tous les champs extraits avec certitude ≥ 90%
- `moyenne` : certitude 60-90%
- `faible` : certitude < 60%

### 3.2 Modèles récurrents

#### `GET /gestionnaire/depenses-finance/recurrentes`

**Réponse 200 :**
```json
{
  "data": [
    {
      "id": 1,
      "residence_id": 1,
      "residence_nom": "Atlas Casablanca",
      "titre": "Gardiennage mensuel",
      "montant": 3500.00,
      "compte_charge": "6111",
      "libelle_compte": "Gardiennage/Surveillance",
      "mode_paiement": "virement",
      "prestataire_nom": "Sécurité Atlas SARL",
      "frequence": "mensuelle",
      "jour_emission": 1,
      "date_debut": "2026-01-01",
      "date_fin": null,
      "actif": true,
      "prochaine_emission": "2026-06-01"
    }
  ]
}
```

#### `POST /gestionnaire/depenses-finance/recurrentes`

**Body (JSON) :**
```json
{
  "residence_id": 1,
  "titre": "Gardiennage mensuel",
  "montant": 3500.00,
  "compte_charge": "6111",
  "mode_paiement": "virement",
  "prestataire_nom": "Sécurité Atlas SARL",
  "frequence": "mensuelle",
  "jour_emission": 1,
  "date_debut": "2026-01-01",
  "date_fin": null
}
```

**Réponse 201 :** objet ModeleRecurrent

#### `POST /gestionnaire/depenses-finance/recurrentes/{id}/toggle`

Active/désactive un modèle récurrent.

**Réponse 200 :** objet ModeleRecurrent avec `actif` basculé

---

## 4. Module Budget Annexe 5

### 4.1 Budget Annexe 5

#### `GET /gestionnaire/residences/{residenceId}/exercices/{exerciceId}/budget-annexe5`

**Réponse 200 :**
```json
{
  "data": {
    "id": 10,
    "exercice": { "id": 1, "annee": 2026, "statut": "actif" },
    "residence": { "id": 1, "name": "Atlas Casablanca" },
    "statut": "brouillon",
    "version": 1,
    "total_charges": 128000.00,
    "total_produits": 208000.00,
    "resultat": 80000.00,
    "lignes": [
      {
        "id": 1,
        "budget_id": 10,
        "compte_pcg": "6111",
        "libelle": "Gardiennage/Surveillance",
        "type": "charge_courante",
        "realise_n1": 38000.00,
        "budget_n": 42000.00,
        "engagement": 7000.00,
        "realise": 14000.00,
        "pct_consomme": 33,
        "ordre": 1
      }
    ]
  }
}
```

**Si aucun budget n'existe :** retourner `{ "data": null }` (HTTP 200, pas 404)

#### `PUT /gestionnaire/budgets/lignes/{ligneId}`

Mise à jour en temps réel d'une ligne (déclenchée à chaque modification inline).

**Body :** `{ "budget_n": 44000.00 }`  
**Réponse 200 :** objet LigneBudget mis à jour avec `pct_consomme` recalculé

#### `PUT /gestionnaire/budgets/{budgetId}/lignes/bulk`

Mise à jour en masse de plusieurs lignes (ex: apply suggestions IA).

**Body :**
```json
{
  "lignes": [
    { "id": 1, "budget_n": 44000.00 },
    { "id": 2, "budget_n": 33500.00 }
  ]
}
```

**Réponse 200 :** tableau de LigneBudget

#### `POST /gestionnaire/budgets/{budgetId}/lignes`

Ajoute une ligne à un budget.

**Body :**
```json
{
  "compte_pcg": "6174",
  "libelle": "Espaces verts",
  "type": "charge_courante",
  "budget_n": 12000.00,
  "ordre": 6
}
```

**Réponse 201 :** objet LigneBudget

#### `DELETE /gestionnaire/budgets/lignes/{ligneId}`

**Réponse 204 :** vide

#### `POST /gestionnaire/budgets/{budgetId}/soumettre-ag`

Passe le budget en statut `soumis_ag`. Génère un PDF Annexe 5.

**Réponse 200 :** objet BudgetAnnexe5 avec `statut: "soumis_ag"`

**Pré-condition :** `statut` doit être `brouillon`

#### `POST /gestionnaire/budgets/{budgetId}/verrouiller`

Passe le budget en statut `verrouille`. Aucune modification possible ensuite.

**Réponse 200 :** objet BudgetAnnexe5 avec `statut: "verrouille"`

**Pré-condition :** `statut` doit être `approuve`

### 4.2 Simulation cotisations

#### `GET /gestionnaire/budgets/{budgetId}/simulation`

Calcule la répartition des cotisations par tantième.

**Réponse 200 :**
```json
{
  "data": {
    "budget_charges_total": 128000.00,
    "lots": [
      {
        "lot_numero": "A-01",
        "coproprietaire_nom": "Hassan Benali",
        "tantieme": 45,
        "pct": 4.5,
        "cotisation_annuelle": 5760.00,
        "cotisation_mensuelle": 480.00,
        "variation_vs_n1": 8.5
      }
    ]
  }
}
```

**Formule :** `cotisation_annuelle = (tantieme / 1000) * budget_charges_total`

### 4.3 Suggestions IA

#### `GET /gestionnaire/budgets/{budgetId}/suggestions-ia`

Génère des suggestions budgétaires basées sur N-1 + tendances de marché.

**Réponse 200 :**
```json
{
  "data": [
    {
      "compte_pcg": "6111",
      "libelle": "Gardiennage/Surveillance",
      "montant_suggere": 44000.00,
      "montant_n1": 38000.00,
      "variation_pct": 15.8,
      "justification": "Hausse du SMIG 2026 impactant le coût des agents de sécurité (+15%)"
    }
  ]
}
```

---

## 5. Règles métier

### 5.1 Seuil d'approbation dépenses

- Dépenses ≤ 5 000 MAD : auto-approuvées
- Dépenses > 5 000 MAD : `statut_approbation = "en_attente"`
- Notifier les membres du conseil syndical par WhatsApp
- Message approbation : `"Dépense de {montant} MAD ({titre}) nécessite votre approbation sur Imaro."`

### 5.2 Transitions statut créance

```
a_payer → en_retard (automatique, J+1 après date_echeance)
a_payer → paye (sur encaissement total)
a_payer → partiellement_paye (sur encaissement partiel)
en_retard → paye (sur encaissement total)
en_retard → partiellement_paye (sur encaissement partiel)
partiellement_paye → paye (sur encaissement du solde)
tout → annulee (action manuelle gestionnaire)
```

### 5.3 Écriture comptable automatique sur encaissement

```
Journal des encaissements :
DR  5121 (ou 5122/5161)    {montant}   — Compte bancaire
    CR  3421               {montant}   — Créances copropriétaires
Description : "Encaissement — {lot} — {coproprietaire} — {appel_fonds}"
```

### 5.4 Écriture comptable automatique sur dépense

```
Journal des dépenses :
DR  {compte_charge} (6xxx)  {montant}  — Charge
    CR  4411               {montant}   — Fournisseurs
Description : "{titre} — {prestataire}"
```

---

## 6. Cron jobs

### 6.1 Relances automatiques

| Déclencheur | Condition | Action |
|---|---|---|
| Tous les jours à 08h00 | Créance `en_retard` AND `jours_retard = 7` | Envoyer relance WhatsApp J+7 |
| Tous les jours à 08h00 | Créance `en_retard` AND `jours_retard = 30` | Envoyer relance WhatsApp J+30 |
| Tous les jours à 08h00 | Créance `en_retard` AND `jours_retard = 60` | Envoyer relance WhatsApp J+60 (ton plus urgent) |

**Template WhatsApp J+7 :**
```
Rappel — Votre cotisation de *{montant} DH* est due depuis le {date_echeance}.
Résidence {residence} — Lot {lot}
Réglez via votre espace Imaro : {portail_url}
```

**Template WhatsApp J+60 :**
```
URGENT — Votre dette de *{montant} DH* est en souffrance depuis 60 jours.
Sans règlement dans les 15 jours, un rappel formel sera émis conformément
à la Loi 18-00.
Syndic {residence}
```

### 6.2 Émission dépenses récurrentes

Cron tous les jours à 06h00 :
1. Lire tous les `ModeleRecurrent` avec `actif = true`
2. Si `prochaine_emission = today` → créer une `DepenseFinance` correspondante
3. Mettre à jour `prochaine_emission` selon la `frequence`
4. Si `date_fin` atteinte → mettre `actif = false`

---

## 7. Workflow approbation dépenses > 5 000 MAD

```
Gestionnaire crée dépense (montant > 5000)
  ↓
statut_approbation = "en_attente"
  ↓
Notification WhatsApp → membres conseil syndical
  ↓
Chaque membre vote (Approuver / Rejeter) depuis l'espace gestionnaire
  ↓
Si majorité approuve → statut = "approuve"
Si rejet → statut = "rejete" + notification au gestionnaire avec motif
```

**Note implémentation :** Pour le MVP, un seul gestionnaire suffit. La gestion de vote multi-membres peut être livrée en Sprint 4.

---

## 8. Modèles de données (tables Laravel)

### Table `creances`

```sql
id, appel_fonds_ligne_id, coproprietaire_id, lot_id,
montant_initial, montant_regle, statut,
date_echeance, date_derniere_relance, nb_relances,
created_at, updated_at
```

### Table `encaissements_finances`

```sql
id, creance_id (nullable), coproprietaire_id, lot_id,
montant, date_paiement, methode, reference_cheque,
compte_destination, est_avance, recu_path, est_rapproche,
ecriture_id, created_at, updated_at
```

### Table `virements_declares`

```sql
id, coproprietaire_id, lot_id, montant, date_declaration,
reference, justificatif_path, statut, valide_par,
date_validation, created_at, updated_at
```

### Table `depenses_finances`

```sql
id, exercice_id, residence_id, titre, montant, date,
prestataire_id (nullable), compte_charge, libelle_compte,
mode_paiement, justificatif_path, ecriture_id,
est_recurrente, modele_recurrent_id (nullable),
statut_approbation, approuve_par, created_at, updated_at
```

### Table `modeles_recurrents`

```sql
id, residence_id, titre, montant, compte_charge, libelle_compte,
mode_paiement, prestataire_id (nullable), frequence, jour_emission,
date_debut, date_fin (nullable), actif, prochaine_emission,
created_at, updated_at
```

### Table `budgets_annexe5`

```sql
id, exercice_id, residence_id, statut, version,
total_charges, total_produits, resultat,
created_at, updated_at
```

### Table `lignes_budget`

```sql
id, budget_id, compte_pcg, libelle, type,
realise_n1, budget_n, engagement, realise, pct_consomme, ordre,
created_at, updated_at
```

---

## 9. Codes d'erreur standardisés

Tous les endpoints retournent le format Laravel standard :

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "montant": ["Le montant doit être positif."]
  }
}
```

| HTTP | Signification |
|---|---|
| 200 | Succès |
| 201 | Ressource créée |
| 204 | Suppression réussie |
| 400 | Données invalides |
| 403 | Permission refusée |
| 404 | Ressource non trouvée |
| 409 | Conflit (ex: budget déjà verrouillé) |
| 422 | Validation échouée |
| 500 | Erreur serveur |

---

## 10. Authentification

Tous les endpoints ci-dessus nécessitent :
- Header : `Authorization: Bearer {token}` (Sanctum)
- L'utilisateur doit avoir le rôle `gestionnaire`

Les routes doivent être dans le groupe middleware `auth:sanctum` + gate `role:gestionnaire`.
