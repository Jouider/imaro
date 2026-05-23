# Imaro vs Kassaba — Analyse compétitive & feuille de route

> **Date audit**: 2026-05-23
> **Cible Kassaba**: `app.kassaba.ma` v0.20.0
> **Cible Imaro**: `frontend/` sprint 3 (post-imports)
> **Objectif**: identifier les écarts fonctionnels et planifier le dépassement de Kassaba sur le marché marocain.

---

## 1. Verdict exécutif

Kassaba est **un produit comptable mature** structuré autour du **Décret 2.23.700** et de la **Loi 18-00**. Leur avantage principal : la **conformité légale marocaine native** (annexes réglementaires, plan comptable classes 6/7, calendrier de conformité, prescription des créances).

**Imaro a aujourd'hui :**
- Une UI/UX nettement plus moderne (Tailwind v4, design system Imaro, RTL natif AR).
- Un module d'import **supérieur** (5 types + mapping automatique vs 4 types CSV brut).
- Un portail copropriétaire dédié (Kassaba semble avoir un seul portail unifié).

**Kassaba a ce qu'on n'a pas :**
- **Comptabilité en partie double** (journal, grand livre, balance, bilan, compte de gestion).
- **Conformité réglementaire** (10+ annexes du Décret 2.23.700, calendrier conformité, clôture annuelle 4 étapes, provisions créances douteuses).
- **Pointage bancaire** avec import depuis 10 banques marocaines + auto-catégorisation.
- **Recouvrement légal** (risque de prescription, pénalités, mises en demeure).
- **Gestion d'équipements** (Annexe 9).
- **Audit trail** complet avec export.

Pour les dépasser, on doit livrer ces blocs **plus une couche d'IA** qu'ils n'ont pas encore (audit conformité auto, suggestions budgétaires, scoring de risque).

---

## 2. Matrice détaillée — module par module

Légende : ✅ Présent · 🟡 Partiel · ❌ Absent · ⭐ Avantage Imaro

### 2.1 Propriétés & résidents

| Fonction | Kassaba | Imaro | Note |
|---|---|---|---|
| Liste immeubles | ✅ | ✅ | Parité |
| Détail immeuble (lots, tantièmes) | ✅ | ✅ | Parité |
| Copropriétaires | ✅ | ✅ | Parité |
| **Occupants/locataires (séparés des propriétaires)** | ✅ | ❌ | À ajouter (un lot peut avoir owner + occupant) |
| **Demandes d'accès (résidents → syndic)** | ✅ | ❌ | Workflow d'invitation/onboarding |
| Équipe (gestion d'utilisateurs internes) | ✅ | 🟡 | On a les rôles mais pas de page de gestion |
| Réclamations / tickets | ✅ | ✅ | Parité (notre `TicketsPage`) |
| Import de données | ✅ CSV, 4 types, 3 étapes | ⭐ xlsx+csv, 5 types, 4 étapes + auto-mapping | **Avantage Imaro** |
| Portail copropriétaire mobile | 🟡 | ⭐ | **Avantage Imaro** (portail dédié) |

### 2.2 Finances opérationnelles

| Fonction | Kassaba | Imaro | Note |
|---|---|---|---|
| Paiements (appels de fonds) | ✅ | ✅ | Parité |
| **Génération automatique mensuelle** | ✅ | 🟡 | Bouton « Générer mensuel » → à implémenter |
| **Génération « manquants » (rattrapage)** | ✅ | ❌ | Création des charges manquées sur exercice |
| Dépenses | ✅ | ✅ | Parité |
| **Décaissements en attente (workflow approbation)** | ✅ | ❌ | Status: pending → paid pour dépenses |
| **Autres recettes** (location parking, salle, etc.) | ✅ | ❌ | Module dédié |
| **Remboursements** (trop-perçu, indemnités) | ✅ | ❌ | Module dédié |
| **Emprunts** (suivi emprunts copro) | ✅ | ❌ | Module dédié |
| **Transferts de trésorerie** (compte → fonds réserve) | ✅ | ❌ | Module dédié |
| Budgets annuels | ✅ | ✅ | Parité |
| **Fonds de réserve (configuration)** | ✅ | 🟡 | Section dans BudgetsPage mais simplifiée |
| Rappels (relances automatiques) | ✅ | ✅ | Parité |
| **Recouvrement légal (impayés)** | ✅ | 🟡 | On a la liste impayés, pas le suivi judiciaire |
| **Pénalités de retard** | ✅ | ❌ | Calcul auto selon règlement copro |
| **Risque de prescription** (alerte 3/5 ans) | ✅ | ❌ | KPI critique pour le marché MA |

### 2.3 Comptabilité (le gros manque)

| Fonction | Kassaba | Imaro | Note |
|---|---|---|---|
| **Bilan d'ouverture** | ✅ | ❌ | Import des soldes initiaux par compte |
| **Journal comptable (écritures partie double)** | ✅ | ❌ | **Bloquant pour les gros syndics** |
| **Balance des comptes** | ✅ | ❌ | Soldes débiteurs/créditeurs par compte |
| **Grand livre** | ✅ | ❌ | Détail des mouvements par compte |
| **Livre de compte** (par copropriétaire) | ✅ | 🟡 | On a une vue paiements, pas de relevé comptable |
| **État de la situation financière (bilan)** | ✅ | ❌ | Annexe 13-1 du décret |
| **Compte de gestion général** | ✅ | ❌ | Annexe 13-2 du décret |
| **Pointage bancaire** (rapprochement relevé bancaire) | ✅ 10 banques | ❌ | **Killer feature, économise 80% du temps de gestion** |
| **Clôture annuelle** (wizard 4 étapes) | ✅ | ❌ | Affectation résultat + verrouillage exercice |
| **Provisions pour créances douteuses** | ✅ | ❌ | Art. 2 du Décret 2.23.700, approbation AG |

### 2.4 Conformité légale (Décret 2.23.700 + Loi 18-00)

| Fonction | Kassaba | Imaro | Note |
|---|---|---|---|
| **Calendrier de conformité** (cycle annuel avec phases) | ✅ | ❌ | Opérations mensuelles → Clôture → AG → Archivage |
| **Régime simplifié vs normal** (seuil 200 000 MAD/an) | ✅ | ❌ | Adaptation auto des obligations |
| **Annexe 3** (informations générales) | ✅ | ❌ | PDF auto |
| **Annexe 4** (composition fonds copro) | ✅ | ❌ | |
| **Annexe 5** (budget prévisionnel) | 🟡 | ✅ | On l'exporte déjà |
| **Annexe 6** (engagements) | ✅ | ❌ | |
| **Annexe 7** (mouvements trésorerie) | ✅ | ❌ | |
| **Annexe 8** (état liquidités) | ✅ | ❌ | |
| **Annexe 9** (équipements/immobilisations) | ✅ | ❌ | Module Équipements |
| **Annexe 10** (contributions copropriétaires) | ✅ | ❌ | **Requis** |
| **Annexe 13-1** (situation financière) | ✅ | ❌ | **Requis** |
| **Annexe 13-2** (compte de gestion) | ✅ | ❌ | **Requis** |
| **Travaux exceptionnels** (gros entretien, AG vote séparé) | ✅ | ❌ | Module dédié |
| **Semi-Annual Info (Art. 26)** | ✅ | ❌ | Bilan semestriel obligatoire |

### 2.5 Gouvernance

| Fonction | Kassaba | Imaro | Note |
|---|---|---|---|
| Assemblées Générales | ✅ | ✅ | Parité |
| **Convocations AG (PDF Loi 18-00 art. 16-20)** | ✅ | 🟡 | À vérifier conformité légale |
| **Vote en ligne / pondéré par tantième** | 🟡 | 🟡 | Les deux sont light là-dessus |
| **Comité consultatif / Conseil syndical** | ✅ | 🟡 | Page séparée chez eux |
| **PCSI (Plan Comptable Syndic Immo) — vue d'ensemble** | ✅ | ❌ | Hub gouvernance |
| Annonces / communications | 🟡 | ⭐ | **Avantage Imaro** |
| Documents (GED) | 🟡 | ⭐ | **Avantage Imaro** |
| Prestataires & contrats | 🟡 | ⭐ | **Avantage Imaro** (page dédiée riche) |

### 2.6 Reporting & monitoring

| Fonction | Kassaba | Imaro | Note |
|---|---|---|---|
| Tableau de bord KPI | ✅ | ✅ | Parité (couverture similaire) |
| **Rapports exportables (PDF/Excel)** | ✅ par module | 🟡 | Couverture inégale chez nous |
| **Synthèse mensuelle** | ✅ | ❌ | Rapport agrégé tous immeubles |
| **Rapport d'immeuble** (single page tout-en-un) | ✅ | ❌ | |
| **Audit trail / Journal d'audit** | ✅ + export CSV/JSON | ❌ | **Requis sécurité B2B** |
| **Bilan semestriel** (Art. 26) | ✅ | ❌ | |

### 2.7 Multi-langue & UX

| Fonction | Kassaba | Imaro | Note |
|---|---|---|---|
| Français | ✅ | ✅ | |
| **Arabe (RTL)** | ❓ Non visible dans l'audit | ⭐ | **Avantage Imaro** |
| Mobile-first portail | 🟡 | ⭐ | **Avantage Imaro** |
| Design system | Standard (vert/bleu génériques) | ⭐ | **Avantage Imaro** (palette navy/orange, identité forte) |
| Dark mode | ❓ | ✅ | |

---

## 3. Bilan numérique

- **Modules où Imaro est devant** : Import, Portail résident, Design/UX, Multi-langue (AR/RTL), Prestataires/contrats, Documents.
- **Modules à parité** : Immeubles, Copropriétaires, Tickets, Paiements (base), Dépenses (base), Budgets, AG, Rappels, Dashboard.
- **Modules où Kassaba nous écrase** : Comptabilité partie double, Pointage bancaire, Conformité Décret 2.23.700 (annexes), Recouvrement légal, Clôture exercice, Calendrier conformité, Audit trail, Provisions créances douteuses, Équipements (Annexe 9), Modules financiers spécialisés (recettes/remboursements/emprunts/transferts).

**Score brut** : Imaro ~12 modules · Kassaba ~30+ modules. **On est à ~40 % de leur surface fonctionnelle.**

---

## 4. Roadmap pour les dépasser

Découpée en 4 sprints de 2 semaines chacun. **Priorité = volume client perdu si manquant**.

### Sprint 4 — Conformité légale MVP (6 sem 24 → 25)
**Objectif : devenir légalement utilisable comme syndic professionnel au Maroc.**

| # | Feature | Impact | Effort | Backend ? |
|---|---|---|---|---|
| 4.1 | **Audit trail** complet (`audit_logs` table, événements sur toutes les mutations) + page `/gestionnaire/audit-trail` avec export CSV/JSON | Très haut | M | Oui (Abdellah) |
| 4.2 | **Annexes réglementaires** : 10, 13-1, 13-2 (les 3 requises) avec génération PDF dynamique | Très haut | L | Oui (calcul agrégats) |
| 4.3 | **Calendrier de conformité** : page `/gestionnaire/conformite` avec phases (Opérations mensuelles → Clôture → AG → Archivage) + progression auto | Très haut | M | Oui (statut tasks) |
| 4.4 | **Pénalités de retard** : config par résidence + calcul auto sur impayés + ajout à `RecouvrementPage` | Haut | M | Oui |
| 4.5 | **Risque de prescription** : KPI sur `RecouvrementPage` (alerte créances proches 3 ans / 5 ans) | Haut | S | Oui |
| 4.6 | **Occupants** : modèle `Occupant` séparé de `Coproprietaire` (un lot peut avoir 1 owner + N tenants) | Moyen | M | Oui (schéma) |

### Sprint 5 — Comptabilité partie double (sem 26 → 27)
**Objectif : remplacer Excel pour les gros syndics. Le module qui débloque les clients à >10 résidences.**

| # | Feature | Impact | Effort |
|---|---|---|---|
| 5.1 | **Plan comptable** marocain syndic : classes 1-7 seedées en base (immobilisations, charges, produits, etc.) | Très haut | M |
| 5.2 | **Bilan d'ouverture** : page d'import des soldes initiaux par compte (formulaire + import xlsx — réutiliser notre wizard !) | Très haut | M |
| 5.3 | **Journal comptable** : page liste écritures partie double + formulaire création + journal d'écriture auto sur chaque paiement/dépense | Très haut | L |
| 5.4 | **Grand livre** : page consultation détaillée par compte avec filtres période | Haut | M |
| 5.5 | **Balance des comptes** : tableau D/C par compte + total avec contrôle équilibre | Haut | S |
| 5.6 | **Livre de compte copropriétaire** : relevé individuel exportable PDF | Haut | M |

### Sprint 6 — Pointage bancaire + Clôture (sem 28 → 29)
**Objectif : automatisation. C'est l'argument de vente N°1 pour le syndic occupé.**

| # | Feature | Impact | Effort |
|---|---|---|---|
| 6.1 | **Pointage bancaire** : import relevé bancaire (CSV/PDF) avec parser par banque (Attijariwafa, BP, BoA, CIH, SG, BMCI, CdM, CA, CFG, Al Barid) | Très haut | XL |
| 6.2 | **Matching auto** : algo qui associe chaque ligne du relevé à un paiement attendu ou une dépense (reasonable match score + manual override) | Très haut | L |
| 6.3 | **Clôture annuelle** : wizard 4 étapes (Aperçu → Affectation résultat → Verrouillage → Terminé), produits classe 7 / charges classe 6 | Haut | M |
| 6.4 | **Provisions créances douteuses** : workflow brouillon → AG → approuvée/rejetée | Moyen | M |
| 6.5 | **Transferts de trésorerie** : compte courant ↔ fonds de réserve, traçable comptablement | Moyen | S |

### Sprint 7 — Modules financiers spécialisés + Polish (sem 30 → 31)
**Objectif : combler le reste de la matrice et lancer notre différenciation IA.**

| # | Feature | Impact | Effort |
|---|---|---|---|
| 7.1 | **Autres recettes** (location parking, salle commune, antennes) | Moyen | M |
| 7.2 | **Remboursements** (trop-perçus, indemnités) | Moyen | M |
| 7.3 | **Emprunts** (suivi tableau d'amortissement) | Moyen | M |
| 7.4 | **Équipements** (Annexe 9) — registre + valeur + amortissement | Moyen | M |
| 7.5 | **Travaux exceptionnels** (différents du budget, vote AG séparé) | Moyen | M |
| 7.6 | **Annexes 3-9** (les 7 restantes, génération PDF) | Moyen | M |
| 7.7 | **Reports module** — synthèse mensuelle, rapport d'immeuble, page `/gestionnaire/rapports` | Haut | M |
| 7.8 | **Demandes d'accès** : workflow invitation résident avec validation syndic | Moyen | S |

### Sprint 8 — La différenciation **IA** (sem 32 → 33) — ce que Kassaba n'a pas
**Objectif : sortir du match « moi aussi » et créer le moat.**

| # | Feature IA | Impact | Effort |
|---|---|---|---|
| 8.1 | **Audit conformité auto** : un agent qui scanne l'état d'un dossier (charges manquantes, AG non tenue, annexes non générées) et produit un rapport de risque légal | Très haut | L |
| 8.2 | **Suggestions budget IA** : à partir des dépenses N-1 et N-2, propose un budget N+1 avec justification par poste | Haut | M |
| 8.3 | **Catégorisation dépenses auto** : sur upload de facture (OCR + classification → compte comptable correct) | Très haut | L |
| 8.4 | **Détection anomalies** : alertes sur dépenses inhabituelles, paiements suspects, écarts budget | Haut | M |
| 8.5 | **Assistant copropriétaire (chatbot WhatsApp)** : répond aux questions sur charges, paiements, AG, à partir de la donnée du résident | Haut | L |
| 8.6 | **Génération PV d'AG par IA** à partir de l'enregistrement audio | Moyen | M |

---

## 5. Avantages compétitifs à protéger / amplifier

Ces axes ne doivent **pas être perdus** quand on rattrape Kassaba :

1. **Design system Imaro** — palette navy/orange, fonts DM Serif + Nunito Sans, identité forte. Kassaba a un design générique. **Ne pas céder un seul pixel.**
2. **Arabe RTL natif** — Kassaba ne semble pas le proposer ou le fait mal. C'est notre **drapeau marocain** : `dir="rtl"` sur tout l'AR, layout testé, polices arabe propres.
3. **Portail résident mobile-first** — Kassaba a une expérience desktop centric pour résidents. Notre `/portail/*` est conçu pour 375px.
4. **Wizard d'import** (4 étapes, mapping auto, validation cross-référencée) — meilleur que leur CSV brut.
5. **Bottom nav 4 onglets** côté résident — Kassaba force la sidebar même sur mobile.

---

## 6. Stack technique — qu'est-ce qu'on doit demander à Abdellah ?

**Schéma DB à ajouter / modifier** (récapitulatif Sprint 4-7) :

```
audit_logs (id, user_id, action, target_type, target_id, payload_json, ip, ua, created_at)
plan_comptable (id, numero, libelle, classe, parent_id)
ecritures_comptables (id, residence_id, exercice, date, journal, libelle, total_debit, total_credit, created_by)
ecriture_lignes (id, ecriture_id, compte_numero, libelle, debit, credit, lot_id?, coproprietaire_id?)
bilan_ouverture (id, residence_id, exercice, compte_numero, solde_debit, solde_credit)
releve_bancaire (id, residence_id, banque, fichier, date_import, status)
releve_ligne (id, releve_id, date, libelle, debit, credit, matched_to_type, matched_to_id)
penalites (id, paiement_id, taux, montant, statut)
creances_douteuses (id, residence_id, exercice, coproprietaire_id, montant, statut, ag_id)
occupants (id, lot_id, coproprietaire_id?, nom, telephone, type [locataire|usufruitier], date_debut, date_fin)
equipements (id, residence_id, nom, categorie, valeur_acquisition, date_acquisition, duree_amort, statut)
travaux_exceptionnels (id, residence_id, libelle, montant_devis, date_vote_ag, statut)
recettes_autres (id, residence_id, libelle, montant, date, type)
remboursements (id, coproprietaire_id, montant, motif, date, statut)
emprunts (id, residence_id, organisme, montant_initial, taux, duree_mois, date_debut, tableau_amortissement_json)
transferts_treso (id, residence_id, compte_source, compte_dest, montant, date, justification)
demandes_acces (id, residence_id, lot_id, email, telephone, statut, token)
```

**Endpoints à ouvrir** (rough) :

```
POST /api/residences/:id/closure/{preview|allocate|lock}
POST /api/residences/:id/bank-reconciliation/import
POST /api/residences/:id/bank-reconciliation/match
GET  /api/residences/:id/annexes/{annexe_num}.pdf
GET  /api/residences/:id/compliance-calendar
GET  /api/residences/:id/journal-entries
POST /api/residences/:id/journal-entries
GET  /api/residences/:id/general-ledger?compte=...
GET  /api/residences/:id/trial-balance?periode=...
GET  /api/audit-logs?from=...&to=...&action=...
POST /api/residences/:id/penalties/calculate
... etc.
```

Total endpoints estimés : **~40-50 nouveaux**.

---

## 7. Priorisation finale (recommandation)

**Si on doit faire un choix, faire dans cet ordre :**

1. **Sprint 4** (Conformité légale MVP) — sans audit trail et annexes 10/13-1/13-2, on ne peut pas vendre légalement à un syndic.
2. **Sprint 5** (Comptabilité partie double) — bloquant pour syndics >10 immeubles.
3. **Sprint 6** (Pointage bancaire) — c'est l'argument commercial.
4. **Sprint 8** (IA) — **on peut le faire EN PARALLÈLE** des sprints 6/7 car ça ne dépend pas du backend de la même manière.
5. **Sprint 7** (Modules financiers spécialisés) — peut être étalé.

**Délai pour atteindre la parité fonctionnelle : 8 semaines de dev focused.**
**Délai pour les dépasser (avec IA) : 10 semaines.**

---

## 8. Pour Abdellah

Tag Abdellah sur ces GitHub Issues à créer :

- `[BE] audit_logs schema + middleware Laravel`
- `[BE] plan_comptable seeder (classes 1-7 syndic)`
- `[BE] ecritures_comptables + ecriture_lignes endpoints`
- `[BE] bilan_ouverture import endpoint`
- `[BE] bank reconciliation parser (10 banks)`
- `[BE] annexes PDF generator (DomPDF templates)`
- `[BE] compliance-calendar engine (cycle annuel Décret 2.23.700)`
- `[BE] penalties calculator endpoint`
- `[BE] occupants + locataires schema`

Lui demander de prioriser :
1. `audit_logs` (Sprint 4.1) — simple et bloquant.
2. `plan_comptable` + `ecritures_comptables` (Sprint 5) — gros morceau, à commencer tôt.
3. Le reste par ordre des sprints.
