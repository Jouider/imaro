# API Comptabilité — Contrat Abdellah

> Document de référence frontend → backend pour le module Comptabilité d'Imaro.  
> Toutes les routes sont préfixées `/api/gestionnaire/` et nécessitent un token Bearer.  
> Format d'enveloppe standard : `{ status: "success"|"error", data: T, message?: string, errors?: Record<string, string[]> }`

---

## 1. Exercices Comptables

### GET `/residences/{residenceId}/comptabilite/exercices`
Retourne la liste des exercices comptables d'une résidence.

**Réponse :**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "residence_id": 1,
      "annee": 2026,
      "statut": "ouvert",
      "date_ouverture": "2026-01-01",
      "date_cloture": null,
      "seuil_comptable": 72000
    },
    {
      "id": 2,
      "residence_id": 1,
      "annee": 2025,
      "statut": "clos",
      "date_ouverture": "2025-01-01",
      "date_cloture": "2025-12-31",
      "seuil_comptable": 68000
    }
  ]
}
```

### POST `/residences/{residenceId}/comptabilite/exercices`
Crée un nouvel exercice comptable.

**Corps :**
```json
{
  "annee": 2027,
  "date_ouverture": "2027-01-01"
}
```

**Règle :** Un seul exercice `ouvert` par résidence à la fois. Si un exercice `ouvert` existe déjà, retourner HTTP 422.

**Réponse :** Objet `ExerciceComptable` créé.

---

## 2. Dashboard Comptabilité

### GET `/comptabilite/exercices/{exerciceId}/dashboard`

**Réponse :**
```json
{
  "status": "success",
  "data": {
    "produits": 18000,
    "charges": 12400,
    "resultat": 5600,
    "tresorerie": 24800,
    "creances": 4500,
    "taux_recouvrement": 78,
    "couverture_tresorerie": 2.4,
    "banque_5121": 18000,
    "cheque_5122": 5200,
    "caisse_5161": 1600,
    "evolution": [
      { "mois": "Jan", "produits": 2400, "charges": 5550 },
      { "mois": "Fév", "produits": 1800, "charges": 4300 }
    ],
    "charges_par_categorie": [
      { "categorie": "Gardiennage", "montant": 3500, "couleur": "#1B4F72" },
      { "categorie": "Maintenance", "montant": 3450, "couleur": "#E67E22" }
    ]
  }
}
```

**Calculs backend :**
- `produits` = SUM de toutes les écritures `type=encaissement` (credit) de l'exercice
- `charges` = SUM de toutes les écritures `type=depense` (debit) de l'exercice
- `resultat` = produits - charges
- `tresorerie` = solde comptes 5121 + 5122 + 5161
- `creances` = solde compte 3421 (créances copropriétaires)
- `taux_recouvrement` = (produits / seuil_comptable) * 100
- `couverture_tresorerie` = tresorerie / (charges / mois_ecoules) — si charges = 0, retourner 99

---

## 3. Journal des Écritures

### GET `/comptabilite/exercices/{exerciceId}/journal`

**Query params :**
- `from` (string, date ISO): filtre date >= from
- `to` (string, date ISO): filtre date <= to
- `search` (string): recherche dans description, numero_compte, libelle_compte

**Réponse :**
```json
{
  "status": "success",
  "data": [
    {
      "id": 3,
      "exercice_id": 1,
      "date": "2026-01-15",
      "numero_compte": "6138",
      "libelle_compte": "Autres rémunérations",
      "description": "Gardiennage Janvier 2026 — Sécurité Atlas SARL",
      "debit": 3500,
      "credit": 0,
      "piece_justificative": "facture-gardiennage-jan26.pdf",
      "type": "depense",
      "locked": false
    }
  ]
}
```

**Règle `locked` :** Toutes les écritures d'un exercice `clos` ont `locked = true`. Aucune modification ou suppression possible.

---

## 4. Grand-Livre

### GET `/comptabilite/exercices/{exerciceId}/grand-livre/{compte}`

Retourne le détail des écritures pour un compte PCG donné, avec le solde progressif.

**Réponse :**
```json
{
  "status": "success",
  "data": {
    "numero": "6131",
    "libelle": "Nettoyage des locaux",
    "solde_ouverture": 0,
    "lignes": [
      {
        "id": 5,
        "date": "2026-02-08",
        "description": "Nettoyage parties communes Février 2026",
        "debit": 1500,
        "credit": 0,
        "solde": 1500
      },
      {
        "id": 10,
        "date": "2026-05-06",
        "description": "Nettoyage parties communes Mai 2026",
        "debit": 1500,
        "credit": 0,
        "solde": 3000
      }
    ],
    "solde_final": 3000
  }
}
```

**Calcul solde progressif :** `solde[n] = solde[n-1] + debit[n] - credit[n]`

---

## 5. Balance des Comptes

### GET `/comptabilite/exercices/{exerciceId}/balance`

Retourne la balance de vérification (tous comptes mouvementés).

**Réponse :**
```json
{
  "status": "success",
  "data": [
    {
      "numero": "5121",
      "libelle": "Banque principale",
      "classe": 5,
      "total_debit": 18000,
      "total_credit": 0,
      "solde_debiteur": 18000,
      "solde_crediteur": 0
    },
    {
      "numero": "7111",
      "libelle": "Provisions sur opérations courantes",
      "classe": 7,
      "total_debit": 0,
      "total_credit": 2750,
      "solde_debiteur": 0,
      "solde_crediteur": 2750
    }
  ]
}
```

**Règle équilibre :** SUM(total_debit) == SUM(total_credit) obligatoirement.

---

## 6. Dépenses

### GET `/comptabilite/exercices/{exerciceId}/depenses`

**Réponse :**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "exercice_id": 1,
      "titre": "Gardiennage Janvier 2026",
      "montant": 3500,
      "date": "2026-01-05",
      "prestataire_id": 1,
      "prestataire_nom": "Sécurité Atlas SARL",
      "compte_charge": "6138",
      "libelle_compte": "Autres rémunérations",
      "mode_paiement": "virement",
      "justificatif_path": "facture-gardiennage-jan26.pdf",
      "ecriture_id": 1
    }
  ]
}
```

### POST `/comptabilite/exercices/{exerciceId}/depenses`

**Corps (multipart/form-data) :**
- `titre` (string, requis)
- `montant` (number, requis, > 0)
- `date` (date ISO, requis)
- `compte_charge` (string, requis — doit être un compte de classe 6)
- `mode_paiement` (enum: `virement|cheque|especes|cb|prelevement|autre`)
- `prestataire` (string, optionnel)
- `justificatif` (file, optionnel — PDF/JPEG/PNG, max 10 Mo)

**Génération automatique d'écriture comptable :**

| mode_paiement | Écriture générée |
|---------------|-----------------|
| `virement`    | D{compte_charge} / C5121 |
| `cheque`      | D{compte_charge} / C5122 |
| `especes`     | D{compte_charge} / C5161 |
| `prelevement` | D{compte_charge} / C5121 |
| `cb`          | D{compte_charge} / C5121 |
| `autre`       | D{compte_charge} / C5121 |

L'écriture créée a `type = "depense"` et `locked = false`.

**Réponse :** Objet `Depense` créé.

### DELETE `/comptabilite/depenses/{id}`

**Règle :** Si l'écriture liée est `locked = true`, retourner HTTP 422 `{"message": "Exercice clôturé — suppression impossible"}`.

Supprimer la dépense ET l'écriture comptable associée (ecriture_id).

---

## 7. Encaissements

### GET `/comptabilite/exercices/{exerciceId}/encaissements`

**Réponse :**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "exercice_id": 1,
      "coproprietaire_id": 1,
      "coproprietaire_nom": "Hassan Benali",
      "lot_numero": "A-01",
      "montant": 900,
      "date": "2026-03-12",
      "mode_paiement": "virement",
      "reference_cheque": null,
      "compte_destination": "5121",
      "ecriture_id": 6
    }
  ]
}
```

### POST `/comptabilite/exercices/{exerciceId}/encaissements`

**Corps :**
```json
{
  "coproprietaire_id": 2,
  "montant": 720,
  "date": "2026-06-01",
  "mode_paiement": "cheque",
  "compte_destination": "5122",
  "reference_cheque": "CHQ-99999"
}
```

**Génération automatique d'écriture comptable :**
```
D{compte_destination} (5121|5122|5161) / C7111
```
L'écriture a `type = "encaissement"`.

**Règle :** Mettre à jour le `solde_actuel` du copropriétaire dans la table `coproprietaires`.

---

## 8. Import IA (Analyse de facture)

### POST `/comptabilite/exercices/{exerciceId}/import-ia`

**Corps (multipart/form-data) :**
- `file` (image/PDF) — la facture à analyser

**Implémentation :**
Utiliser **Anthropic claude-sonnet-4-20250514** avec vision. Prompt système :
```
Tu es un assistant comptable marocain. Analyse cette facture et retourne un JSON strict avec :
{
  "titre": "...",
  "montant": <number>,
  "date": "YYYY-MM-DD",
  "fournisseur": "...",
  "compte_charge_suggere": "<numéro PCG 6xxx>",
  "confiance": "haute|moyenne|faible"
}
```

**Réponse :**
```json
{
  "status": "success",
  "data": {
    "titre": "Facture Gardiennage Juin",
    "montant": 3500,
    "date": "2026-06-01",
    "fournisseur": "Sécurité Atlas SARL",
    "compte_charge_suggere": "6138",
    "confiance": "haute"
  }
}
```

---

## 9. Clôture d'Exercice

### POST `/comptabilite/exercices/{exerciceId}/cloture`

**Pré-conditions (vérifier côté backend) :**
1. L'exercice est `ouvert`
2. Total débit = Total crédit (balance équilibrée)
3. Au moins une écriture enregistrée
4. Comptes de classe 6 mouvementés
5. Comptes de classe 7 mouvementés

Si une condition n'est pas remplie : HTTP 422 avec message explicite.

**Actions à effectuer :**
1. Mettre `statut = "clos"` et `date_cloture = today`
2. Mettre `locked = true` sur TOUTES les écritures de l'exercice
3. Générer les écritures de clôture (report à nouveau optionnel — Sprint 4)

**Réponse :** Objet `ExerciceComptable` mis à jour.

---

## 10. Plan Comptable (PCG)

### GET `/comptabilite/comptes-pcg`

Retourne la liste des comptes du Plan Comptable Général marocain (118 comptes).

**Query params (filtres) :**
- `utilisable_depense=true` → classe 6 uniquement (formulaire Dépense)
- `utilisable_produit=true` → classe 7 uniquement (formulaire Budget Produit)
- `utilisable_budget=true` → classes 6 et 7 (Tableau Budget Annexe 5)
- `classe=5` → comptes trésorerie uniquement

**Réponse :**
```json
{
  "status": "success",
  "data": [
    {
      "numero": "6111",
      "libelle": "Eau",
      "classe": 6,
      "type": "charge",
      "nature": "courant",
      "est_sous_compte": true,
      "compte_parent": "611",
      "utilisable_depense": true,
      "utilisable_budget": true,
      "utilisable_produit": false,
      "ordre": 401
    },
    {
      "numero": "6138",
      "libelle": "Autres rémunérations",
      "classe": 6,
      "type": "charge",
      "nature": "courant",
      "est_sous_compte": true,
      "compte_parent": "613",
      "utilisable_depense": true,
      "utilisable_budget": true,
      "utilisable_produit": false,
      "ordre": 428
    },
    {
      "numero": "7111",
      "libelle": "Provisions sur opérations courantes",
      "classe": 7,
      "type": "produit",
      "nature": "courant",
      "est_sous_compte": true,
      "compte_parent": "711",
      "utilisable_depense": false,
      "utilisable_budget": true,
      "utilisable_produit": true,
      "ordre": 501
    }
  ]
}
```

**Mapping des charges courantes copropriété :**
| Charge | Compte | Libellé |
|--------|--------|---------|
| Gardiennage (externalisé) | `6138` | Autres rémunérations |
| Nettoyage des locaux | `6131` | Nettoyage des locaux |
| Maintenance ascenseur | `6134` | Contrats de maintenance |
| Électricité | `6112` | Électricité |
| Eau | `6111` | Eau |
| Assurance immeuble | `6136` | Primes d'assurances |
| Entretien divers | `6135` | Entretien et petites réparations |
| Frais bancaires | `6141` | Frais bancaires |

**Note :** Seeder complet avec 118 comptes — voir `docs/PCG_MIGRATION.md`.

**Classes par type :**
- Classe 1 : Capitaux permanents (fonds de réserve, provisions, résultat)
- Classe 3 : Actif circulant (créances copropriétaires, fournisseurs débiteurs)
- Classe 4 : Passif circulant (fournisseurs, copropriétaires créditeurs)
- Classe 5 : Trésorerie (banques, caisse)
- Classe 6 : Charges (courant + non courant)
- Classe 7 : Produits (appels de fonds + produits non courants)

**Champ `nature` :** `courant` = Annexe 5 sections I et II / `non_courant` = sections IV et V.

---

## 11. Règles du Seuil Comptable (Art. 17 Loi 18-00)

Le champ `seuil_comptable` (ExerciceComptable) représente le total des appels de fonds annuels.

| Seuil | Régime | Annexes obligatoires |
|-------|--------|---------------------|
| ≤ 200 000 MAD | Simplifié | Annexes 10, 13 |
| 200 001 – 500 000 MAD | Normal | Annexes 10, 11, 12 |
| ≥ 500 001 MAD | Complet | Annexes 3 à 10 |

Le backend doit calculer `seuil_comptable` automatiquement à partir des appels de fonds liés à l'exercice.

---

## 12. Export

### GET `/comptabilite/exercices/{exerciceId}/export/journal` (Excel)
### GET `/comptabilite/exercices/{exerciceId}/export/grand-livre` (Excel)
### GET `/comptabilite/exercices/{exerciceId}/export/fec` (Sage FEC — format CSV normalisé)
### GET `/comptabilite/exercices/{exerciceId}/export/journal-pdf`
### GET `/comptabilite/exercices/{exerciceId}/export/balance-pdf`

**Packages recommandés :**
- Excel : `maatwebsite/excel` (Laravel Excel)
- PDF : `barryvdh/laravel-dompdf`
- Sage FEC : format CSV avec colonnes normalisées DGFiP

**Format FEC :** `JournalCode;JournalLib;EcritureNum;EcritureDate;CompteNum;CompteLib;CompAuxNum;CompAuxLib;PieceRef;PieceDate;EcritureLib;Debit;Credit;EcritureLet;DateLet;ValidDate;Montantdevise;Idevise`

---

## 13. Rapprochement Bancaire (Phase suivante)

Route prévue : `POST /comptabilite/exercices/{exerciceId}/rapprochement`

Permettra d'importer un relevé bancaire (CSV/Excel) et de le rapprocher automatiquement avec les écritures du compte 5121.

---

## 14. Alertes WhatsApp (Phase suivante)

Déclencher une notification WhatsApp au gestionnaire quand :
- Un exercice arrive à J-30 sans clôture
- La trésorerie passe en dessous de 1 mois de couverture

**API :** Twilio ou Meta Cloud API (WhatsApp Business).

---

## TypeScript Types (référence)

```typescript
type ExerciceComptable = {
  id: number
  residence_id: number
  annee: number
  statut: 'ouvert' | 'clos'
  date_ouverture: string
  date_cloture: string | null
  seuil_comptable: number
}

type EcritureComptable = {
  id: number
  exercice_id: number
  date: string
  numero_compte: string
  libelle_compte: string
  description: string
  debit: number
  credit: number
  piece_justificative: string | null
  type: 'depense' | 'encaissement' | 'virement' | 'cloture' | 'report'
  locked: boolean
}

type Depense = {
  id: number
  exercice_id: number
  titre: string
  montant: number
  date: string
  prestataire_id: number | null
  prestataire_nom: string | null
  compte_charge: string
  libelle_compte: string
  mode_paiement: 'virement' | 'cheque' | 'especes' | 'cb' | 'prelevement' | 'autre'
  justificatif_path: string | null
  ecriture_id: number
}

type Encaissement = {
  id: number
  exercice_id: number
  coproprietaire_id: number
  coproprietaire_nom: string
  lot_numero: string
  montant: number
  date: string
  mode_paiement: 'virement' | 'cheque' | 'especes'
  reference_cheque: string | null
  compte_destination: '5121' | '5122' | '5161'
  ecriture_id: number
}

type ComptePcg = {
  numero: string
  libelle: string
  classe: number
  type: 'capitaux' | 'actif' | 'passif' | 'tresorerie' | 'charge' | 'produit'
  nature: 'courant' | 'non_courant' | 'both'
  est_sous_compte: boolean
  compte_parent: string | null
  utilisable_depense: boolean
  utilisable_budget: boolean
  utilisable_produit: boolean
  ordre: number
}
```

---

## Tables Laravel (Migration suggérée)

```php
// exercices_comptables
Schema::create('exercices_comptables', function (Blueprint $table) {
    $table->id();
    $table->foreignId('residence_id')->constrained();
    $table->smallInteger('annee');
    $table->enum('statut', ['ouvert', 'clos'])->default('ouvert');
    $table->date('date_ouverture');
    $table->date('date_cloture')->nullable();
    $table->decimal('seuil_comptable', 12, 2)->default(0);
    $table->timestamps();
});

// ecritures_comptables
Schema::create('ecritures_comptables', function (Blueprint $table) {
    $table->id();
    $table->foreignId('exercice_id')->constrained('exercices_comptables');
    $table->date('date');
    $table->string('numero_compte', 10);
    $table->string('libelle_compte', 100);
    $table->text('description');
    $table->decimal('debit', 12, 2)->default(0);
    $table->decimal('credit', 12, 2)->default(0);
    $table->string('piece_justificative')->nullable();
    $table->enum('type', ['depense', 'encaissement', 'virement', 'cloture', 'report']);
    $table->boolean('locked')->default(false);
    $table->timestamps();
});

// depenses
Schema::create('depenses', function (Blueprint $table) {
    $table->id();
    $table->foreignId('exercice_id')->constrained('exercices_comptables');
    $table->string('titre');
    $table->decimal('montant', 12, 2);
    $table->date('date');
    $table->foreignId('prestataire_id')->nullable()->constrained();
    $table->string('prestataire_nom')->nullable();
    $table->string('compte_charge', 10);
    $table->string('libelle_compte', 100);
    $table->enum('mode_paiement', ['virement', 'cheque', 'especes', 'cb', 'prelevement', 'autre']);
    $table->string('justificatif_path')->nullable();
    $table->foreignId('ecriture_id')->constrained('ecritures_comptables');
    $table->timestamps();
});

// encaissements
Schema::create('encaissements', function (Blueprint $table) {
    $table->id();
    $table->foreignId('exercice_id')->constrained('exercices_comptables');
    $table->foreignId('coproprietaire_id')->constrained();
    $table->string('lot_numero', 20);
    $table->decimal('montant', 12, 2);
    $table->date('date');
    $table->enum('mode_paiement', ['virement', 'cheque', 'especes']);
    $table->string('reference_cheque')->nullable();
    $table->enum('compte_destination', ['5121', '5122', '5161']);
    $table->foreignId('ecriture_id')->constrained('ecritures_comptables');
    $table->timestamps();
});

// comptes_pcg (seed data) — voir docs/PCG_MIGRATION.md pour le seeder complet (118 comptes)
Schema::create('comptes_pcg', function (Blueprint $table) {
    $table->string('numero', 10)->primary();
    $table->string('libelle', 150);
    $table->tinyInteger('classe');
    $table->enum('type', ['capitaux', 'actif', 'passif', 'tresorerie', 'charge', 'produit']);
    $table->enum('nature', ['courant', 'non_courant', 'both'])->default('courant');
    $table->boolean('est_sous_compte')->default(false);
    $table->string('compte_parent', 10)->nullable();
    $table->boolean('utilisable_depense')->default(false);
    $table->boolean('utilisable_budget')->default(false);
    $table->boolean('utilisable_produit')->default(false);
    $table->unsignedSmallInteger('ordre')->default(0);
});
```

---

*Dernière mise à jour : 2026-05-17 — Sprint 3*
