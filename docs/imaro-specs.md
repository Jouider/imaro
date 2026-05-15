# SyndikPro — Cahier des charges complet
> Réalisé par analyse directe de SyndicConnect (concurrent marocain actif)
> Document destiné à Claude Code — Mouad & Abdellah / Digitoyou

---

## 0. Vision du produit

SyndikPro est un SaaS de gestion de copropriété **Made in Morocco**, conçu pour dépasser SyndicConnect sur :
- La **qualité UX/UI** (moderne, cohérent, mobile-first)
- La **sécurité** (mots de passe hachés, rôles granulaires)
- La **performance financière** (tableaux de bord analytiques réels)
- L'**expérience copropriétaire** (app mobile + portail web)
- La **robustesse technique** (API REST propre, multitenancy sécurisé)

**Stack recommandée** : Next.js 14 (App Router) + Laravel 11 (API) + PostgreSQL + Flutter (app mobile) + Tailwind CSS

---

## 1. Architecture globale

### 1.1 Modèle multitenancy
```
SuperAdmin (Digitoyou)
  └── Compte Syndic (ex: "Gest Syndic SARL")
        ├── Exercice 2024
        ├── Exercice 2025
        ├── Exercice 2026 (actif)
        └── Copropriétés
              ├── Résidence A (44 lots)
              ├── Résidence B (105 lots)
              └── ...
```

Chaque **compte syndic** est un tenant isolé. Un syndic peut gérer N copropriétés. Chaque copropriété peut avoir plusieurs exercices annuels.

### 1.2 Rôles utilisateurs
| Rôle | Accès | Description |
|------|-------|-------------|
| `super_admin` | Tout | Équipe Digitoyou, accès plateforme |
| `syndic_owner` | Son compte | Fondateur du cabinet syndic |
| `syndic_manager` | Copropriétés assignées | Gestionnaire d'immeuble |
| `copropriétaire` | Son lot uniquement | Via app mobile / portail web |
| `conseil_syndical` | Lecture + réclamations | Membres élus du conseil |

---

## 2. Modules fonctionnels (13 modules identifiés + 4 améliorés)

---

### MODULE 1 — Tableau de bord (Dashboard)

**Ce que fait SyndicConnect :**
- KPIs financiers (trésorerie nette, recouvrement %, chèques en attente)
- Alertes critiques
- Indicateurs de gestion (balance caisse, balance banque, contrôle gestion)
- Objectif de recouvrement (jauge circulaire)
- Suivi opérationnel (contentieux + réclamations)
- Journal d'activité
- Espace publicitaire sidebar droite

**Ce que SyndikPro doit faire en mieux :**
- Graphique évolution recouvrement sur 12 mois (courbe)
- Graphique dépenses par catégorie (donut chart)
- Taux d'occupation des lots (occupés vs vacants)
- Top 5 propriétaires avec retard de paiement
- Alertes intelligentes (X jours avant échéance, seuil de trésorerie)
- Dashboard entièrement responsive (mobile-first)
- **Pas de pub** dans l'interface admin — espace monétisé différemment

**Données affichées :**
```
- trésorerie_nette = total_encaissé - total_dépenses
- taux_recouvrement = total_encaissé / total_cotisations * 100
- balance_banque = solde_compte_bancaire
- balance_caisse = solde_caisse_physique
- contentieux_ouverts = count(dossiers where statut = 'ouvert')
- réclamations_ouvertes = count(réclamations where statut = 'ouverte')
```

---

### MODULE 2 — Gestion de la copropriété

**Ce que fait SyndicConnect :**
- Formulaire : Nom, Adresse, Ville, Code postal, Email, Téléphone
- Titre foncier, Numéro de contact SRM
- RIB (Relevé d'Identité Bancaire)
- Logo upload

**Ce que SyndikPro doit faire en mieux :**
- Ajout : Nombre de bâtiments, Nombre d'étages, Année de construction
- Coordonnées GPS (pour cartographie)
- Règlement intérieur uploadable directement ici
- Contacts d'urgence (gardien, plombier, électricien)
- Historique des exercices avec comparatif

**Modèle de données :**
```sql
coproprietes
  id, syndic_id (FK), nom, adresse, ville, code_postal
  email, telephone, titre_foncier, rib
  num_contact_srm, logo_url
  nb_batiments, nb_etages, annee_construction
  lat, lng
  created_at, updated_at

exercices
  id, copropriete_id (FK), annee, date_debut, date_fin
  statut (actif | cloture | archive)
  created_at
```

---

### MODULE 3 — Gestion des lots (Biens)

**Ce que fait SyndicConnect :**
- Code lot, propriétaire, date d'entrée
- Export Excel / PDF
- Appels de fonds (PDF)
- Actions par lot (modifier, supprimer)
- Icône "balance" = dossier contentieux

**Ce que SyndikPro doit faire en mieux :**
- Ajout : type de lot (appartement, parking, commerce, cave)
- Surface en m², étage, numéro de porte
- Tantièmes / quote-part des charges
- Statut du lot (occupé par propriétaire / loué / vacant)
- Historique des propriétaires
- Solde du lot (cumul impayés)
- QR code par lot (pour accès rapide app mobile)

**Modèle de données :**
```sql
lots
  id, copropriete_id (FK), exercice_id (FK)
  code, type (appartement | parking | commerce | cave | autre)
  surface_m2, etage, numero_porte
  tantiemes, quote_part_charges
  statut (occupe | loue | vacant)
  proprietaire_id (FK), date_entree
  solde_cumule, created_at, updated_at

historique_proprietaires
  id, lot_id (FK), proprietaire_id (FK)
  date_debut, date_fin
```

---

### MODULE 4 — Propriétaires (Copropriétaires)

**Ce que fait SyndicConnect :**
- Nom complet, coordonnées (mobile, téléphone, email, adresse)
- Dernière connexion app mobile
- Identifiants visibles en clair (⚠️ FAILLE DE SÉCURITÉ)
- Envoi des identifiants par email/SMS
- Export Excel/PDF
- 15 utilisateurs actifs sur app mobile

**Ce que SyndikPro doit faire en mieux :**
- **Mots de passe JAMAIS affichés** → système invite par email (token temporaire)
- Photo de profil
- Nationalité, CIN/Passeport (optionnel)
- Plusieurs lots par propriétaire possible
- Statut de paiement global visible dans la liste
- Notification push depuis l'interface admin
- Historique des communications envoyées

**Modèle de données :**
```sql
proprietaires
  id, syndic_id (FK)
  nom, prenom, email (unique), telephone, mobile
  adresse, ville, code_postal
  photo_url, cin, nationalite
  email_verified_at
  created_at, updated_at

-- Auth séparée (ne jamais exposer le password)
users
  id, proprietaire_id (FK nullable), role
  email, password (hashed bcrypt/argon2)
  remember_token, last_login_at
  created_at, updated_at
```

---

### MODULE 5 — Paiements (Encaissements)

**Ce que fait SyndicConnect :**
- Référence auto-générée (PAG + timestamp)
- Date, lot, propriétaire, montant, commentaire, compte
- Import CSV des paiements
- Export + filtres
- Actions : valider (✓), voir reçu (👁), transférer (▶)

**Ce que SyndikPro doit faire en mieux :**
- Mode de paiement : espèces / virement / chèque / mobile payment
- Numéro de chèque si paiement par chèque
- Reçu PDF généré automatiquement (avec logo syndic + signature)
- Rapprochement bancaire (lier paiement à relevé bancaire)
- Paiement partiel avec solde restant dû
- Historique complet par lot sur timeline
- Envoi automatique du reçu par email/WhatsApp
- Import via fichier Excel avec mapping colonnes

**Modèle de données :**
```sql
paiements
  id, lot_id (FK), proprietaire_id (FK), exercice_id (FK)
  reference (unique, auto-generated)
  date, montant, mode_paiement (especes | virement | cheque | mobile)
  numero_cheque, banque_cheque
  commentaire, compte_id (FK)
  statut (en_attente | valide | rejete)
  recu_url, created_by (FK users)
  created_at, updated_at

comptes_bancaires
  id, copropriete_id (FK)
  intitule, rib, banque
  solde_actuel, created_at
```

---

### MODULE 6 — Budgets (3 types + répartition)

**Ce que fait SyndicConnect :**
- Budget Fonctionnement : rubriques + postes budgétaires + montant annuel
- Budget Investissement (sous-menu)
- Budget Exceptionnel (sous-menu)
- Répartition des charges (sous-menu)
- Données démo très peu alimentées (montants à 0)

**Ce que SyndikPro doit faire en mieux :**
- Comparatif budget prévisionnel vs réalisé (par rubrique)
- Répartition automatique selon tantièmes des lots
- Simulation : "si je change ce poste, voici l'impact sur les charges"
- Import du budget depuis fichier Excel
- Validation du budget avec workflow d'approbation (conseil syndical)
- Historique des budgets par exercice avec évolution %

**Modèle de données :**
```sql
rubriques_budget
  id, copropriete_id (FK), code, libelle
  type_budget (fonctionnement | investissement | exceptionnel)
  created_at

postes_budgetaires
  id, rubrique_id (FK), exercice_id (FK)
  code, libelle
  montant_previsionnel, montant_realise
  created_at, updated_at

repartition_charges
  id, exercice_id (FK), lot_id (FK)
  montant_total, quote_part, montant_lot
  date_appel, date_echeance, statut
```

---

### MODULE 7 — Dépenses

**Ce que fait SyndicConnect :**
- Date, référence contrat, rubrique, montant
- Statut paiement (Payé / En attente)
- Lien fournisseur, compte
- Total dépenses visible (36 727 MAD / 11 dépenses)
- Ajouter / exporter / filtrer

**Ce que SyndikPro doit faire en mieux :**
- Upload de la facture (PDF/image) directement sur la dépense
- Validation à deux niveaux (gestionnaire → propriétaire conseil)
- Dépense récurrente (mensuelle/annuelle avec génération automatique)
- Rapprochement avec les contrats fournisseurs
- Alerte si dépense dépasse le budget prévisionnel de la rubrique
- OCR basique pour extraire montant/date depuis la facture uploadée

**Modèle de données :**
```sql
depenses
  id, copropriete_id (FK), exercice_id (FK)
  fournisseur_id (FK), rubrique_id (FK), contrat_id (FK nullable)
  date, reference, libelle, montant
  statut_paiement (paye | en_attente | partiellement_paye)
  facture_url, compte_id (FK)
  recurrente (bool), frequence (mensuelle | trimestrielle | annuelle)
  validated_by (FK users), created_by (FK users)
  created_at, updated_at
```

---

### MODULE 8 — Fournisseurs

**Ce que fait SyndicConnect :**
- Raison sociale, ICE, téléphone, email
- Vision débit / crédit / solde par fournisseur
- Ajouter un fournisseur

**Ce que SyndikPro doit faire en mieux :**
- SIRET/ICE + numéro de patente
- Catégorie métier (plomberie, ascenseur, jardinage, nettoyage…)
- Note de satisfaction (1-5 étoiles)
- Historique de toutes les prestations + dépenses liées
- Alertes contrat expirant bientôt
- Blacklist fournisseur avec motif

**Modèle de données :**
```sql
fournisseurs
  id, syndic_id (FK)
  raison_sociale, ice, patente
  telephone, mobile, email, adresse
  categorie, note_satisfaction
  rib, rib_banque
  statut (actif | inactif | blackliste)
  motif_blacklist, created_at, updated_at
```

---

### MODULE 9 — Contrats

**Ce que fait SyndicConnect :**
- Référence, intitulé, fournisseur, poste budgétaire
- Période, montant total, statut
- MODULE VIDE dans la démo — non démontré

**Ce que SyndikPro doit ajouter (module complet) :**
- Date début / fin + renouvellement automatique possible
- Montant mensuel / annuel
- Fréquence de facturation
- Upload du contrat signé (PDF)
- Statut : Actif / Suspendu / Résilié / En renouvellement
- Rappel X jours avant expiration
- Historique des avenants
- Lien automatique avec les dépenses générées

**Modèle de données :**
```sql
contrats
  id, copropriete_id (FK), fournisseur_id (FK)
  rubrique_id (FK), reference
  intitule, description
  date_debut, date_fin
  montant_total, montant_mensuel, frequence_facturation
  renouvellement_auto (bool), delai_rappel_jours
  document_url, statut (actif | suspendu | resilie | renouvellement)
  created_by (FK), created_at, updated_at

avenants_contrat
  id, contrat_id (FK)
  date, description, nouveau_montant
  document_url, created_at
```

---

### MODULE 10 — Réclamations

**Ce que fait SyndicConnect :**
- 35 réclamations, 10 catégories prédéfinies
- Filtrage par catégorie en sidebar
- Statut : Ouverte / Clôturée
- Qui a déposé la réclamation visible

**Catégories observées :** Générale, Ascenseur, Jardinage, Piscine, Bruits des voisins, Électricité, Assemblée générale, Ménage, Plaza Ascenseur

**Ce que SyndikPro doit faire en mieux :**
- Statuts granulaires : Ouverte → En cours → Résolue → Clôturée
- Priorité : Urgente / Haute / Normale / Basse
- Assignation à un gestionnaire / fournisseur
- Upload de photos par le copropriétaire
- Messagerie interne sur chaque réclamation (thread)
- Historique des actions (qui a fait quoi et quand)
- SLA : délai de résolution cible par catégorie
- Notification au copropriétaire à chaque changement de statut
- Création automatique d'une dépense si travaux nécessaires

**Modèle de données :**
```sql
reclamations
  id, copropriete_id (FK), lot_id (FK), proprietaire_id (FK)
  categorie_id (FK), titre, description
  priorite (urgente | haute | normale | basse)
  statut (ouverte | en_cours | resolue | cloturee)
  assigned_to (FK users nullable)
  photos_urls (json array)
  date_ouverture, date_resolution, date_cloture
  sla_jours, created_at, updated_at

messages_reclamation
  id, reclamation_id (FK), user_id (FK)
  contenu, piece_jointe_url
  created_at

categories_reclamation
  id, copropriete_id (FK), libelle, couleur, sla_jours
```

---

### MODULE 11 — Annonces

**Ce que fait SyndicConnect :**
- Titre, rubrique, contenu, statut (Publié)
- Catégories : Générale, Règlement Intérieur, Assemblée Général, Rapport Annuel
- Gestion des catégories d'annonces
- Toutes publiées (pas de brouillon visible)

**Ce que SyndikPro doit faire en mieux :**
- Statuts : Brouillon / Planifiée / Publiée / Archivée
- Programmation de publication (date + heure)
- Ciblage : tous les lots / bâtiment X / lots sélectionnés
- Pièces jointes (PDF, images)
- Notifications push mobile + email automatique à la publication
- Accusé de lecture (vue par N/44 copropriétaires)
- Éditeur rich text (gras, listes, liens)

**Modèle de données :**
```sql
annonces
  id, copropriete_id (FK), categorie_id (FK)
  titre, contenu (text rich)
  statut (brouillon | planifiee | publiee | archivee)
  date_publication, created_by (FK)
  cible_type (tous | batiment | lots_selectionnes)
  cible_ids (json array nullable)
  pieces_jointes (json array)
  created_at, updated_at

lectures_annonce
  id, annonce_id (FK), proprietaire_id (FK), lu_at
```

---

### MODULE 12 — Suivi des travaux

**Ce que fait SyndicConnect :**
- Titre, origine (numéro de lot/référence), date
- Responsable, intervenants
- Fin prévue, statut (Réalisée / En Cours)
- Avancement % (barre de progression)
- Fin réelle, action efficace (oui/non)

**Ce que SyndikPro doit faire en mieux :**
- Lien avec la réclamation d'origine
- Lien avec le fournisseur/contrat
- Galerie photo avant/après
- Budget alloué + dépenses réelles
- Timeline des étapes (checklist d'avancement)
- Rapport de fin de travaux exportable PDF

**Modèle de données :**
```sql
travaux
  id, copropriete_id (FK)
  reclamation_id (FK nullable), fournisseur_id (FK nullable)
  titre, description, origine_ref
  responsable, intervenants (json)
  date_debut, date_fin_prevue, date_fin_reelle
  avancement_pct (0-100)
  statut (planifie | en_cours | realise | annule)
  budget_alloue, cout_reel
  photos_avant (json), photos_apres (json)
  action_efficace (bool nullable)
  created_at, updated_at

etapes_travaux
  id, travail_id (FK), libelle, ordre
  done (bool), done_at, done_by
```

---

### MODULE 13 — Échéances & Rappels

**Ce que fait SyndicConnect :**
- Titre, date d'échéance, notifier avant (X jours)
- 3 échéances observées (paiement facture ascenseur)

**Ce que SyndikPro doit faire en mieux :**
- Type d'échéance : paiement fournisseur / renouvellement contrat / AG / déclaration fiscale
- Récurrence (mensuelle, annuelle)
- Destinataire de la notification (gestionnaire / conseil syndical)
- Canal : email + push + SMS
- Tableau de bord des prochaines échéances (30/60/90 jours)

**Modèle de données :**
```sql
echeances
  id, copropriete_id (FK)
  titre, description, type_echeance
  date_echeance, notifier_avant_jours
  recurrente (bool), frequence
  destinataires (json), canaux (json)
  created_at, updated_at
```

---

### MODULE 14 — Documents (GED)

**Ce que fait SyndicConnect :**
- Date, titre, type de document, fichier uploadé
- Types : Document, Factures fournisseur, Convocations AG, Rapports, Règlement intérieur, Documents financières
- Actions : partager, modifier, supprimer

**Ce que SyndikPro doit faire en mieux :**
- Arborescence dossiers/sous-dossiers
- Contrôle d'accès par document (visible par tous / conseil syndical / admin uniquement)
- Versioning (v1, v2, v3 d'un même document)
- Recherche full-text dans les documents
- Lien automatique avec les autres modules (annonce → joint à un document GED)
- Quota de stockage par compte syndic

**Modèle de données :**
```sql
dossiers_ged
  id, copropriete_id (FK), parent_id (FK nullable)
  nom, acces (tous | conseil | admin)
  created_at

documents_ged
  id, dossier_id (FK), copropriete_id (FK)
  titre, type_document
  fichier_url, taille_bytes, mime_type
  version, document_parent_id (FK nullable)
  acces (tous | conseil | admin)
  uploaded_by (FK), created_at, updated_at
```

---

### MODULE 15 — Appels de fonds (NOUVEAU vs SyndicConnect)

SyndicConnect génère un PDF "Appels de fonds" depuis le module Biens, sans vrai module dédié.

**Ce que SyndikPro doit créer :**
- Génération d'appels de fonds par exercice
- Calcul automatique selon tantièmes et budget approuvé
- Envoi par email à tous les copropriétaires (ou sélection)
- Suivi des paiements par appel de fonds
- Relances automatiques (J+15, J+30, J+60)
- PDF personnalisé avec logo, RIB, détail des charges

**Modèle de données :**
```sql
appels_fonds
  id, exercice_id (FK), copropriete_id (FK)
  reference, titre, date_appel, date_echeance
  statut (brouillon | envoye | partiellement_paye | solde)
  created_by (FK), sent_at, created_at

lignes_appel_fonds
  id, appel_fonds_id (FK), lot_id (FK), proprietaire_id (FK)
  montant_du, montant_paye, solde
  statut_lot (en_attente | paye | partiellement_paye | contentieux)
```

---

### MODULE 16 — Assemblées Générales (NOUVEAU)

Non géré comme module dans SyndicConnect (seulement catégorie d'annonce).

**Ce que SyndikPro doit créer :**
- Convocation AG (génération PDF automatique)
- Ordre du jour structuré
- Feuille de présence digitale (signature électronique ou QR code)
- Vote en ligne (résolutions soumises au vote)
- Procès-verbal généré automatiquement
- Quorum calculé automatiquement selon tantièmes

---

## 3. Interface utilisateur — Règles de design

### 3.1 Palette couleurs SyndikPro (proposée)
```css
--primary: #1B4F72;        /* Bleu marine professionnel */
--primary-light: #2980B9;  /* Bleu action */
--accent: #E67E22;         /* Orange CTA */
--success: #27AE60;
--warning: #F39C12;
--danger: #E74C3C;
--bg-primary: #FFFFFF;
--bg-secondary: #F8F9FA;
--text-primary: #2C3E50;
--text-secondary: #7F8C8D;
```

### 3.2 Navigation
- Sidebar gauche fixe sur desktop (collapsible)
- Bottom nav sur mobile (5 items max)
- Breadcrumb systématique pour orientation
- Switcher de copropriété accessible en 1 clic (top navbar)
- Switcher d'exercice (année) en haut de chaque module financier

### 3.3 Composants critiques
- **DataTable** : toujours en français, tri, filtre, pagination, sélection multiple, export
- **KPI Cards** : valeur + variation vs période précédente + sparkline
- **Formulaires** : validation en temps réel, messages d'erreur clairs en français
- **Modales de confirmation** pour toute suppression
- **Toast notifications** pour les actions (succès/erreur)
- **Skeleton loaders** pendant chargement des données

### 3.4 Améliorations UX prioritaires vs SyndicConnect
1. **100% français** — aucun texte anglais résiduel
2. **Cohérence des boutons** — CTA primary teal/bleu partout (pas de mix orange/bleu/vert)
3. **Formulaires en ligne** — modifier un lot sans changer de page (inline edit)
4. **Confirmation avant suppression** — avec recap de ce qui sera supprimé
5. **Mode sombre** supporté nativement
6. **Responsive** — utilisable sur tablette (syndics utilisent souvent iPad)

---

## 4. API REST — Structure des endpoints

### Authentification
```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/invite-proprietaire
```

### Copropriétés
```
GET    /api/coproprietes
POST   /api/coproprietes
GET    /api/coproprietes/{id}
PUT    /api/coproprietes/{id}
DELETE /api/coproprietes/{id}
GET    /api/coproprietes/{id}/exercices
POST   /api/coproprietes/{id}/exercices
```

### Lots
```
GET    /api/coproprietes/{id}/lots
POST   /api/coproprietes/{id}/lots
GET    /api/lots/{id}
PUT    /api/lots/{id}
DELETE /api/lots/{id}
GET    /api/lots/{id}/historique-paiements
GET    /api/lots/{id}/solde
```

### Paiements
```
GET    /api/exercices/{id}/paiements
POST   /api/exercices/{id}/paiements
GET    /api/paiements/{id}
PUT    /api/paiements/{id}
DELETE /api/paiements/{id}
POST   /api/paiements/import-csv
GET    /api/paiements/{id}/recu-pdf
```

### Réclamations
```
GET    /api/coproprietes/{id}/reclamations
POST   /api/coproprietes/{id}/reclamations
GET    /api/reclamations/{id}
PUT    /api/reclamations/{id}
PATCH  /api/reclamations/{id}/statut
GET    /api/reclamations/{id}/messages
POST   /api/reclamations/{id}/messages
```

### Annonces
```
GET    /api/coproprietes/{id}/annonces
POST   /api/coproprietes/{id}/annonces
PUT    /api/annonces/{id}
POST   /api/annonces/{id}/publier
GET    /api/annonces/{id}/lectures
```

---

## 5. Application mobile copropriétaire

**Fonctionnalités observées sur SyndicConnect :**
- 15 utilisateurs actifs (Gest Syndic)
- Connexion avec identifiant/mot de passe (prop18659774 / syndic1234)
- Réclamations soumissibles depuis l'app

**Ce que SyndikPro doit offrir en plus :**
- **Tableau de bord** : mon solde, mes appels de fonds en attente
- **Mes paiements** : historique + téléchargement des reçus
- **Réclamations** : soumettre avec photos + suivre statut en temps réel
- **Annonces** : fil d'actualité de la résidence avec push notification
- **Documents** : accès au règlement intérieur, PV AG, etc.
- **Assemblées générales** : vote en ligne + feuille de présence
- **Contact** : appel direct au syndic en 1 tap
- **Authentification** : biométrie (Face ID / empreinte) + OTP email

**Tech stack mobile :** Flutter (iOS + Android) — déjà utilisé pour Aji Tfarraj

---

## 6. Sécurité — Corrections critiques vs SyndicConnect

| Problème SyndicConnect | Solution SyndikPro |
|------------------------|-------------------|
| Mots de passe affichés en clair | Jamais exposés, reset par email sécurisé |
| Identifiants simples (prop18659774) | Invitation par email avec lien temporaire |
| Pas de 2FA visible | 2FA optionnel par TOTP ou OTP email |
| Sessions non expirables visiblement | JWT avec expiration + refresh token |
| Pas de logs d'accès | Audit log complet (qui, quoi, quand, IP) |
| Mélange de rôles | RBAC granulaire par module |

---

## 7. Modèle de tarification suggéré

```
Starter   : 199 MAD/mois — 1 copropriété, jusqu'à 50 lots
Pro       : 499 MAD/mois — 5 copropriétés, jusqu'à 500 lots
Business  : 999 MAD/mois — copropriétés illimitées, lots illimités
           + White label disponible
           + Support prioritaire
```

---

## 8. Plan de développement recommandé (phases)

### Phase 1 — MVP (2 mois)
- Auth (admin + copropriétaire)
- Multi-copropriétés + exercices
- Lots (CRUD)
- Paiements (encaissements)
- Dépenses
- Tableau de bord basique
- App mobile : login + solde + réclamations

### Phase 2 — Core (1 mois)
- Réclamations (complet avec messagerie)
- Annonces avec push notifications
- Documents (GED simple)
- Fournisseurs + Contrats
- Appels de fonds

### Phase 3 — Avancé (1 mois)
- Budgets avec comparatif prévisionnel/réel
- Assemblées Générales
- Suivi des travaux avancé
- Rapports PDF avancés
- Import/Export Excel avancé

### Phase 4 — Différenciation (ongoing)
- OCR factures
- Vote AG en ligne
- Tableau de bord analytique
- API publique (intégrations tierces)
- White label

---

## 9. Points différenciants à mettre en avant commercialement

1. **Sécurité renforcée** — "Vos données et celles de vos copropriétaires sont protégées"
2. **100% en français** — "Interface entièrement en français, pensée pour le marché marocain"
3. **Loi 18-00 intégrée** — "Conforme à la loi marocaine sur la copropriété"
4. **App mobile moderne** — "Vos copropriétaires suivent tout depuis leur smartphone"
5. **Support local** — "Équipe basée à Casablanca, support en Darija/Français"
6. **Assemblées en ligne** — "Organisez vos AG sans déplacement"
7. **Pas de pub** — "Interface professionnelle, sans publicités intrusives"

---

## 10. Fichier CONTEXT pour Claude Code

Colle ce bloc au début de chaque session Claude Code pour garder le contexte :

```
Projet : SyndikPro
Type : SaaS B2B gestion copropriété (Maroc)
Stack : Next.js 14 App Router + Laravel 11 API + PostgreSQL + Flutter + Tailwind
Team : Mouad (dev fullstack, Digital Director Digitoyou) + Abdellah (co-founder)
Concurrent analysé : SyndicConnect (app.syndicconnect.ma)
Objectif : Surpasser SyndicConnect sur UX, sécurité, et fonctionnalités
Langue cible : 100% français (UI + code comments)
Marché : Syndics professionnels marocains (Casablanca, Agadir, Marrakech...)
Modules prioritaires : Auth, Copropriétés, Lots, Paiements, Réclamations, Dashboard
Voir specs complètes : syndikpro_specs.md
```

---

*Document généré par Claude — Digitoyou © 2026*
*Basé sur analyse directe de SyndicConnect le 13/05/2026*
