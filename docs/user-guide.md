# Imaro — Guide utilisateur (Gestionnaire / Syndic)

> **À qui s'adresse ce guide ?** Aux gestionnaires de copropriété (syndics) qui utilisent
> Imaro au quotidien. Couvre toutes les fonctionnalités livrées dans Sprint 1 → Sprint 8.

---

## Sommaire

1. [Démarrer avec Imaro](#1-démarrer-avec-imaro)
2. [Tableau de bord](#2-tableau-de-bord)
3. [Gérer les copropriétés](#3-gérer-les-copropriétés)
4. [Finances](#4-finances)
5. [Conformité légale](#5-conformité-légale)
6. [Comptabilité partie double](#6-comptabilité-partie-double)
7. [Patrimoine](#7-patrimoine)
8. [Pointage bancaire](#8-pointage-bancaire)
9. [Assistant IA](#9-assistant-ia)
10. [Cycle annuel — checklist](#10-cycle-annuel--checklist)
11. [Tâches courantes](#11-tâches-courantes)
12. [FAQ](#12-faq)

---

## 1. Démarrer avec Imaro

### Connexion

- URL : `https://app.imaro.ma`
- Connexion par numéro de téléphone + OTP WhatsApp (gratuite et instantanée)
- Tous les rôles (Super Admin, Syndic Owner, Gestionnaire, Conseil syndical) ont la même
  porte d'entrée — Imaro détecte automatiquement votre rôle et adapte l'interface.

### Premier login d'un nouveau syndic

1. Le syndic owner crée le compte tenant lors de la souscription.
2. À la première connexion, Imaro propose un **wizard d'onboarding** en 5 étapes :
   1. Importer vos lots (xlsx)
   2. Importer vos copropriétaires
   3. Importer les soldes initiaux par copropriétaire
   4. Importer l'historique des paiements
   5. Importer vos prestataires
3. Pour chaque étape, vous pouvez **télécharger un modèle Excel** pré-formaté.
4. Imaro auto-mappe les colonnes — vous n'avez qu'à valider.

### Multi-langue

Bouton **FR / AR** en haut à droite. Le passage en arabe bascule **toute l'interface en RTL**
(layout droite-à-gauche).

---

## 2. Tableau de bord

`/gestionnaire/dashboard`

Le hub central de votre activité quotidienne.

### Sections

| Section | Contenu | Action principale |
|--------|---------|-------------------|
| **4 KPIs** | Résidences · Copropriétaires · CA mensuel · Total impayés | Filtre par résidence (en haut à droite) |
| **Aperçu modules** | 6 cartes vers Assistant IA · Conformité · Recouvrement · Pointage · Patrimoine · Annexes | Clic = navigation directe |
| **Graphique recouvrement** | Évolution mensuelle recouvré vs restant | — |
| **Top impayés** | 5 + gros impayés du portefeuille | Clic ligne = fiche copro |
| **Tickets urgents** | Réclamations ouvertes prioritaires | Clic = page Tickets |
| **Assemblées à venir** | Prochaines AG convoquées | Clic = fiche AG |
| **Actions rapides** | Boutons : Appel de fonds · Encaisser · Ticket · AG · Audit IA · Pointage · Annexe · Occupants | 1-clic pour les tâches fréquentes |

---

## 3. Gérer les copropriétés

### Résidences

`/gestionnaire/residences`

- Liste avec recherche par nom/ville
- Détail par résidence : Lots · Copropriétaires · Exercices · Documents

### Copropriétaires

`/gestionnaire/coproprietaires`

- Vue consolidée tous-immeubles
- Solde en temps réel par copro
- Numéro WhatsApp pour l'invitation au portail

### Occupants (Art. 11 Loi 18-00)

`/gestionnaire/occupants` — Nouveau dans Sprint 4

Registre des **locataires + propriétaires occupants + usufruitiers** par lot. Crucial pour :
- Convocation aux AG (l'occupant en place reçoit aussi)
- Communication des charges
- Suivi des baux

### Prestataires

`/gestionnaire/prestataires` — Annuaire des artisans/sociétés (nettoyage, ascenseur, plomberie…).
Fiches contact + contrats associés.

### Import en masse

`/gestionnaire/imports` — Wizard 4 étapes (upload → mapping → preview → execute) pour
les 5 entités d'onboarding + bilan d'ouverture.

---

## 4. Finances

### Paiements & Appels de fonds

`/gestionnaire/paiements` — Suivi des appels de fonds et encaissements.

### Dépenses

`/gestionnaire/depenses` — Toutes les dépenses de la copropriété, avec mode de paiement,
référence pièce, et fournisseur.

**Astuce** : utilisez l'**Assistant IA → Extraction facture** pour pré-remplir une dépense
automatiquement depuis une photo/PDF de facture.

### Budgets

`/gestionnaire/budgets` — Budget annuel voté en AG + suivi prévisionnel vs réalisé.

**Astuce** : générer une suggestion IA depuis l'Assistant IA avant la prochaine AG.

### Recouvrement

`/gestionnaire/recouvrement` — Nouveau dans Sprint 4

**Page critique pour le syndic** : tous les impayés + suivi de la prescription
quinquennale (Loi 18-00 art. 25).

#### KPIs en haut

- Total impayé · Pénalités · Lots en retard · **Risque de prescription** (lots proches des 5 ans)

#### Configuration des pénalités

Bouton **« Configuration pénalités »** (haut droit). Permet de configurer :
- Activation oui/non (doit être voté en AG)
- Période de grâce (jours)
- Type : forfait / pourcentage / journalier
- Plafond optionnel

#### Mise en demeure

Bouton sur chaque ligne d'impayé. Génère un PDF officiel et marque le statut.

### Autres recettes

`/gestionnaire/autres-recettes` — Locations parking, salle commune, antennes Orange/IAM,
subventions, indemnités d'assurance.

### Remboursements

`/gestionnaire/remboursements` — Trop-perçus et indemnités à reverser aux copropriétaires.
Workflow : demandé → approuvé → payé.

### Pointage bancaire

`/gestionnaire/pointage` — Voir [section 8](#8-pointage-bancaire).

---

## 5. Conformité légale

3 pages qui couvrent les obligations du **Décret 2.23.700** et de la **Loi 18-00**.

### Calendrier de conformité

`/gestionnaire/conformite`

- Cycle annuel en 4 phases : Opérations mensuelles → Clôture → AG → Archivage
- Détection auto du régime (simplifié ≤200K MAD ou normal)
- Liste des tâches obligatoires avec leur statut + dates limites

### Annexes comptables

`/gestionnaire/annexes`

12 annexes du Décret 2.23.700, toutes générables en PDF en 1 clic :

#### Annexes obligatoires (régime simplifié)

| # | Nom | Contenu |
|---|-----|---------|
| **10** | État des contributions des copropriétaires | Tableau par copro avec appelé/payé/solde |
| **13-1** | État de la situation financière | Bilan simplifié (réserve, créances, dettes, trésorerie) |
| **13-2** | Compte de gestion + budget | P&L avec budget voté N+1, réalisé N, budget N, approuvé N-1 |

#### Annexes complémentaires

| # | Nom |
|---|-----|
| 3 | Bilan complet (Plan Comptable Marocain) |
| 4 | Compte de résultat complet |
| 5 | Suivi du budget prévisionnel |
| 6 | Travaux non courants |
| 7 | Mouvements de trésorerie |
| 8 | Suivi des emprunts |
| 9 | Suivi des équipements |
| 11 | Bilan simplifié |
| 12 | Compte de résultat simplifié |

Chaque PDF :
- Logo Imaro + en-tête navy
- Badge **« DOCUMENT OFFICIEL »** vert avec checkmark
- QR code scannable → page de vérification sur imaro.ma
- Footer Décret 2.23.700

### Journal d'audit

`/gestionnaire/audit`

Toutes les actions sur la plateforme tracées : création, modification, suppression, login.
Filtres par catégorie, sévérité, utilisateur, période. Export CSV ou JSON.

---

## 6. Comptabilité partie double

`/gestionnaire/comptabilite`

Comptabilité complète aux standards marocains. 6 onglets :

1. **Tableau de bord** — KPIs financiers (produits, charges, résultat, trésorerie)
2. **Journal comptable** — Écritures en partie double (débit / crédit, comptes 1-7)
3. **Grand-Livre** — Détail des mouvements par compte
4. **Dépenses** — Création + import IA de factures
5. **Rapports financiers** — Génération PDFs (Rapport Financier, Journal, Grand Livre, Balance) + cross-link vers Annexes réglementaires
6. **Clôture** — Wizard 4 étapes (Aperçu → Affectation résultat → Verrouillage → Terminé)

---

## 7. Patrimoine

3 modules de suivi du patrimoine de la copropriété (Sprint 7).

### Équipements (Annexe 9)

`/gestionnaire/equipements` — Registre des immobilisations.

- 9 catégories (ascenseur, chauffage, sécurité, vidéosurveillance, plomberie…)
- Valeur d'acquisition + durée d'amortissement → valeur nette auto-calculée
- Statut actif / hors service

### Emprunts (Annexe 8)

`/gestionnaire/emprunts` — Suivi des emprunts collectifs.

- Organisme prêteur, taux %, durée, mensualité
- Payé cumul + cet exercice + reste dû
- Statut actif / remboursé / en défaut

### Travaux exceptionnels (Annexe 6)

`/gestionnaire/travaux-exceptionnels` — Travaux votés en AG hors budget courant.

- Date de vote AG + prestataire + statut
- Montants voté / engagé / réglé / reste à régler
- 4 statuts : Voté · En cours · Terminé · Annulé

---

## 8. Pointage bancaire

`/gestionnaire/pointage` — **Le killer feature d'Imaro** (Sprint 6)

Rapprochement automatique du relevé bancaire avec vos paiements + dépenses.

### Banques supportées (10)

Attijariwafa · Banque Populaire · Bank of Africa · CIH · Société Générale · BMCI ·
Crédit du Maroc · Crédit Agricole · CFG · Al Barid Bank · + format générique.

### Workflow

1. **Sélectionner la banque** dans le dropdown
2. **Drop un fichier** (.csv, .xlsx, .xls) exporté depuis l'espace bancaire en ligne
3. Imaro auto-parse les colonnes (date, libellé, débit, crédit)
4. **Auto-matching** : pour chaque ligne, Imaro cherche le paiement ou la dépense
   correspondante en se basant sur :
   - Montant (exact ou proche à 2%)
   - Date (même jour / ±7j / ±14j)
   - Nom détecté dans le libellé (fuzzy match)
5. Résultat : badges **Auto (≥80%)** ou **Suggéré (≥40%)** ou **Sans rapprochement**
6. **Confirmer en batch** : bouton « Tout confirmer » pour valider tous les auto-matches

### Démo

Bouton **Démo** charge un dataset Attijariwafa de 10 lignes pour tester immédiatement
sans avoir un vrai relevé.

---

## 9. Assistant IA

`/gestionnaire/ia` — **Notre moat différenciateur** (Sprint 8)

3 outils IA propulsés par Claude.

### 🛡 Audit conformité

Clic « Lancer l'audit IA » → en ~30 secondes :
- **Score 0-100** + santé globale (excellent / good / warning / critical)
- **Synthèse exécutive** 2-3 phrases
- **Findings classés par sévérité** (critique / élevé / modéré / faible / info)
  - Chaque finding : description + recommandation actionable + référence légale + impact estimé
- **Points forts détectés**

Détecte par exemple :
- Créances proches de prescription quinquennale
- Pénalités configurées sans vote AG
- Annexes non générées
- Écarts budgétaires significatifs
- Pointage bancaire en retard

### 🔍 Extraction facture (OCR)

Drop une facture PDF ou image → en ~3-5 secondes :
- Fournisseur + ICE marocain
- Date + numéro de facture
- HT / TVA / TTC
- Description + lignes détaillées
- **Catégorie suggérée** + **compte comptable du Plan Comptable Marocain**
- Score de confiance

Bouton **« Créer la dépense »** pré-remplit le formulaire — vous n'avez qu'à valider.

### 💡 Suggestions budget

Pour l'exercice cible (N+1), l'IA analyse :
- Dépenses des 2 derniers exercices
- Inflation HCP (Haut Commissariat au Plan)
- Hausses tarifs Lydec/Redal annoncées
- Contrats existants en cours

Et propose ligne par ligne le budget N+1 avec :
- Réalisé N-1 / Suggestion N+1 / Variation %
- **Justification IA** par poste (« Hausse tarif Lydec attendue », « Contrat reconduit »)
- Niveau de confiance par ligne (high / medium / low)
- Hypothèses globales retenues

---

## 10. Cycle annuel — checklist

À suivre dans l'ordre pour respecter le Décret 2.23.700 :

### Tous les mois

- [ ] Émettre l'appel de fonds (`/gestionnaire/paiements`)
- [ ] Importer le relevé bancaire (`/gestionnaire/pointage`)
- [ ] Confirmer les rapprochements auto
- [ ] Saisir / OCR les factures via Assistant IA

### Fin d'année (mars de N+1)

- [ ] Arrêter les comptes dans Comptabilité → Clôture
- [ ] Lancer l'audit IA conformité pour vérifier l'état
- [ ] Calculer / approuver les provisions créances douteuses
- [ ] Générer les annexes 10, 13-1, 13-2 (au minimum)

### Préparation AG (mai)

- [ ] Convocations envoyées 15j+ avant
- [ ] Documents à disposition des copropriétaires
- [ ] Tenue de l'AG
- [ ] PV signé

### Archivage (juin)

- [ ] Vérifier le calendrier de conformité (`/gestionnaire/conformite`) — toutes les
  tâches doivent être en statut « Terminé »
- [ ] Régénérer toutes les annexes après vote AG
- [ ] Verrouiller l'exercice dans Comptabilité → Clôture

---

## 11. Tâches courantes

### Comment créer une dépense ?

**Méthode 1 — manuelle** : `/gestionnaire/depenses` → bouton « Nouvelle dépense ».

**Méthode 2 — IA** (recommandée) : `/gestionnaire/ia` → onglet Extraction facture →
drop la facture → bouton « Créer la dépense ».

### Comment envoyer une mise en demeure ?

1. Aller dans `/gestionnaire/recouvrement`
2. Trouver la ligne du copropriétaire en retard
3. Cliquer le bouton **Mise en demeure** sur la ligne
4. Le PDF se télécharge et le statut passe à « Mise en demeure »

### Comment générer le bilan annuel pour l'AG ?

1. `/gestionnaire/annexes`
2. Sélectionner la résidence + l'exercice
3. Cliquer **PDF** sur Annexe 10, 13-1, 13-2 (au minimum)
4. Si vous voulez le bilan complet : Annexes 3 et 4 aussi

### Comment importer un relevé bancaire ?

1. Connectez-vous à votre banque en ligne
2. Exportez le relevé du mois en cours en CSV ou Excel
3. `/gestionnaire/pointage` → sélectionnez la banque → drop le fichier
4. Vérifiez les auto-matches → cliquez **« Tout confirmer »**

### Comment configurer les pénalités de retard ?

1. **D'abord, vote en AG** — décision obligatoire (Loi 18-00 art. 25)
2. `/gestionnaire/recouvrement` → bouton « Configuration pénalités »
3. Activer + choisir le type (forfait / pourcentage / journalier)
4. Renseigner valeur, période de grâce, plafond
5. Enregistrer
6. Lancer un recalcul batch (bouton « Recalculer pénalités »)

---

## 12. FAQ

### Mes données sont-elles privées ?

Oui. Imaro est multi-tenant — votre tenant est complètement isolé. Aucun autre syndic ne peut
voir vos données. L'IA traite vos données via Claude (Anthropic) mais sans les stocker ni
les utiliser pour entraîner des modèles.

### Le QR code des annexes, ça sert à quoi ?

Anti-tampering et preuve d'authenticité. Quand un copropriétaire scanne le QR avec son
téléphone, il atterrit sur `imaro.ma/verify/<code>` qui confirme :
- Document généré par Imaro
- Pour cette résidence et cet exercice
- À cette date
- Avec ce contenu (hash SHA-256)

Si quelqu'un modifie le PDF, le hash ne correspond plus → le scan échoue.

### Imaro est-il conforme au Décret 2.23.700 ?

Oui. Toutes les 12 annexes obligatoires sont générables, le plan comptable marocain est
respecté, le cycle annuel de conformité est suivi automatiquement, et le journal d'audit
trace toutes les actions sensibles (rétention 7 ans).

### Que se passe-t-il si je passe en régime normal (>200K MAD/an) ?

Imaro détecte automatiquement le passage de seuil et ajoute les annexes additionnelles
requises (annexes 3, 4 obligatoires en plus de 10, 13-1, 13-2).

### Comment ajouter un utilisateur dans mon équipe syndic ?

Aller dans `/gestionnaire/profil` → Équipe → Inviter par téléphone. L'invité reçoit un OTP
WhatsApp et un rôle (Manager, Agent de recouvrement, ou Conseil consultatif).

### Et le portail copropriétaire ?

Chaque copropriétaire a accès à un **portail mobile-first** dédié sur `app.imaro.ma/portail`
où il consulte :
- Son solde et l'historique de ses paiements
- Les appels de fonds en cours
- Les annonces de la copropriété
- Les AG (convocations, ordres du jour, PV)
- Possibilité de signaler une réclamation

Vous, en tant que syndic, gérez tout depuis `app.imaro.ma/gestionnaire`.

---

**Besoin d'aide ?** Contactez le support sur `support@imaro.ma` ou WhatsApp `+212 ...`.
