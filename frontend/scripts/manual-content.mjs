/**
 * Imaro user manual — content tree (French).
 * Each chapter is a list of typed blocks rendered by build-user-manual-pdf.mjs.
 *
 * Block types:
 *   { type: 'p'|'lead'|'h2'|'h3', text }
 *   { type: 'list'|'check'|'num', items }
 *   { type: 'tip'|'warn'|'legal'|'ai'|'ok', title?, text }
 *   { type: 'def', items: [[term, def], ...] }
 *   { type: 'table', headers, rows, widths }
 */

export const PARTS = [
  // ─── PART I ─────────────────────────────────────────────────────────────
  {
    title: 'Partie I — Premiers pas',
    blurb:
      "Tout ce qu'il faut savoir pour démarrer avec Imaro : créer son compte, prendre en main l'interface, comprendre les rôles et basculer en arabe.",
    chapters: [
      {
        title: 'Bienvenue dans Imaro',
        intro:
          'Imaro est la plateforme tout-en-un pour gérer la copropriété au Maroc. Conformité légale, comptabilité partie double, recouvrement, AG, IA — tout est intégré.',
        blocks: [
          {
            type: 'lead',
            text: 'Imaro réunit dans une seule application toutes les obligations légales du syndic marocain et tous les outils de productivité moderne. Aucun fichier Excel à maintenir, aucun document à archiver à la main.',
          },
          { type: 'h2', text: "Ce qu'Imaro fait pour vous" },
          {
            type: 'list',
            items: [
              'Centralise toutes vos résidences, lots, copropriétaires et occupants dans un même tenant.',
              'Génère automatiquement les 12 annexes du Décret 2.23.700 en PDFs signés avec QR.',
              'Tient la comptabilité partie double aux normes du Plan Comptable Marocain (CGNC).',
              'Rapproche votre relevé bancaire avec vos paiements et dépenses en quelques secondes.',
              'Pilote le recouvrement : pénalités, mises en demeure, alertes prescription quinquennale.',
              'Propulse trois assistants IA : audit conformité, OCR factures, suggestions budget.',
              'Offre un portail mobile-first dédié au copropriétaire (Android, iOS, navigateur).',
            ],
          },
          { type: 'h2', text: "À qui s'adresse Imaro ?" },
          {
            type: 'def',
            items: [
              [
                'Cabinets syndic',
                "qu'ils gèrent 1 ou 100 résidences. Imaro est multi-tenant et passe à l'échelle.",
              ],
              [
                'Syndics bénévoles',
                'présidents de conseils syndicaux ou résidents-syndics nommés en AG.',
              ],
              [
                'Gestionnaires patrimoine',
                "qui gèrent un portefeuille immobilier pour le compte d'investisseurs.",
              ],
            ],
          },
          {
            type: 'ok',
            title: 'Pourquoi choisir Imaro ?',
            text: 'Imaro est conçu spécifiquement pour le marché marocain : Plan Comptable Marocain, Loi 18-00, Décret 2.23.700, dirhams, OTP WhatsApp, banques marocaines, langue arabe RTL native.',
          },
          { type: 'h2', text: 'Les 8 grands modules' },
          {
            type: 'table',
            headers: ['Module', 'À quoi ça sert', "Fréquence d'usage"],
            widths: [40, 50, 20],
            rows: [
              [
                'Copropriétés',
                'Résidences, lots, copropriétaires, occupants',
                'Quotidien',
              ],
              [
                'Finances',
                'Appels de fonds, paiements, dépenses, budgets',
                'Quotidien',
              ],
              [
                'Recouvrement',
                'Impayés, pénalités, mises en demeure',
                'Hebdomadaire',
              ],
              ['Conformité', "Annexes, calendrier, journal d'audit", 'Mensuel'],
              ['Comptabilité', 'Partie double, balance, clôture', 'Mensuel'],
              [
                'Patrimoine',
                'Équipements, emprunts, travaux exceptionnels',
                'Ponctuel',
              ],
              ['Pointage', 'Rapprochement bancaire automatique', 'Mensuel'],
              [
                'Assistant IA',
                'Audit, OCR factures, suggestions budget',
                'Sur demande',
              ],
            ],
          },
          {
            type: 'tip',
            title: "Lisez d'abord le chapitre 4",
            text: 'Le Tableau de bord est le point central depuis lequel vous pouvez atteindre 80 % des actions courantes en un clic.',
          },
        ],
      },
      {
        title: 'Connexion et premier login',
        intro:
          "Imaro utilise l'authentification par OTP WhatsApp — pas de mot de passe à retenir, pas de mail perdu.",
        blocks: [
          { type: 'h2', text: 'Accéder à Imaro' },
          {
            type: 'num',
            items: [
              'Ouvrez votre navigateur (Chrome, Safari, Edge ou Firefox).',
              "Tapez l'adresse : app.imaro.ma.",
              'Cliquez sur « Se connecter ».',
              'Saisissez votre numéro WhatsApp (format +212 6 XX XX XX XX).',
              'Recevez votre code à 6 chiffres dans la conversation WhatsApp Imaro.',
              'Saisissez le code dans Imaro. Vous êtes connecté.',
            ],
          },
          {
            type: 'tip',
            title: 'Code non reçu ?',
            text: "Un bouton « Renvoyer » apparaît après 60 secondes. Vérifiez aussi votre WhatsApp Web si vous l'utilisez sur ordinateur.",
          },
          { type: 'h2', text: "Premier login d'un nouveau syndic" },
          {
            type: 'p',
            text: "À votre toute première connexion, Imaro lance un assistant d'onboarding en 5 étapes pour importer vos données existantes. Ce wizard est crucial si vous rejoignez Imaro en cours d'année — il évite de saisir des centaines de copropriétaires à la main.",
          },
          {
            type: 'num',
            items: [
              'Importer vos lots (numéros, surfaces, quotités).',
              'Importer vos copropriétaires (nom, téléphone, lien lot).',
              'Importer les soldes initiaux par copropriétaire.',
              "Importer l'historique des paiements de l'exercice en cours.",
              'Importer la liste de vos prestataires habituels.',
            ],
          },
          {
            type: 'tip',
            title: 'Modèles Excel pré-formatés',
            text: "Pour chaque étape, téléchargez le modèle proposé. Il contient déjà les bonnes colonnes — vous n'avez qu'à coller vos données. Voir aussi Chapitre 10 : Imports massifs.",
          },
          { type: 'h2', text: 'Rôles et permissions' },
          {
            type: 'p',
            text: "Imaro détecte automatiquement votre rôle à la connexion et adapte l'interface. Tous les rôles passent par le même portail de connexion.",
          },
          {
            type: 'table',
            headers: ['Rôle', 'Accès', "Cas d'usage"],
            widths: [30, 50, 30],
            rows: [
              [
                'Super Admin',
                "Tout l'écosystème Imaro",
                'Équipe Imaro uniquement',
              ],
              [
                'Syndic Owner',
                'Tout le tenant + facturation',
                'Patron du cabinet syndic',
              ],
              [
                'Manager / Gestionnaire',
                'Toutes les opérations métier',
                'Collaborateur principal',
              ],
              [
                'Agent recouvrement',
                'Recouvrement + lectures',
                'Suivi impayés',
              ],
              [
                'Conseil syndical',
                'Lectures + AG + documents',
                'Comité de surveillance',
              ],
              ['Résident (Copro)', 'Son portail mobile', 'Copropriétaire'],
            ],
          },
          {
            type: 'warn',
            title: 'Sécurité',
            text: "Ne partagez jamais votre code OTP. Imaro ne vous demandera jamais ce code par téléphone ou par mail — uniquement à l'écran de connexion.",
          },
          { type: 'h2', text: 'Multi-langue' },
          {
            type: 'p',
            text: "Imaro est disponible en français et en arabe. Le bouton FR / AR en haut à droite bascule toute l'interface. En arabe, le layout passe automatiquement en RTL (droite-à-gauche) — sidebar à droite, tableaux inversés, dates au format arabe.",
          },
          {
            type: 'ok',
            title: 'Documents légaux',
            text: "Toutes les annexes PDF générées sont en français (langue officielle de l'administration marocaine), quelle que soit la langue d'interface choisie.",
          },
        ],
      },
      {
        title: 'Tour du propriétaire',
        intro:
          "Comprendre la navigation, les composants visuels et les codes couleurs d'Imaro.",
        blocks: [
          { type: 'h2', text: 'La sidebar de navigation' },
          {
            type: 'p',
            text: 'À gauche de votre écran, la sidebar navy regroupe tous les modules. Elle est organisée en sections logiques pour refléter votre cycle de travail.',
          },
          {
            type: 'table',
            headers: ['Section', 'Pages incluses'],
            widths: [25, 75],
            rows: [
              ['Dashboard', 'Tableau de bord, Assistant IA'],
              [
                'Copropriété',
                'Résidences, Lots, Copropriétaires, Occupants, Prestataires',
              ],
              [
                'Finances',
                'Paiements, Dépenses, Budgets, Recouvrement, Autres recettes, Remboursements',
              ],
              ['Patrimoine', 'Équipements, Emprunts, Travaux exceptionnels'],
              ['Conformité', "Calendrier, Annexes, Journal d'audit"],
              [
                'Opérations',
                'Pointage bancaire, Imports, Comptabilité, Documents, Annonces, AG, Tickets, Profil',
              ],
            ],
          },
          { type: 'h2', text: 'Le header supérieur' },
          {
            type: 'list',
            items: [
              'Logo Imaro à gauche — clic = retour au tableau de bord.',
              'Sélecteur de résidence — filtre tous les écrans sur une résidence (ou « Toutes »).',
              'Bouton FR / AR — bascule de langue (et RTL en arabe).',
              'Bouton thème — clair / sombre.',
              'Avatar utilisateur — accès profil, équipe, déconnexion.',
            ],
          },
          { type: 'h2', text: 'Les codes couleurs Imaro' },
          {
            type: 'def',
            items: [
              [
                'Navy #1B4F72',
                "couleur principale d'Imaro. Sidebar, titres, boutons primaires.",
              ],
              [
                'Orange #E67E22',
                "couleur d'accent. CTA importants, badges d'alerte, soulignements.",
              ],
              ['Vert #27AE60', 'succès, paiements reçus, statuts validés.'],
              ['Rouge #E74C3C', 'erreurs, impayés, prescriptions imminentes.'],
              ['Orange clair', 'partiel, en attente, mise en demeure envoyée.'],
            ],
          },
          { type: 'h2', text: 'Les composants partagés' },
          {
            type: 'p',
            text: 'Imaro réutilise des composants standards sur toutes les pages pour vous offrir une expérience cohérente.',
          },
          {
            type: 'list',
            items: [
              'KPIs — cartes statistiques en haut des pages (4 ou 5 indicateurs clés).',
              'Tables — tri sur les colonnes, recherche globale, pagination, export CSV.',
              'Badges statut — payé (vert), impayé (rouge), partiel (orange), retard (rouge foncé).',
              "Montants — toujours formatés « 1 500,00 DH » (locale fr-MA + séparateur d'espace).",
              'Modales de confirmation — toujours pour les actions destructives.',
              "États vides — message + CTA quand une page n'a pas encore de données.",
              'Squelettes de chargement — affichés pendant les requêtes serveur.',
            ],
          },
          {
            type: 'tip',
            title: 'Raccourci universel',
            text: 'Sur toutes les tables avec une icône loupe, vous pouvez taper directement pour filtrer. Le filtre est insensible aux accents et à la casse.',
          },
          { type: 'h2', text: 'Le mode sombre' },
          {
            type: 'p',
            text: "Cliquez sur l'icône lune/soleil en haut à droite. Imaro passe en mode sombre — sidebar plus claire, fond noir, contrastes adaptés. Idéal pour le travail en soirée. Votre choix est mémorisé.",
          },
        ],
      },
    ],
  },

  // ─── PART II ────────────────────────────────────────────────────────────
  {
    title: 'Partie II — Le quotidien du gestionnaire',
    blurb:
      "Les pages que vous ouvrirez tous les jours : tableau de bord, résidences, lots, copropriétaires, occupants, prestataires, et l'outil d'import massif.",
    chapters: [
      {
        title: 'Tableau de bord',
        intro:
          "Le point d'entrée central : KPIs financiers, modules clés, top impayés, AG à venir, actions rapides.",
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/dashboard' },
          {
            type: 'lead',
            text: "Le tableau de bord est conçu pour répondre à la question « par où je commence aujourd'hui ? » en un coup d'œil. Il vous évite d'avoir à ouvrir chaque module pour savoir ce qui demande votre attention.",
          },
          { type: 'h2', text: 'Les 4 KPIs principaux' },
          {
            type: 'p',
            text: 'En haut de la page, 4 cartes statistiques résument la santé de votre portefeuille.',
          },
          {
            type: 'table',
            headers: ['KPI', "Ce qu'il mesure", 'Couleur'],
            widths: [30, 55, 15],
            rows: [
              [
                'Résidences',
                'Nombre de copropriétés actives dans votre tenant',
                'Navy',
              ],
              [
                'Copropriétaires',
                'Total des comptes copropriétaires (tous immeubles)',
                'Navy',
              ],
              ['CA mensuel', 'Encaissements du mois en cours', 'Vert'],
              [
                'Total impayés',
                'Somme due par les copropriétaires en retard',
                'Rouge',
              ],
            ],
          },
          {
            type: 'tip',
            title: 'Filtre par résidence',
            text: "Le sélecteur de résidence en haut à droite filtre les 4 KPIs et toutes les sections du dashboard sur une résidence spécifique. Idéal pour le suivi d'une copropriété en particulier.",
          },
          { type: 'h2', text: "L'aperçu modules" },
          {
            type: 'p',
            text: 'Section composée de 6 grandes cartes navigant vers les modules clés. Chaque carte affiche une valeur synthèse et un libellé court.',
          },
          {
            type: 'list',
            items: [
              "Assistant IA (dégradé violet) — accès direct à l'audit, OCR, budget IA.",
              'Conformité — nombre de tâches en cours dans le calendrier.',
              'Recouvrement — montant des impayés et lots concernés.',
              'Pointage bancaire — dernière date de pointage.',
              "Patrimoine — nombre d'équipements + emprunts actifs.",
              'Annexes — date de dernière génération des annexes obligatoires.',
            ],
          },
          { type: 'h2', text: 'Le graphique recouvrement' },
          {
            type: 'p',
            text: "Histogramme mensuel sur 12 mois glissants. Deux barres par mois : « Recouvré » (vert) et « Restant à recouvrer » (orange). Permet d'identifier instantanément les mois faibles et les tendances.",
          },
          { type: 'h2', text: 'Top impayés et tickets urgents' },
          {
            type: 'p',
            text: 'Deux tableaux côte-à-côte sous le graphique. Le Top impayés liste les 5 plus gros soldes débiteurs avec lien direct vers la fiche copropriétaire. Les tickets urgents listent les réclamations prioritaires non encore traitées.',
          },
          { type: 'h2', text: 'Actions rapides' },
          {
            type: 'p',
            text: 'En bas du dashboard, une bande de 8 boutons couvre les actions les plus fréquentes : nouvel appel de fonds, encaisser un paiement, créer un ticket, convoquer une AG, lancer un audit IA, démarrer un pointage bancaire, générer une annexe, ajouter un occupant. Chaque bouton vous amène directement à la page concernée — pas de menu à parcourir.',
          },
          {
            type: 'ok',
            title: 'Bonne pratique',
            text: 'Consultez le dashboard chaque matin en arrivant au bureau. 2 minutes suffisent pour identifier les priorités de la journée.',
          },
        ],
      },
      {
        title: 'Résidences',
        intro: 'Gérer la liste de vos copropriétés et leurs détails.',
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/residences' },
          {
            type: 'lead',
            text: "Une « résidence » dans Imaro représente une copropriété (un immeuble ou un ensemble immobilier). C'est l'entité racine qui contient lots, copropriétaires, exercices et documents.",
          },
          { type: 'h2', text: 'La liste des résidences' },
          {
            type: 'p',
            text: 'Tableau paginé avec une carte par résidence. Pour chaque ligne, vous voyez :',
          },
          {
            type: 'list',
            items: [
              'Nom de la résidence (par exemple « Résidence Atlas »).',
              'Ville et adresse.',
              'Nombre de lots et de copropriétaires.',
              'Date du prochain exercice à clôturer.',
              'Statut : active, archivée, en onboarding.',
            ],
          },
          {
            type: 'tip',
            title: 'Recherche rapide',
            text: 'Tapez les premières lettres du nom dans la barre de recherche pour filtrer instantanément.',
          },
          { type: 'h2', text: 'La fiche résidence' },
          {
            type: 'p',
            text: 'Cliquer sur une ligne ouvre la fiche détaillée organisée en 4 onglets :',
          },
          {
            type: 'def',
            items: [
              [
                'Lots',
                'Liste des unités (appartements, bureaux, caves, parkings, locaux commerciaux).',
              ],
              ['Copropriétaires', 'Personnes propriétaires des lots.'],
              [
                'Exercices',
                'Périodes comptables (généralement 1er janvier - 31 décembre).',
              ],
              [
                'Documents',
                "Règlement de copropriété, plans, PV d'AG, contrats.",
              ],
            ],
          },
          { type: 'h2', text: 'Créer une nouvelle résidence' },
          {
            type: 'num',
            items: [
              'Cliquez sur « + Nouvelle résidence » en haut à droite.',
              "Renseignez : nom, ville, adresse, numéro de RIBR (Registre d'Immatriculation des Biens en Régime de copropriété).",
              'Indiquez le régime fiscal : simplifié (≤ 200 000 MAD/an) ou normal.',
              "Choisissez la date de début d'exercice (par défaut 1er janvier).",
              'Cliquez « Créer ». La résidence apparaît dans la liste.',
            ],
          },
          {
            type: 'legal',
            title: 'Régime fiscal — Décret 2.23.700',
            text: 'Si le total annuel des appels de fonds dépasse 200 000 MAD, la copropriété bascule automatiquement en régime normal avec annexes étendues (3, 4 obligatoires en plus de 10, 13-1, 13-2). Imaro détecte ce seuil automatiquement.',
          },
          { type: 'h2', text: 'Édition et archivage' },
          {
            type: 'p',
            text: "Vous pouvez éditer les informations d'une résidence à tout moment via le menu « ... » de la ligne. L'archivage est une action irréversible — utilisez-la uniquement pour les résidences sorties du portefeuille (vente du syndic, dissolution).",
          },
          {
            type: 'warn',
            title: 'Archivage',
            text: "Une résidence archivée n'apparaît plus dans les listes ni les statistiques. Ses données restent stockées 7 ans (rétention légale du journal d'audit) mais ne sont plus modifiables.",
          },
        ],
      },
      {
        title: 'Lots',
        intro:
          "Les unités physiques d'une copropriété : appartements, locaux, parkings, caves.",
        blocks: [
          {
            type: 'lead',
            text: "Un lot est l'unité de gestion de base d'une copropriété. Chaque lot possède une quote-part (tantième) qui détermine sa contribution aux charges.",
          },
          { type: 'h2', text: 'Les types de lots' },
          {
            type: 'list',
            items: [
              'Appartement — usage résidentiel.',
              'Bureau — usage professionnel non commercial.',
              'Local commercial — boutique, restaurant, agence.',
              'Parking — emplacement véhicule (couvert ou découvert).',
              'Cave — local de stockage.',
              'Studio — petite unité résidentielle.',
              'Duplex / Triplex — plusieurs niveaux dans le même lot.',
              'Local technique — abri ascenseur, salle des machines.',
            ],
          },
          { type: 'h2', text: "Les attributs d'un lot" },
          {
            type: 'table',
            headers: ['Attribut', 'Description'],
            widths: [25, 75],
            rows: [
              [
                'Numéro',
                'Identifiant unique dans la copropriété (ex : A-101, B-202)',
              ],
              ['Type', 'Appartement, bureau, parking, etc.'],
              ['Surface', 'En mètres carrés'],
              ['Étage', 'RDC, 1er, 2ème, sous-sol -1, etc.'],
              [
                'Tantième',
                'Quote-part dans les charges (sur base millième ou autre)',
              ],
              [
                'Immeuble',
                "Bâtiment d'appartenance (si la résidence en compte plusieurs)",
              ],
              ['Propriétaire', 'Lien vers le copropriétaire principal'],
            ],
          },
          { type: 'h2', text: 'La quote-part (tantième)' },
          {
            type: 'p',
            text: 'Le tantième est la clé de répartition des charges. Si votre lot fait 80 sur 1000 millièmes, il paie 8 % des charges communes. Le total des tantièmes doit toujours faire 1000 (ou 10 000 selon le système retenu dans le règlement de copropriété).',
          },
          {
            type: 'tip',
            title: 'Vérifier la somme des tantièmes',
            text: 'Sur la liste des lots, le pied de tableau affiche la somme totale des tantièmes. Si vous ne tombez pas pile sur 1000 ou 10000, vous avez probablement une erreur de saisie quelque part.',
          },
          { type: 'h2', text: 'Génération assistée de lots' },
          {
            type: 'p',
            text: "Pour les résidences neuves ou en onboarding, un assistant « Générer des lots en masse » crée automatiquement N lots avec numérotation séquentielle (A-101, A-102, A-103…). Vous renseignez le bâtiment, l'étage de départ, le nombre de lots par étage, et Imaro génère le tout en quelques secondes.",
          },
          {
            type: 'ai',
            title: 'Astuce IA',
            text: "Si vous avez un plan PDF du règlement de copropriété, l'Assistant IA peut bientôt extraire automatiquement la liste des lots et leurs tantièmes. (Fonctionnalité prévue dans une prochaine version.)",
          },
        ],
      },
      {
        title: 'Copropriétaires',
        intro:
          'Les propriétaires de lots — votre interlocuteur principal et la cible des appels de fonds.',
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/coproprietaires' },
          {
            type: 'lead',
            text: "Le copropriétaire est la personne (physique ou morale) à qui appartient un lot. Imaro consolide tous les copropriétaires de votre tenant — peu importe la résidence ou l'immeuble.",
          },
          { type: 'h2', text: 'La liste consolidée' },
          {
            type: 'p',
            text: 'Tableau unique avec toutes vos copropriétaires. Colonnes affichées :',
          },
          {
            type: 'list',
            items: [
              'Nom complet ou raison sociale (pour les SCI).',
              'Téléphone (toujours au format international +212…).',
              'Email (facultatif).',
              'Résidence et lot(s) associés.',
              'Solde courant — vert si à jour, rouge si débiteur.',
              'Statut portail — invité, actif, non invité.',
            ],
          },
          { type: 'h2', text: 'La fiche copropriétaire' },
          {
            type: 'p',
            text: 'Sur clic, la fiche détaillée présente :',
          },
          {
            type: 'list',
            items: [
              "Informations d'identité (nom, CIN ou ICE, téléphone, email, adresse).",
              'Lots détenus avec quote-part totale.',
              'Historique complet des appels de fonds émis.',
              'Historique des paiements reçus.',
              'Solde par exercice et solde courant.',
              'Notes internes (privées, non visibles côté résident).',
            ],
          },
          { type: 'h2', text: 'Inviter au portail résident' },
          {
            type: 'p',
            text: "Sur la fiche, un bouton « Inviter au portail » envoie un message WhatsApp avec un lien d'activation. Le copropriétaire suit le lien, reçoit son OTP, et accède à son portail mobile.",
          },
          {
            type: 'tip',
            title: 'Adoption du portail',
            text: "Lancez l'invitation par vagues de 20-30 copropriétaires. Cela évite de saturer votre support si plusieurs personnes vous appellent en même temps avec des questions d'activation.",
          },
          { type: 'h2', text: 'Création manuelle vs import' },
          {
            type: 'p',
            text: 'Pour ajouter un copropriétaire ponctuellement, cliquez « + Nouveau » et remplissez le formulaire. Pour importer une liste entière au démarrage, utilisez le module Imports (Chapitre 10).',
          },
          {
            type: 'warn',
            title: 'Téléphone unique',
            text: 'Le numéro WhatsApp doit être unique dans votre tenant. Si deux copropriétaires partagent le même téléphone (par exemple un couple), saisissez tout de même un numéro distinct pour permettre une connexion individuelle au portail.',
          },
        ],
      },
      {
        title: 'Occupants',
        intro:
          'Le registre des locataires, propriétaires occupants et usufruitiers — obligation légale Loi 18-00 art. 11.',
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/occupants' },
          {
            type: 'lead',
            text: "L'occupant est la personne qui occupe réellement le lot — qui peut être le copropriétaire lui-même, un locataire, ou un usufruitier. Distinguer ces deux notions est essentiel pour la convocation aux AG et la communication des charges.",
          },
          {
            type: 'legal',
            title: 'Loi 18-00 article 11',
            text: 'Le syndic doit tenir un registre à jour des occupants de chaque lot. Cette obligation existe en parallèle de celle de connaître les copropriétaires.',
          },
          { type: 'h2', text: "Les 3 types d'occupants" },
          {
            type: 'def',
            items: [
              [
                'Propriétaire occupant',
                'le copropriétaire habite ou utilise son propre lot. Cas le plus fréquent.',
              ],
              [
                'Locataire',
                'le lot est loué. Le syndic doit avoir une copie du bail.',
              ],
              [
                'Usufruitier',
                'séparation entre nu-propriété et usufruit (souvent suite à une succession).',
              ],
            ],
          },
          { type: 'h2', text: 'Page Occupants' },
          {
            type: 'p',
            text: "En haut de page, 3 KPIs : nombre de propriétaires occupants, nombre de locataires, nombre d'usufruitiers. En dessous, la table liste tous les occupants avec leur lot, copropriétaire, type, contact, période d'occupation, et statut du bail (le cas échéant).",
          },
          { type: 'h2', text: 'Ajouter un occupant' },
          {
            type: 'num',
            items: [
              'Cliquez « + Nouveau ».',
              'Sélectionnez le lot concerné.',
              'Choisissez le type (propriétaire / locataire / usufruitier).',
              "Renseignez nom et téléphone de l'occupant.",
              'Pour un locataire : dates de bail, montant du loyer (optionnel).',
              'Cliquez « Créer ».',
            ],
          },
          {
            type: 'tip',
            title: 'AG et occupants',
            text: "Lors de la convocation à une AG, Imaro envoie automatiquement la convocation au copropriétaire (qui vote) et au locataire (qui peut assister). C'est conforme à la pratique recommandée par la Loi 18-00.",
          },
          {
            type: 'warn',
            title: 'Champ de communication',
            text: "Quand vous envoyez une annonce « charges du mois », elle part vers l'occupant actuel — pas vers le copropriétaire absent. Pensez à mettre à jour la fiche dès qu'un bail démarre ou se termine.",
          },
        ],
      },
      {
        title: 'Prestataires',
        intro: 'Annuaire des artisans, sociétés et fournisseurs habituels.',
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/prestataires' },
          {
            type: 'lead',
            text: 'Le prestataire est une entreprise ou un artisan qui intervient pour le compte de la copropriété : ascensoriste, société de nettoyage, plombier, électricien, peintre, jardinier, etc.',
          },
          { type: 'h2', text: 'Liste des prestataires' },
          {
            type: 'p',
            text: "La table affiche : nom (raison sociale ou nom commercial), spécialité, téléphone, email, adresse, ICE, contrats en cours, dernière facture émise. Tri par n'importe quelle colonne, recherche globale.",
          },
          { type: 'h2', text: 'Les spécialités courantes' },
          {
            type: 'list',
            items: [
              'Nettoyage des parties communes (quotidien ou hebdo).',
              'Entretien ascenseur (contrat annuel obligatoire).',
              'Plomberie et chauffage.',
              'Électricité générale.',
              'Vidéosurveillance et gardiennage.',
              'Espaces verts et jardinage.',
              'Peinture et ravalement.',
              'Désinsectisation et dératisation.',
            ],
          },
          { type: 'h2', text: 'Lier un prestataire à une dépense' },
          {
            type: 'p',
            text: "Lorsque vous saisissez une dépense (Chapitre 12) ou que l'OCR IA extrait une facture, choisissez le prestataire dans la liste déroulante. Ça vous permet ensuite de suivre les montants totaux dépensés par fournisseur.",
          },
          {
            type: 'tip',
            title: 'Comparaison prestataires',
            text: "Sur la fiche prestataire, l'onglet « Dépenses » liste toutes les factures réglées. Idéal pour comparer les prix d'un fournisseur à l'autre avant un renouvellement de contrat.",
          },
          { type: 'h2', text: 'Contrats associés' },
          {
            type: 'p',
            text: "Pour les prestataires sous contrat (ascensoriste, nettoyage), vous pouvez attacher le contrat PDF directement à la fiche. Imaro vous alerte 60 jours avant l'échéance pour préparer le renouvellement ou la mise en concurrence.",
          },
        ],
      },
      {
        title: 'Imports massifs',
        intro:
          "Le wizard d'import Excel en 4 étapes : upload, mapping, prévisualisation, exécution.",
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/imports' },
          {
            type: 'lead',
            text: 'Quand vous arrivez sur Imaro avec une copropriété existante, vous avez déjà tout dans des fichiers Excel : lots, copropriétaires, paiements, soldes, prestataires. Le module Imports vous permet de tout charger en moins de 30 minutes — au lieu de re-saisir des centaines de lignes à la main.',
          },
          { type: 'h2', text: "Les 6 types d'imports disponibles" },
          {
            type: 'table',
            headers: ['Onglet', "Quand l'utiliser"],
            widths: [30, 70],
            rows: [
              ['Lots', 'Création initiale de votre parc immobilier.'],
              ['Copropriétaires', 'Ajout en masse des propriétaires de lots.'],
              ['Soldes initiaux', "Reprise de balance au démarrage d'Imaro."],
              [
                'Paiements',
                "Historique des encaissements de l'exercice en cours.",
              ],
              ['Prestataires', 'Annuaire fournisseurs habituel.'],
              [
                "Bilan d'ouverture",
                'Reprise du bilan comptable des exercices antérieurs.',
              ],
            ],
          },
          { type: 'h2', text: 'Le wizard en 4 étapes' },
          {
            type: 'num',
            items: [
              "Upload — drag & drop d'un fichier .xlsx, .xls ou .csv. Vous pouvez aussi télécharger un modèle pré-formaté.",
              'Mapping — Imaro analyse les colonnes de votre fichier et les fait correspondre aux champs Imaro. Vous validez ou ajustez manuellement.',
              'Prévisualisation — toutes les lignes apparaissent dans un tableau avec validations en temps réel (téléphone valide ? montant cohérent ? doublon ?).',
              "Exécution — clic sur « Importer ». Une barre de progression vous montre l'avancement. Vous recevez un récapitulatif final.",
            ],
          },
          {
            type: 'tip',
            title: 'Téléchargez le modèle',
            text: 'Sur chaque onglet, le bouton « Télécharger le modèle Excel » génère un fichier vide avec les bonnes colonnes. Remplissez-le, puis ré-uploadez. Mapping automatique 100 % du temps.',
          },
          {
            type: 'warn',
            title: 'Vérifiez les erreurs',
            text: "Si une ligne contient une erreur (téléphone invalide, lot inexistant, montant négatif anormal), elle est marquée en rouge dans la prévisualisation. Corrigez le fichier source et re-uploadez plutôt que d'importer des lignes douteuses.",
          },
          { type: 'h2', text: 'Le mapping intelligent' },
          {
            type: 'p',
            text: 'Imaro détecte automatiquement les colonnes communes : « Nom », « Téléphone », « Lot », « Montant », « Date »… Si vos en-têtes diffèrent (par exemple « Tél » au lieu de « Téléphone »), un mécanisme de fuzzy-matching propose le mapping le plus probable. Vous gardez toujours la main sur le mapping final.',
          },
          {
            type: 'ok',
            title: 'Bonne pratique',
            text: 'Faites toujours un import test avec 3 lignes avant de lancer le fichier complet. Vous repérez ainsi un éventuel problème de format sans devoir corriger 500 lignes.',
          },
          { type: 'h2', text: "Reprendre un bilan d'ouverture" },
          {
            type: 'p',
            text: "L'onglet « Bilan d'ouverture » mérite une mention spéciale. Si votre copropriété existe depuis 10 ans, Imaro doit connaître la situation financière au 1er janvier de votre exercice de bascule : fonds de réserve, créances anciennes, dettes fournisseurs, trésorerie. Sans ça, vos annexes 13-1 et 13-2 ne seront pas justes.",
          },
          {
            type: 'legal',
            title: 'PCM — partie double',
            text: "Le bilan d'ouverture est saisi en partie double conformément au Plan Comptable Marocain. Imaro vérifie que Total débits = Total crédits avant validation.",
          },
        ],
      },
    ],
  },

  // ─── PART III ───────────────────────────────────────────────────────────
  {
    title: 'Partie III — Finances',
    blurb:
      'Le cœur métier du syndic : appels de fonds, paiements, dépenses, budgets, recouvrement, pointage bancaire.',
    chapters: [
      {
        title: 'Appels de fonds et paiements',
        intro:
          'Émettre les appels de fonds périodiques et encaisser les paiements des copropriétaires.',
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/paiements' },
          {
            type: 'lead',
            text: "L'appel de fonds est la facture mensuelle (ou trimestrielle) envoyée à chaque copropriétaire pour sa quote-part de charges. Le paiement est l'encaissement correspondant.",
          },
          { type: 'h2', text: 'Émettre un appel de fonds' },
          {
            type: 'num',
            items: [
              'Cliquez « + Nouvel appel de fonds ».',
              "Choisissez la résidence et l'exercice cible.",
              'Sélectionnez la période (par exemple : janvier 2026).',
              'Imaro calcule automatiquement le montant par copropriétaire à partir du budget voté et des tantièmes.',
              'Vérifiez le tableau récapitulatif.',
              'Cliquez « Émettre ». Les copropriétaires sont notifiés (WhatsApp + portail).',
            ],
          },
          {
            type: 'ai',
            title: 'Calcul automatique',
            text: 'La quote-part = (Budget annuel ÷ 12) × tantième du lot. Imaro fait le calcul. Vous validez.',
          },
          { type: 'h2', text: 'Encaisser un paiement' },
          {
            type: 'p',
            text: 'Sur le portail résident, les copropriétaires peuvent indiquer un paiement (chèque, virement, espèces) avec preuve. Vous validez ensuite côté gestionnaire.',
          },
          {
            type: 'num',
            items: [
              'Allez sur /gestionnaire/paiements.',
              'Filtrez par statut « En attente de validation ».',
              'Vérifiez la preuve de paiement.',
              'Cliquez « Valider » · le statut passe à « Payé » et le solde du copropriétaire se met à jour.',
              'Si la preuve est manquante ou incorrecte, cliquez « Rejeter » avec un motif.',
            ],
          },
          { type: 'h2', text: 'Les modes de paiement supportés' },
          {
            type: 'list',
            items: [
              'Virement bancaire — le plus traçable, à privilégier.',
              'Chèque — référence + banque + date de remise.',
              'Espèces — uniquement pour les petits montants, demande un reçu.',
              'Prélèvement automatique — si vous avez mis en place un mandat SEPA.',
              'Mobile money — wallets type Wafacash, Inwi Money.',
            ],
          },
          {
            type: 'tip',
            title: 'Quittance automatique',
            text: 'Après chaque validation de paiement, Imaro génère un PDF de quittance officielle envoyé par WhatsApp + accessible dans le portail résident.',
          },
          { type: 'h2', text: 'Suivi des appels' },
          {
            type: 'p',
            text: 'La page liste tous les appels émis avec leur statut : émis, partiellement payé, soldé, en retard. Filtres par exercice, période, résidence, statut. Export CSV pour vos rapports internes.',
          },
        ],
      },
      {
        title: 'Dépenses',
        intro:
          'Saisir toutes les sorties de la copropriété : factures fournisseurs, salaires, taxes, assurances.',
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/depenses' },
          {
            type: 'lead',
            text: "Chaque sortie d'argent de la trésorerie de la copropriété doit être enregistrée comme une dépense, avec rattachement comptable et pièce justificative.",
          },
          { type: 'h2', text: 'Saisir une dépense manuellement' },
          {
            type: 'num',
            items: [
              'Cliquez « + Nouvelle dépense ».',
              'Choisissez le prestataire (ou créez-le à la volée).',
              'Saisissez : date, libellé, montant HT, TVA, TTC.',
              'Sélectionnez la catégorie comptable (compte PCM).',
              'Renseignez le mode de paiement et la référence.',
              'Attachez le justificatif PDF ou photo.',
              'Cliquez « Enregistrer ».',
            ],
          },
          {
            type: 'ai',
            title: 'Saisie par IA — bien plus rapide',
            text: "Au lieu de tout taper, allez sur l'Assistant IA · Extraction facture. Drop la facture PDF ou photo, l'IA extrait tous les champs en 3 secondes. Vous cliquez « Créer la dépense » et le formulaire est pré-rempli. Voir Chapitre 31.",
          },
          { type: 'h2', text: 'Les catégories courantes' },
          {
            type: 'table',
            headers: ['Catégorie', 'Exemple', 'Compte PCM'],
            widths: [35, 45, 20],
            rows: [
              ['Eau et électricité', 'Facture Lydec/Redal', '6125'],
              ['Nettoyage', 'Contrat société', '6133'],
              ['Ascenseur', 'Entretien mensuel', '6134'],
              ['Sécurité', 'Gardiennage', '6135'],
              ['Espaces verts', 'Jardinage', '6136'],
              ['Travaux', 'Réparations courantes', '6131'],
              ['Honoraires', 'Avocat, expert-comptable', '6126'],
              ['Banque', 'Frais de tenue de compte', '6147'],
              ['Assurance', 'Multirisque immeuble', '6132'],
            ],
          },
          { type: 'h2', text: 'Validation et workflow' },
          {
            type: 'p',
            text: "Une dépense passe par deux statuts : « Enregistrée » puis « Payée ». Lorsqu'elle est marquée payée, elle apparaît dans le pointage bancaire pour rapprochement.",
          },
          {
            type: 'warn',
            title: 'Pièce justificative obligatoire',
            text: "Le Décret 2.23.700 impose la conservation des justificatifs pendant 10 ans. Toute dépense sans pièce attachée sera signalée par l'audit IA.",
          },
        ],
      },
      {
        title: 'Budgets',
        intro:
          'Budget annuel voté en AG et suivi prévisionnel vs réalisé en temps réel.',
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/budgets' },
          {
            type: 'lead',
            text: "Le budget est l'enveloppe prévisionnelle de dépenses pour un exercice donné. Il doit être voté en AG par les copropriétaires.",
          },
          { type: 'h2', text: 'Créer un budget' },
          {
            type: 'num',
            items: [
              'Cliquez « + Nouveau budget ».',
              "Choisissez la résidence et l'exercice cible (généralement N+1).",
              'Renseignez ligne par ligne les montants prévisionnels par catégorie.',
              'Total annuel calculé automatiquement.',
              'Cliquez « Enregistrer comme brouillon ».',
              'Après vote en AG, cliquez « Valider » pour bloquer le budget.',
            ],
          },
          {
            type: 'ai',
            title: 'Suggestion IA',
            text: "Avant l'AG, allez sur Assistant IA · Suggestions budget. L'IA analyse vos 2 derniers exercices + inflation HCP + hausses Lydec/Redal annoncées et propose ligne par ligne le budget N+1 avec justifications. Voir Chapitre 32.",
          },
          { type: 'h2', text: 'Suivi prévisionnel vs réalisé' },
          {
            type: 'p',
            text: "En cours d'exercice, la page Budgets affiche pour chaque ligne : budget voté, réalisé à date, écart en valeur, écart en pourcentage. Code couleur : vert si vous êtes sous le budget, orange si vous approchez, rouge si vous dépassez.",
          },
          {
            type: 'tip',
            title: 'Alerte dépassement',
            text: "Si une ligne dépasse 90 % de l'enveloppe à mi-exercice, Imaro vous alerte sur le dashboard. Vous avez ainsi le temps de réagir avant le dépassement effectif.",
          },
          { type: 'h2', text: 'Annexe 5 — Suivi du budget' },
          {
            type: 'p',
            text: "À la clôture d'exercice, la page Budgets génère automatiquement l'Annexe 5 du Décret 2.23.700 — tableau comparatif voté / réalisé / écart à présenter aux copropriétaires.",
          },
          {
            type: 'legal',
            title: 'Approbation des comptes',
            text: "Article 25 de la Loi 18-00 : le budget N et le réalisé N-1 doivent être présentés en AG ordinaire dans les 6 mois qui suivent la clôture d'exercice.",
          },
        ],
      },
      {
        title: 'Recouvrement et pénalités',
        intro:
          'La page critique du syndic : tous les impayés, suivi de la prescription quinquennale, configuration des pénalités, mises en demeure.',
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/recouvrement' },
          {
            type: 'lead',
            text: 'Le recouvrement représente 80 % du temps des gestionnaires et 100 % de leur stress. Imaro vous donne une vue unique sur tous les impayés et automatise les actions de relance.',
          },
          { type: 'h2', text: 'Les 4 KPIs de tête' },
          {
            type: 'table',
            headers: ['KPI', 'Description'],
            widths: [30, 70],
            rows: [
              [
                'Total impayé',
                'Montant total dû par les copropriétaires en retard.',
              ],
              ['Pénalités', 'Cumulé des pénalités appliquées sur les impayés.'],
              [
                'Lots en retard',
                'Nombre de lots avec solde négatif > 30 jours.',
              ],
              [
                'Risque prescription',
                'Lots avec créance approchant 5 ans (Loi 18-00 art. 25).',
              ],
            ],
          },
          {
            type: 'legal',
            title: 'Prescription quinquennale — Loi 18-00 art. 25',
            text: 'Les créances de la copropriété envers un copropriétaire se prescrivent par 5 ans à compter de leur exigibilité. Passé ce délai, vous ne pouvez plus les recouvrer judiciairement. Imaro vous alerte 18 mois avant la prescription.',
          },
          { type: 'h2', text: 'La table des impayés' },
          {
            type: 'p',
            text: 'Chaque ligne : copropriétaire, lot, solde dû, ancienneté de la créance, dernière action de relance, jours avant prescription, statut. Tri par défaut sur ancienneté décroissante — les plus anciennes en haut.',
          },
          { type: 'h2', text: 'Configuration des pénalités' },
          {
            type: 'p',
            text: 'Bouton « Configuration pénalités » en haut à droite. Permet de configurer :',
          },
          {
            type: 'list',
            items: [
              'Activation oui/non — par défaut désactivé.',
              'Période de grâce — nombre de jours avant déclenchement (typiquement 15 ou 30).',
              'Type — forfaitaire (200 DH par exemple), pourcentage du dû (5 %), ou journalier (10 DH/jour).',
              'Plafond optionnel — limite maximale (par exemple 1 500 DH).',
            ],
          },
          {
            type: 'warn',
            title: 'Vote AG obligatoire',
            text: "La Loi 18-00 article 25 impose que toute pénalité de retard soit votée en Assemblée Générale. Sans cette décision documentée, vous ne pouvez pas appliquer de pénalités, même configurées dans Imaro. L'audit IA vous alertera si vous appliquez sans vote AG enregistré.",
          },
          { type: 'h2', text: 'Mise en demeure' },
          {
            type: 'p',
            text: "Sur chaque ligne d'impayé, un bouton « Mise en demeure » génère un PDF officiel — avec en-tête syndic, montant dû, références juridiques (Loi 18-00 art. 25, Décret 2.23.700), délai de paiement (15 jours), et menace de procédure judiciaire. Le PDF est horodaté et signé par votre cabinet.",
          },
          {
            type: 'num',
            items: [
              'Repérez la ligne du copropriétaire en retard.',
              'Cliquez « Mise en demeure ».',
              'Vérifiez le récap.',
              'Cliquez « Générer ». Le PDF est téléchargé et envoyé par WhatsApp au copropriétaire.',
              'Statut passe à « Mise en demeure » dans le tableau.',
              "Imaro vous rappelle dans 16 jours si le paiement n'a toujours pas été reçu.",
            ],
          },
          {
            type: 'ok',
            title: 'Action efficace',
            text: 'Dans la pratique, 60-70 % des mises en demeure aboutissent à un paiement dans les 15 jours. Les 30 % restants doivent souvent passer en recouvrement judiciaire — votre prochaine étape avec votre avocat.',
          },
          { type: 'h2', text: 'Recalcul batch des pénalités' },
          {
            type: 'p',
            text: 'Bouton « Recalculer pénalités » : applique la configuration courante à tous les impayés en cours. Idéal après un vote AG ou en début de mois pour mettre à jour les montants dus.',
          },
        ],
      },
      {
        title: 'Autres recettes',
        intro:
          "Locations annexes, antennes télécom, subventions, indemnités d'assurance.",
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/autres-recettes' },
          {
            type: 'lead',
            text: "En plus des appels de fonds, une copropriété peut avoir d'autres rentrées d'argent. Les enregistrer correctement améliore votre trésorerie et réduit la charge des copropriétaires.",
          },
          { type: 'h2', text: 'Types de recettes courantes' },
          {
            type: 'list',
            items: [
              "Location d'emplacements parking à des extérieurs.",
              'Location de la salle commune pour événements.',
              'Antennes télécom (IAM, Inwi, Orange) sur le toit — bail emphytéotique annuel.',
              'Subventions publiques (rénovation énergétique, ravalement de façade).',
              "Indemnités d'assurance suite à sinistre.",
              'Intérêts sur compte de réserve placé.',
              "Vente d'actifs (cuves désaffectées, mobilier).",
            ],
          },
          { type: 'h2', text: 'Enregistrer une recette' },
          {
            type: 'num',
            items: [
              'Cliquez « + Nouvelle recette ».',
              'Choisissez la catégorie.',
              'Saisissez date, montant, payeur (entreprise ou personne).',
              'Attachez la pièce justificative (contrat, attestation).',
              'Cliquez « Enregistrer ».',
            ],
          },
          {
            type: 'tip',
            title: 'Affectation comptable',
            text: "Les autres recettes alimentent généralement le fonds de réserve. L'AG peut aussi décider de les déduire de l'appel de fonds N+1 — option configurable dans la fiche recette.",
          },
        ],
      },
      {
        title: 'Remboursements',
        intro: 'Trop-perçus et indemnités à reverser aux copropriétaires.',
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/remboursements' },
          {
            type: 'lead',
            text: "Quand un copropriétaire paie trop, vend son lot avec solde créditeur, ou bénéficie d'une indemnité, vous devez lui reverser de l'argent. Le module Remboursements pilote ce workflow.",
          },
          { type: 'h2', text: 'Workflow en 3 statuts' },
          {
            type: 'def',
            items: [
              [
                'Demandé',
                'la demande est créée (manuellement ou automatiquement suite à un trop-perçu détecté).',
              ],
              [
                'Approuvé',
                'le gestionnaire a vérifié et validé. Reste à exécuter le virement.',
              ],
              [
                'Payé',
                'le virement est parti. Le copropriétaire est notifié, une attestation PDF est générée.',
              ],
            ],
          },
          { type: 'h2', text: "Cas d'usage typiques" },
          {
            type: 'list',
            items: [
              'Vente du lot avec solde créditeur — restitution au vendeur.',
              "Trop-perçu d'appels de fonds (réajustement après clôture).",
              "Indemnité d'assurance reçue suite à dégât d'eau dans un lot.",
              'Restitution de caution travaux à un copropriétaire.',
              'Erreur de calcul corrigée a posteriori.',
            ],
          },
          {
            type: 'warn',
            title: 'Justificatif obligatoire',
            text: "Tout remboursement doit être documenté (PV d'AG, calcul de trop-perçu, attestation assurance). Sans justificatif, l'audit IA et le Conseil syndical signaleront un risque de gestion.",
          },
        ],
      },
      {
        title: 'Pointage bancaire',
        intro:
          "Le killer feature d'Imaro : rapprochement automatique du relevé bancaire avec vos paiements et dépenses.",
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/pointage' },
          {
            type: 'lead',
            text: "Le rapprochement bancaire (pointage) est l'exercice le plus chronophage du syndic. Imaro l'automatise à 80-90 % — vous validez en quelques clics ce que l'algorithme a trouvé.",
          },
          { type: 'h2', text: 'Les 10 banques marocaines supportées' },
          {
            type: 'list',
            items: [
              'Attijariwafa Bank',
              'Banque Populaire (BCP)',
              'Bank of Africa (BMCE)',
              'CIH Bank',
              'Société Générale Maroc',
              'BMCI',
              'Crédit du Maroc',
              'Crédit Agricole du Maroc',
              'CFG Bank',
              'Al Barid Bank',
            ],
          },
          {
            type: 'tip',
            title: 'Autre banque ?',
            text: 'Si votre banque ne fait pas partie de la liste, choisissez « Format générique » et adaptez le mapping des colonnes manuellement. Tout fichier .csv ou .xlsx avec date / libellé / débit / crédit fonctionne.',
          },
          { type: 'h2', text: 'Le workflow en 6 étapes' },
          {
            type: 'num',
            items: [
              'Connectez-vous à votre banque en ligne et exportez le relevé du mois en .csv ou .xlsx.',
              'Sur Imaro, sélectionnez votre banque dans le dropdown.',
              'Drag & drop le fichier dans la zone de drop.',
              'Imaro parse automatiquement et affiche les 10-100 lignes du relevé.',
              'Auto-matching : chaque ligne est rapprochée avec un paiement ou une dépense (badge vert « Auto », jaune « Suggéré », gris « Sans rapprochement »).',
              'Cliquez « Tout confirmer » pour valider en masse les auto-matches.',
            ],
          },
          { type: 'h2', text: "L'algorithme de matching" },
          {
            type: 'p',
            text: 'Pour chaque ligne du relevé, Imaro cherche dans vos paiements et dépenses la meilleure correspondance selon 3 critères pondérés :',
          },
          {
            type: 'list',
            items: [
              'Montant — exact ou tolérance de 2 % (pour les frais bancaires).',
              'Date — même jour idéalement, sinon ±7 jours, sinon ±14 jours.',
              'Nom détecté dans le libellé — fuzzy match sur le nom du copropriétaire ou du prestataire.',
            ],
          },
          {
            type: 'p',
            text: 'Score global ≥ 80 % · badge vert « Auto ». Score 40-80 % · badge jaune « Suggéré » (à valider à la main). Score < 40 % · badge gris « Sans rapprochement ».',
          },
          { type: 'h2', text: 'Le dataset démo' },
          {
            type: 'p',
            text: "Pas envie d'attendre un vrai relevé ? Cliquez « Démo » pour charger un dataset Attijariwafa fictif de 10 lignes. Idéal pour découvrir l'outil sans risque.",
          },
          {
            type: 'ok',
            title: 'Gain de temps',
            text: 'Sur 100 lignes de relevé bancaire, Imaro auto-match en moyenne 70-85 %. Vous traitez les 15-30 % restants en 5 minutes. Au total : 10 minutes au lieu de 2 heures.',
          },
        ],
      },
    ],
  },

  // ─── PART IV ────────────────────────────────────────────────────────────
  {
    title: 'Partie IV — Conformité et comptabilité',
    blurb:
      "Toutes les obligations légales du Décret 2.23.700 et de la Loi 18-00. Calendrier conformité, 12 annexes, journal d'audit, comptabilité partie double, clôture.",
    chapters: [
      {
        title: 'Calendrier de conformité',
        intro:
          'Le cycle annuel des obligations du syndic, suivi automatiquement.',
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/conformite' },
          {
            type: 'lead',
            text: "Le Décret 2.23.700 impose au syndic une série de tâches à accomplir dans l'année. Imaro les liste, les date, et vous prévient avant chaque échéance.",
          },
          { type: 'h2', text: 'Les 4 phases du cycle annuel' },
          {
            type: 'table',
            headers: ['Phase', 'Période', 'Action principale'],
            widths: [30, 30, 40],
            rows: [
              [
                'Opérations mensuelles',
                "Toute l'année",
                'Appels, paiements, dépenses, pointage',
              ],
              ['Clôture comptable', 'Janvier — Mars', 'Arrêté des comptes N-1'],
              ['AG annuelle', 'Avril — Juin', 'Présentation et vote'],
              [
                'Archivage',
                'Juin — Juillet',
                'Verrouillage exercice + génération annexes',
              ],
            ],
          },
          { type: 'h2', text: 'La page Calendrier' },
          {
            type: 'p',
            text: 'En haut, indication du régime fiscal détecté (simplifié ≤ 200K MAD ou normal). En dessous, la liste de toutes les tâches obligatoires avec :',
          },
          {
            type: 'list',
            items: [
              "Titre de la tâche (ex : « Émettre l'appel de fonds de mars »).",
              'Date limite réglementaire.',
              'Statut : à faire / en cours / terminée / en retard.',
              'Référence légale précise (article, décret).',
              'Bouton « Marquer comme fait » ou « Sauter » avec justification.',
            ],
          },
          { type: 'h2', text: 'Détection automatique du régime' },
          {
            type: 'p',
            text: 'Si vos appels annuels cumulés franchissent 200 000 MAD, Imaro bascule automatiquement votre copropriété en régime normal. Cela ajoute les annexes 3 et 4 (bilan complet et compte de résultat complet) aux obligations.',
          },
          {
            type: 'tip',
            title: 'Anticipation',
            text: "Le calendrier vous alerte 30 jours avant chaque échéance. Combinez avec l'audit IA mensuel pour ne rien rater.",
          },
        ],
      },
      {
        title: 'Les 12 annexes comptables',
        intro:
          'Tous les états réglementaires du Décret 2.23.700, générables en PDF signés en un clic.',
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/annexes' },
          {
            type: 'lead',
            text: "Le Décret 2.23.700 du 24 mai 2023 définit 12 annexes comptables obligatoires. Imaro les génère automatiquement à partir de vos données — vous n'avez plus jamais à recréer ces tableaux manuellement.",
          },
          { type: 'h2', text: 'Annexes obligatoires en régime simplifié' },
          {
            type: 'table',
            headers: ['#', 'Nom', 'Contenu'],
            widths: [10, 30, 60],
            rows: [
              [
                '10',
                'État des contributions',
                'Tableau par copropriétaire : appelé / payé / solde',
              ],
              [
                '13-1',
                'Situation financière',
                'Bilan simplifié : réserve, créances, dettes, trésorerie',
              ],
              [
                '13-2',
                'Compte de gestion + budget',
                'P&L sur 4 colonnes : N+1, N, N-1, approuvé',
              ],
            ],
          },
          { type: 'h2', text: 'Annexes complémentaires' },
          {
            type: 'table',
            headers: ['#', 'Nom'],
            widths: [10, 90],
            rows: [
              ['3', 'Bilan complet (Plan Comptable Marocain)'],
              ['4', 'Compte de résultat complet'],
              ['5', 'Suivi du budget prévisionnel'],
              ['6', 'Travaux non courants (votés en AG hors budget courant)'],
              ['7', 'Mouvements de trésorerie'],
              ['8', 'Suivi des emprunts collectifs'],
              ['9', 'Suivi des équipements (immobilisations)'],
              ['11', 'Bilan simplifié'],
              ['12', 'Compte de résultat simplifié'],
            ],
          },
          {
            type: 'legal',
            title: 'Régime normal',
            text: "Au-delà de 200 000 MAD/an d'appels, les annexes 3 et 4 deviennent obligatoires en plus des 10, 13-1, 13-2. Imaro vous alerte automatiquement quand vous franchissez ce seuil.",
          },
          { type: 'h2', text: 'Générer une annexe' },
          {
            type: 'num',
            items: [
              "Sur /gestionnaire/annexes, sélectionnez la résidence et l'exercice.",
              "Repérez la ligne de l'annexe souhaitée.",
              'Cliquez « PDF » à droite. Le téléchargement démarre.',
              "Le PDF s'ouvre dans votre navigateur ou téléchargement.",
            ],
          },
          { type: 'h2', text: "Anatomie d'un PDF d'annexe" },
          {
            type: 'list',
            items: [
              'Bande orange fine en haut — signature Imaro.',
              "En-tête navy avec dégradé + logo Imaro inversé + titre de l'annexe.",
              'Badge vert « DOCUMENT OFFICIEL » avec checkmark.',
              'Code document unique (ex : IMA-ATLA-2026-A10-A3F2).',
              'Tableau de données proprement formaté.',
              'Bloc signatures (président, syndic, conseil) en bas.',
              "QR code scannable · vérification d'authenticité.",
              'Footer avec référence au Décret 2.23.700.',
            ],
          },
          {
            type: 'ok',
            title: 'Authenticité prouvée',
            text: "Le QR code lie le PDF à un hash SHA-256 stocké sur imaro.ma. Si quelqu'un modifie le PDF, le hash ne correspond plus · la vérification échoue. Sécurité anti-fraude pour les copropriétaires.",
          },
          { type: 'h2', text: 'Génération en masse' },
          {
            type: 'p',
            text: 'Pour préparer une AG, vous voudrez sans doute toutes les annexes en une fois. Cliquez « Tout générer » en haut — Imaro produit un .zip contenant les 12 PDFs en quelques secondes.',
          },
        ],
      },
      {
        title: "Journal d'audit",
        intro:
          'Toutes les actions sur la plateforme tracées, filtrables, exportables.',
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/audit' },
          {
            type: 'lead',
            text: "Le journal d'audit est la mémoire d'Imaro. Chaque création, modification, suppression, connexion est enregistrée avec utilisateur, date, IP, et données modifiées.",
          },
          {
            type: 'legal',
            title: 'Rétention 7 ans',
            text: "Le Décret 2.23.700 article 12 impose une rétention minimale de 7 ans pour les journaux d'opérations comptables. Imaro respecte cette obligation de façon automatique.",
          },
          { type: 'h2', text: "Catégories d'événements" },
          {
            type: 'list',
            items: [
              'Authentification — connexions, déconnexions, échecs OTP.',
              'CRUD copropriétaires / lots / résidences.',
              'CRUD paiements / dépenses / appels de fonds.',
              'Configuration pénalités, paramètres tenant.',
              'Génération de PDFs (annexes, mises en demeure, quittances).',
              'Modifications de budgets.',
              "Clôtures d'exercices.",
              'Imports massifs.',
            ],
          },
          { type: 'h2', text: 'Filtres et recherche' },
          {
            type: 'p',
            text: 'La page propose 4 filtres combinables : catégorie, sévérité (info / warning / critical), utilisateur, période. Plus une recherche texte libre dans les libellés.',
          },
          { type: 'h2', text: 'Exports' },
          {
            type: 'p',
            text: "Bouton « Exporter » en haut à droite — choisissez CSV (pour Excel) ou JSON (pour archivage légal). L'export reprend tous les filtres actifs.",
          },
          {
            type: 'tip',
            title: 'Audit annuel',
            text: "Exportez le journal complet à chaque clôture d'exercice et archivez-le hors d'Imaro (Dropbox, Google Drive). Ça vous protège en cas de contrôle ou de litige.",
          },
        ],
      },
      {
        title: 'Comptabilité partie double',
        intro:
          'Comptabilité complète aux normes du Plan Comptable Marocain (CGNC).',
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/comptabilite' },
          {
            type: 'lead',
            text: "La comptabilité d'Imaro respecte la partie double — chaque opération crédite un compte et débite un autre. Le Plan Comptable Marocain (CGNC) est intégré nativement.",
          },
          { type: 'h2', text: 'Les 6 onglets de la page' },
          {
            type: 'table',
            headers: ['Onglet', 'Contenu'],
            widths: [30, 70],
            rows: [
              [
                'Tableau de bord',
                'KPIs financiers : produits, charges, résultat, trésorerie.',
              ],
              ['Journal comptable', 'Écritures en partie double, par date.'],
              ['Grand-Livre', 'Détail des mouvements par compte.'],
              ['Dépenses', 'Création + import IA factures (cf. Chapitre 12).'],
              ['Rapports financiers', 'PDFs métier + cross-link Annexes.'],
              ['Clôture', "Wizard 4 étapes pour clôturer l'exercice."],
            ],
          },
          { type: 'h2', text: 'Les classes du Plan Comptable Marocain' },
          {
            type: 'table',
            headers: ['Classe', 'Type', 'Exemples'],
            widths: [12, 30, 58],
            rows: [
              [
                '1',
                'Comptes de financement permanent',
                'Fonds de réserve, emprunts',
              ],
              ['2', "Comptes d'actif immobilisé", 'Équipements, ascenseur'],
              ['3', "Comptes d'actif circulant", 'Créances copropriétaires'],
              ['4', 'Comptes de passif circulant', 'Dettes fournisseurs'],
              ['5', 'Comptes de trésorerie', 'Banque, caisse'],
              ['6', 'Comptes de charges', 'Eau, électricité, nettoyage'],
              ['7', 'Comptes de produits', 'Appels de fonds, autres recettes'],
            ],
          },
          { type: 'h2', text: 'Le Grand-Livre' },
          {
            type: 'p',
            text: 'Vue détaillée compte par compte. Sélectionnez un compte (ex : 6125 — Eau et électricité) et vous voyez tous les mouvements : date, libellé, débit, crédit, solde cumulé. Exportable en PDF ou CSV.',
          },
          { type: 'h2', text: 'La Balance' },
          {
            type: 'p',
            text: 'Onglet Tableau de bord · bouton « Balance ». État synthétique de tous les comptes avec total débit, total crédit, solde. Doit toujours être équilibrée (total débits = total crédits).',
          },
          {
            type: 'warn',
            title: 'Déséquilibre',
            text: "Si la balance est déséquilibrée, c'est qu'une écriture est incomplète. Imaro bloque la clôture d'exercice tant que la balance n'est pas équilibrée.",
          },
        ],
      },
      {
        title: "Clôture d'exercice",
        intro:
          'Le wizard en 4 étapes pour clôturer définitivement un exercice.',
        blocks: [
          {
            type: 'p',
            text: 'URL : /gestionnaire/comptabilite · onglet Clôture',
          },
          {
            type: 'lead',
            text: "La clôture verrouille définitivement un exercice. Plus aucune écriture ne peut être ajoutée ou modifiée. C'est la dernière étape avant l'archivage.",
          },
          { type: 'h2', text: 'Les 4 étapes' },
          {
            type: 'num',
            items: [
              "Aperçu — Imaro affiche le résultat de l'exercice (excédent ou déficit) et un récapitulatif des points de vigilance.",
              "Affectation du résultat — vous décidez de l'affectation : report à nouveau, fonds de réserve, distribution.",
              'Verrouillage — confirmation finale. Tous les comptes sont gelés.',
              'Terminé — récapitulatif, génération automatique des annexes finales, archivage du journal.',
            ],
          },
          {
            type: 'warn',
            title: 'Action irréversible',
            text: "Une fois l'étape 3 validée, vous ne pouvez plus revenir en arrière. Vérifiez deux fois avant de cliquer.",
          },
          { type: 'h2', text: 'Pré-requis avant clôture' },
          {
            type: 'check',
            items: [
              "Tous les paiements de l'exercice sont validés.",
              'Toutes les dépenses sont saisies et payées.',
              'Le pointage bancaire est à jour (tous les mois pointés).',
              "L'audit IA a été lancé et les findings critiques sont traités.",
              'La balance est équilibrée.',
              'Les annexes 10, 13-1, 13-2 sont générées.',
              "L'AG annuelle a voté l'approbation des comptes.",
            ],
          },
          {
            type: 'tip',
            title: 'Affectation classique',
            text: "En l'absence de décision spécifique en AG, l'excédent est généralement affecté en report à nouveau (compte 110). Il sera utilisé pour réduire l'appel de fonds de l'exercice suivant.",
          },
        ],
      },
    ],
  },

  // ─── PART V ─────────────────────────────────────────────────────────────
  {
    title: 'Partie V — Patrimoine et opérations',
    blurb:
      'Le suivi du patrimoine de la copropriété (équipements, emprunts, travaux exceptionnels) et les opérations transverses (AG, documents, annonces, tickets).',
    chapters: [
      {
        title: 'Équipements',
        intro:
          'Registre des immobilisations de la copropriété avec amortissements.',
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/equipements' },
          {
            type: 'lead',
            text: "Un équipement est un bien matériel durable appartenant à la copropriété (ascenseur, chaudière, caméra, portail motorisé). Le suivi est obligatoire pour générer l'Annexe 9 du Décret 2.23.700.",
          },
          { type: 'h2', text: 'Les 9 catégories' },
          {
            type: 'list',
            items: [
              'Ascenseur',
              'Chauffage / Climatisation',
              'Sécurité (alarme, badges, portails)',
              'Vidéosurveillance',
              'Plomberie collective',
              'Électricité parties communes',
              "Espaces verts (système d'arrosage automatique)",
              'Hygiène (vide-ordures, bacs)',
              'Autres équipements techniques',
            ],
          },
          { type: 'h2', text: "Champs d'un équipement" },
          {
            type: 'table',
            headers: ['Champ', 'Description'],
            widths: [35, 65],
            rows: [
              ['Nom', 'Libellé du bien (ex : « Ascenseur OTIS bât. A »).'],
              ['Catégorie', 'Une des 9 ci-dessus.'],
              [
                "Date d'acquisition",
                "Date d'installation ou de mise en service.",
              ],
              ["Valeur d'acquisition", "Coût HT à l'origine."],
              ["Durée d'amortissement", 'En années (typiquement 10 à 20 ans).'],
              ['Valeur nette', 'Calculée automatiquement (linéaire).'],
              ['Statut', 'Actif / hors service.'],
              ['Prestataire de maintenance', 'Lien vers la fiche prestataire.'],
            ],
          },
          { type: 'h2', text: 'Annexe 9' },
          {
            type: 'p',
            text: "En fin d'exercice, la liste des équipements alimente automatiquement l'Annexe 9 « Suivi des équipements » du Décret 2.23.700. Tableau avec valeur d'origine, amortissement cumulé, valeur nette, et statut.",
          },
          {
            type: 'tip',
            title: 'Provisions pour gros entretien',
            text: "Pour les équipements lourds (ascenseur, chauffage central), pensez à constituer une provision annuelle dans le fonds de réserve. Imaro vous alerte 6 mois avant la fin de vie théorique d'un équipement.",
          },
        ],
      },
      {
        title: 'Emprunts',
        intro: 'Suivi des emprunts collectifs souscrits par la copropriété.',
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/emprunts' },
          {
            type: 'lead',
            text: "Une copropriété peut emprunter collectivement pour financer de gros travaux : ravalement, remplacement de chaudière, mise aux normes. L'emprunt est voté en AG à la majorité qualifiée et signé par le syndic.",
          },
          { type: 'h2', text: "Champs d'un emprunt" },
          {
            type: 'table',
            headers: ['Champ', 'Description'],
            widths: [35, 65],
            rows: [
              ['Organisme prêteur', 'Banque ou organisme public (CIH, BMCE…).'],
              ['Date de souscription', 'Date du déblocage des fonds.'],
              ['Montant emprunté', 'Capital initial.'],
              ['Taux', 'Taux nominal annuel.'],
              ['Durée', 'En mois.'],
              ['Mensualité', 'Calculée automatiquement.'],
              ['Payé cumulé', 'Total des mensualités versées.'],
              ['Reste dû', 'Capital restant à rembourser.'],
              ['Statut', 'Actif / remboursé / en défaut.'],
            ],
          },
          { type: 'h2', text: 'Annexe 8' },
          {
            type: 'p',
            text: "L'Annexe 8 « Suivi des emprunts » est générée automatiquement et présentée en AG.",
          },
          {
            type: 'warn',
            title: 'Défaut de paiement',
            text: "Si une mensualité n'a pas pu être prélevée (trésorerie insuffisante), le statut passe à « En défaut ». Imaro vous alerte et vous suggère un appel de fonds exceptionnel.",
          },
        ],
      },
      {
        title: 'Travaux exceptionnels',
        intro: 'Travaux votés en AG hors du budget courant.',
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/travaux-exceptionnels' },
          {
            type: 'lead',
            text: "Les travaux exceptionnels sont des opérations ponctuelles qui ne rentrent pas dans le budget récurrent : ravalement, réfection toiture, remplacement ascenseur. Ils font l'objet d'un appel de fonds dédié.",
          },
          { type: 'h2', text: 'Champs et statuts' },
          {
            type: 'table',
            headers: ['Champ', 'Description'],
            widths: [35, 65],
            rows: [
              [
                'Libellé',
                'Description courte (ex : « Ravalement façade Sud »).',
              ],
              ['Date vote AG', "Date de l'assemblée qui a voté les travaux."],
              ['Prestataire', 'Entreprise retenue.'],
              ['Montant voté', "Enveloppe approuvée par l'AG."],
              ['Montant engagé', 'Total des bons de commande émis.'],
              ['Montant réglé', 'Factures déjà payées.'],
              ['Reste à régler', 'Solde engagé - réglé.'],
              ['Statut', 'Voté / En cours / Terminé / Annulé.'],
            ],
          },
          { type: 'h2', text: 'Annexe 6' },
          {
            type: 'p',
            text: "La liste des travaux exceptionnels alimente automatiquement l'Annexe 6 du Décret 2.23.700, présentée en AG annuelle.",
          },
          {
            type: 'ok',
            title: 'Bonne pratique',
            text: 'Demandez 3 devis avant chaque travaux exceptionnel. Attachez-les à la fiche dans Imaro. Vous prouvez ainsi votre rigueur en cas de contestation.',
          },
        ],
      },
      {
        title: 'Assemblées générales',
        intro: 'Convocations, ordres du jour, votes, PV.',
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/assemblees' },
          {
            type: 'lead',
            text: "L'Assemblée Générale est le moment où les copropriétaires décident collectivement. Imaro pilote toute la séquence : convocation, vote, PV, archivage.",
          },
          { type: 'h2', text: "Types d'AG" },
          {
            type: 'def',
            items: [
              [
                'AG ordinaire',
                "annuelle, dans les 6 mois de la clôture d'exercice. Approuve les comptes et le budget.",
              ],
              [
                'AG extraordinaire',
                'pour décisions importantes hors cycle : travaux exceptionnels, changement de syndic, vote pénalités.',
              ],
            ],
          },
          { type: 'h2', text: 'Préparer une AG' },
          {
            type: 'num',
            items: [
              'Cliquez « + Nouvelle AG ».',
              'Choisissez date, heure, lieu (ou visioconférence).',
              "Composez l'ordre du jour (résolutions à voter).",
              'Joignez les documents (budget, comptes, devis travaux).',
              'Cliquez « Envoyer les convocations ». WhatsApp + portail + email simultanés.',
            ],
          },
          {
            type: 'legal',
            title: 'Délai de convocation',
            text: "La Loi 18-00 article 12 impose un délai minimum de 15 jours entre la convocation et la tenue de l'AG. Imaro bloque la convocation si la date d'AG est trop proche.",
          },
          { type: 'h2', text: 'Le jour J' },
          {
            type: 'p',
            text: "Sur Imaro, vous pouvez tenir l'AG en mode présentiel ou hybride. Liste de présence, votes résolution par résolution, calcul automatique des majorités (simple, qualifiée, unanimité).",
          },
          { type: 'h2', text: 'Le PV (Procès-Verbal)' },
          {
            type: 'p',
            text: "À la fin de l'AG, Imaro génère automatiquement un PV PDF avec : liste présents, votes résolution par résolution, résultats, signatures. Vous l'éditez si besoin, puis le distribuez aux copropriétaires.",
          },
        ],
      },
      {
        title: 'Documents et annonces',
        intro:
          'Centraliser tous les documents de la copropriété et communiquer avec les résidents.',
        blocks: [
          {
            type: 'p',
            text: 'URLs : /gestionnaire/documents · /gestionnaire/annonces',
          },
          { type: 'h2', text: 'La GED — Gestion Électronique de Documents' },
          {
            type: 'p',
            text: "Tous les documents de la copropriété centralisés : règlement de copropriété, plans, PV d'AG, contrats, devis, factures, attestations. Classement par catégorie et par exercice.",
          },
          {
            type: 'list',
            items: [
              'Drag & drop pour uploader un PDF ou une image.',
              'Recherche texte intégrale (OCR sur PDFs scannés).',
              'Permissions : visible par tous / Conseil uniquement / Syndic uniquement.',
              "Versionning : versions successives d'un même document.",
              'Stockage chiffré.',
            ],
          },
          { type: 'h2', text: 'Annonces' },
          {
            type: 'p',
            text: "Publication d'une information à tous les copropriétaires : coupure d'eau, fête de fin d'année, travaux à venir. Diffusion simultanée sur le portail résident + WhatsApp + email.",
          },
          {
            type: 'tip',
            title: "Modèles d'annonces",
            text: "Imaro propose 10 modèles prêts à l'emploi (coupure, AG, sinistre, recouvrement…). Choisissez, personnalisez, envoyez.",
          },
        ],
      },
      {
        title: 'Tickets et réclamations',
        intro: 'Le helpdesk pour traiter les demandes des copropriétaires.',
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/tickets' },
          {
            type: 'lead',
            text: 'Un copropriétaire signale une fuite, demande un duplicata de quittance, propose des travaux. Tous ces échanges sont gérés comme des tickets — chacun avec un statut et un historique.',
          },
          { type: 'h2', text: "Cycle de vie d'un ticket" },
          {
            type: 'def',
            items: [
              ['Ouvert', 'tout juste créé, en attente de traitement.'],
              ['En cours', 'pris en charge par un gestionnaire.'],
              [
                'En attente client',
                'on a posé une question, on attend la réponse.',
              ],
              ['Résolu', 'la demande a été traitée.'],
              ['Fermé', 'le copropriétaire a confirmé.'],
            ],
          },
          { type: 'h2', text: 'Catégories' },
          {
            type: 'list',
            items: [
              'Technique — panne ascenseur, fuite, problème électrique.',
              'Financier — demande de quittance, échéancier de paiement.',
              'Voisinage — nuisance sonore, fumée.',
              "Suggestion — proposition d'amélioration.",
              'Autre.',
            ],
          },
          { type: 'h2', text: 'SLA et priorisation' },
          {
            type: 'p',
            text: 'Chaque ticket a une priorité (haute, moyenne, basse) et un SLA de réponse. Les tickets en retard apparaissent sur le dashboard en tickets urgents.',
          },
        ],
      },
    ],
  },

  // ─── PART VI ────────────────────────────────────────────────────────────
  {
    title: 'Partie VI — Intelligence artificielle',
    blurb:
      "Les 3 assistants IA d'Imaro — audit conformité, OCR factures, suggestions budget. Ce qu'ils font, comment les utiliser, et leurs limites.",
    chapters: [
      {
        title: "Assistant IA — vue d'ensemble",
        intro:
          'Imaro intègre 3 outils IA qui font gagner des heures par mois aux gestionnaires.',
        blocks: [
          { type: 'p', text: 'URL : /gestionnaire/ia' },
          {
            type: 'lead',
            text: "L'Assistant IA est notre moat différenciateur. Il vous aide à auditer votre conformité, à saisir vos factures, et à préparer votre budget — toutes des tâches chronophages habituellement.",
          },
          { type: 'h2', text: 'Les 3 outils' },
          {
            type: 'table',
            headers: ['Outil', "Ce qu'il fait", 'Gain de temps'],
            widths: [35, 45, 20],
            rows: [
              [
                'Audit conformité',
                'Vérifie 30+ points légaux et opérationnels',
                '2 h · 30 s',
              ],
              [
                'OCR Factures',
                "Extrait toutes les données d'une facture PDF/photo",
                '5 min · 3 s',
              ],
              [
                'Suggestions budget',
                'Propose ligne par ligne le budget N+1',
                '1 j · 2 min',
              ],
            ],
          },
          { type: 'h2', text: 'Privacy et confidentialité' },
          {
            type: 'ai',
            title: 'Vos données restent privées',
            text: 'Imaro utilise Claude (Anthropic). Vos données sont traitées sur la requête mais ne sont jamais stockées par Anthropic ni utilisées pour entraîner des modèles. Aucune autre copropriété ne peut voir vos données.',
          },
          {
            type: 'warn',
            title: "L'IA n'est pas infaillible",
            text: "Les suggestions de l'IA sont des aides à la décision — pas des décisions. Vous gardez la main sur tout ce qui est généré. Sur des cas critiques (audit légal, signature documents), vérifiez toujours.",
          },
        ],
      },
      {
        title: 'Audit conformité IA',
        intro: "L'auditeur conformité qui vérifie 30+ points en 30 secondes.",
        blocks: [
          {
            type: 'lead',
            text: "L'audit IA passe en revue votre copropriété sous l'angle de la conformité légale et opérationnelle. Il produit un score, des findings classés par sévérité, et des recommandations concrètes.",
          },
          { type: 'h2', text: 'Lancer un audit' },
          {
            type: 'num',
            items: [
              'Allez sur /gestionnaire/ia.',
              'Cliquez sur la carte « Audit conformité ».',
              'Choisissez la résidence cible (ou « Toutes »).',
              "Cliquez « Lancer l'audit IA ».",
              "Attendez ~30 secondes. Le rapport s'affiche.",
            ],
          },
          { type: 'h2', text: 'Le score 0-100' },
          {
            type: 'p',
            text: 'Score global affiché dans un grand anneau circulaire :',
          },
          {
            type: 'def',
            items: [
              ['90-100', 'Excellent — conformité exemplaire.'],
              ['75-89', "Good — quelques points d'amélioration."],
              ['50-74', 'Warning — risques à traiter sous 30 jours.'],
              ['0-49', 'Critical — risques majeurs, action urgente.'],
            ],
          },
          { type: 'h2', text: 'Les findings par sévérité' },
          {
            type: 'p',
            text: "Pour chaque problème détecté, l'IA livre une carte avec :",
          },
          {
            type: 'list',
            items: [
              'Description du problème.',
              'Sévérité (critique, élevé, modéré, faible, info).',
              "Recommandation actionable (ex : « Génér l'annexe 13-1 avant le 30 mars »).",
              'Référence légale précise (article, décret).',
              'Impact estimé (financier, juridique, réputationnel).',
            ],
          },
          { type: 'h2', text: 'Exemples de findings typiques' },
          {
            type: 'list',
            items: [
              'Créances proches de prescription quinquennale (>4 ans 6 mois).',
              'Pénalités configurées sans vote AG documenté.',
              'Annexes obligatoires non générées avant échéance AG.',
              'Écarts budgétaires significatifs (>20 %) sans justification.',
              "Pointage bancaire en retard de plus d'un mois.",
              'Documents légaux manquants (règlement copropriété, contrat ascenseur).',
              'Absence de provision pour gros entretien.',
              'Copropriétaires sans téléphone (impossible de leur envoyer une convocation).',
            ],
          },
          { type: 'h2', text: 'Points forts détectés' },
          {
            type: 'p',
            text: "L'audit ne fait pas que pointer les problèmes — il mentionne aussi vos forces : pointage à jour, pénalités correctement votées, AG annuelle dans les temps, fonds de réserve suffisant.",
          },
          {
            type: 'ok',
            title: 'Fréquence recommandée',
            text: "Lancez l'audit une fois par mois en début de mois. Avant chaque AG, lancez-le 30 jours avant pour avoir le temps de corriger les findings critiques.",
          },
        ],
      },
      {
        title: 'Extraction OCR de factures',
        intro:
          "L'IA lit votre facture (PDF ou photo) et pré-remplit le formulaire de dépense.",
        blocks: [
          {
            type: 'lead',
            text: "L'OCR (Optical Character Recognition) couplé à un modèle IA est le moyen le plus rapide de saisir une dépense. Au lieu de retaper toutes les données, vous dropez la facture et l'IA fait le reste.",
          },
          { type: 'h2', text: 'Le workflow' },
          {
            type: 'num',
            items: [
              'Allez sur /gestionnaire/ia · onglet Extraction facture.',
              'Drag & drop le PDF ou la photo de la facture.',
              'Attendez 3-5 secondes.',
              'Vérifiez les champs extraits dans le formulaire pré-rempli.',
              "Cliquez « Créer la dépense ». C'est fait.",
            ],
          },
          { type: 'h2', text: 'Données extraites' },
          {
            type: 'table',
            headers: ['Champ', 'Détection IA'],
            widths: [35, 65],
            rows: [
              [
                'Fournisseur',
                "Nom de l'entreprise (et création auto de prestataire si nouveau)",
              ],
              ['ICE', 'Numéro ICE marocain à 15 chiffres'],
              ['Date', 'Format date français reconnu'],
              ['N° facture', 'Référence unique fournisseur'],
              ['HT', 'Montant hors taxes'],
              ['TVA', 'Montant et taux'],
              ['TTC', 'Montant total'],
              ['Description', 'Libellé court résumé'],
              ['Lignes détaillées', 'Postes individuels si présents'],
              ['Catégorie suggérée', 'Mappée sur compte PCM'],
              ['Score de confiance', "0-100% — fiabilité de l'extraction"],
            ],
          },
          {
            type: 'tip',
            title: 'Qualité de la photo',
            text: "Pour une photo de facture, assurez-vous : éclairage uniforme, pas de flou, facture entièrement cadrée. Un PDF natif (non scanné) donne toujours de meilleurs résultats qu'une photo.",
          },
          {
            type: 'ai',
            title: 'Catégorisation intelligente',
            text: "L'IA reconnaît automatiquement le type de facture (eau, électricité, nettoyage, ascenseur…) et propose le compte PCM correspondant. Vous gardez bien sûr le contrôle final.",
          },
        ],
      },
      {
        title: 'Suggestions de budget',
        intro:
          "L'IA prépare votre budget N+1 en analysant vos 2 derniers exercices + inflation + hausses tarifs.",
        blocks: [
          {
            type: 'lead',
            text: "Préparer le budget annuel est une corvée. L'IA analyse vos données historiques + le contexte économique marocain et propose ligne par ligne ce que devrait être votre budget N+1.",
          },
          { type: 'h2', text: 'Sources analysées' },
          {
            type: 'list',
            items: [
              'Vos dépenses réalisées sur les 2 derniers exercices.',
              'Variations annuelles par poste (en hausse ou en baisse).',
              'Inflation publiée par le HCP (Haut Commissariat au Plan).',
              'Hausses tarifaires annoncées par Lydec, Redal, Amendis, RADEEM.',
              "Contrats en cours (ascenseur, nettoyage) avec leurs clauses d'indexation.",
              "Travaux exceptionnels prévus dans l'exercice cible.",
            ],
          },
          { type: 'h2', text: 'Le rapport généré' },
          {
            type: 'p',
            text: 'Pour chaque ligne de budget :',
          },
          {
            type: 'table',
            headers: ['Colonne', 'Contenu'],
            widths: [30, 70],
            rows: [
              ['Poste', 'Catégorie comptable (eau, électricité, nettoyage…)'],
              [
                'Réalisé N-1',
                "Montant réellement dépensé l'exercice précédent",
              ],
              ['Suggestion N+1', "Montant proposé par l'IA"],
              ['Variation', 'Écart en valeur et en %'],
              [
                'Justification',
                "Phrase courte expliquant le pourquoi (ex : « Hausse tarif Lydec attendue 4 % + contrat reconduit à l'identique »)",
              ],
              [
                'Confiance',
                "high / medium / low — niveau de certitude de l'IA",
              ],
            ],
          },
          { type: 'h2', text: 'Hypothèses globales' },
          {
            type: 'p',
            text: "En bas du rapport, l'IA récapitule les hypothèses macro retenues : inflation HCP, taux directeur BAM, prévision démographique, météo prévisible. Vous savez sur quoi elle s'est basée.",
          },
          { type: 'h2', text: 'Importer dans le module Budgets' },
          {
            type: 'p',
            text: 'Bouton « Importer dans Budgets » en bas du rapport. Le brouillon de budget N+1 est créé automatiquement avec toutes les lignes pré-remplies. Vous éditez les lignes que vous voulez ajuster, puis présentez le tout en AG.',
          },
          {
            type: 'ok',
            title: 'Préparation AG',
            text: "Lancez la suggestion IA 2 mois avant l'AG. Cela vous laisse le temps d'affiner, de discuter avec le Conseil syndical, et d'éviter les surprises le jour J.",
          },
        ],
      },
    ],
  },

  // ─── PART VII ───────────────────────────────────────────────────────────
  {
    title: 'Partie VII — Portail résident',
    blurb:
      'Comprendre ce que vos copropriétaires voient — pour mieux les accompagner.',
    chapters: [
      {
        title: 'Portail copropriétaire — vue gestionnaire',
        intro:
          'Le portail mobile-first dédié aux résidents — fonctionnalités, design, support.',
        blocks: [
          { type: 'p', text: 'URL résident : app.imaro.ma/portail' },
          {
            type: 'lead',
            text: 'Chaque copropriétaire a accès à son propre portail Imaro — pensé mobile (375 px, 16 px minimum, touch target 48 px), accessible 24/7. Il y consulte son solde, ses appels, signale ses réclamations.',
          },
          { type: 'h2', text: 'Connexion résident' },
          {
            type: 'p',
            text: "Même mécanisme que le gestionnaire — OTP WhatsApp. Le résident reçoit son lien d'invitation depuis votre fiche copropriétaire (chapitre 7).",
          },
          { type: 'h2', text: 'Les 4 onglets du portail' },
          {
            type: 'table',
            headers: ['Onglet', 'Contenu'],
            widths: [25, 75],
            rows: [
              [
                'Accueil',
                'KPI solde, prochain appel, dernières annonces, actualités résidence.',
              ],
              [
                'Finances',
                'Historique appels et paiements, télécharger quittances, signaler un paiement.',
              ],
              ['Réclamations', 'Créer un ticket, suivre les tickets en cours.'],
              ['Profil', 'Coordonnées, langue, déconnexion.'],
            ],
          },
          { type: 'h2', text: 'Signaler un paiement' },
          {
            type: 'p',
            text: "Sur l'onglet Finances, le résident peut indiquer qu'il a payé un appel (virement, chèque, espèces) en uploadant une preuve. Vous validez ensuite côté gestionnaire (Chapitre 11).",
          },
          { type: 'h2', text: 'Notifications' },
          {
            type: 'p',
            text: 'Chaque action côté gestionnaire (nouvel appel, validation paiement, nouvelle annonce, convocation AG) déclenche une notification WhatsApp au résident. Push web disponible aussi pour les usagers du portail au navigateur.',
          },
          {
            type: 'tip',
            title: 'Support résident',
            text: "Si un résident a un problème de connexion, vous pouvez révoquer puis re-générer son lien d'invitation depuis sa fiche copropriétaire. En 30 secondes il a un nouvel accès.",
          },
        ],
      },
    ],
  },

  // ─── PART VIII ──────────────────────────────────────────────────────────
  {
    title: 'Partie VIII — Aller plus loin',
    blurb:
      'Checklist annuelle, cookbook des tâches courantes, FAQ, glossaire métier, références légales.',
    chapters: [
      {
        title: 'Cycle annuel — checklist',
        intro:
          'Le récap chronologique des obligations légales et opérationnelles.',
        blocks: [
          {
            type: 'lead',
            text: "Imprimez cette checklist et affichez-la dans votre bureau. Elle couvre les 4 phases du cycle annuel d'une copropriété.",
          },
          { type: 'h2', text: 'Tous les mois' },
          {
            type: 'check',
            items: [
              "Émettre l'appel de fonds du mois (Chapitre 11).",
              'Importer le relevé bancaire et faire le pointage (Chapitre 17).',
              'Saisir les dépenses (Chapitre 12), idéalement via OCR IA.',
              'Vérifier les impayés et envoyer les relances (Chapitre 14).',
              "Consulter le tableau de bord et l'audit IA hebdomadaire.",
            ],
          },
          { type: 'h2', text: 'Janvier — Mars (clôture N-1)' },
          {
            type: 'check',
            items: [
              'Vérifier que tous les paiements et dépenses N-1 sont saisis.',
              'Lancer un audit IA conformité approfondi.',
              'Calculer les provisions créances douteuses.',
              'Préparer la balance et le grand-livre.',
              'Générer les annexes 10, 13-1, 13-2 (et 3, 4 si régime normal).',
            ],
          },
          { type: 'h2', text: 'Avril — Juin (AG annuelle)' },
          {
            type: 'check',
            items: [
              'Convocations AG envoyées au moins 15 jours avant.',
              'Documents (budget, comptes, devis) joints aux convocations.',
              'Préparer la salle ou la visio.',
              "Tenue de l'AG avec votes.",
              'PV signé et distribué dans les 7 jours.',
            ],
          },
          { type: 'h2', text: 'Juin — Juillet (archivage)' },
          {
            type: 'check',
            items: [
              'Toutes les tâches du calendrier conformité en statut « Terminé ».',
              'Régénérer toutes les annexes après vote AG.',
              "Exporter le journal d'audit complet.",
              "Verrouiller l'exercice dans Comptabilité · Clôture (Chapitre 22).",
              'Lancer les suggestions budget IA pour N+1.',
            ],
          },
          {
            type: 'ok',
            title: 'Bonne pratique',
            text: "Définissez-vous un slot fixe dans votre agenda : « 1er du mois, 9h-10h : routine Imaro mensuelle ». Vous bouclerez les 5 tâches mensuelles en 1 heure et resterez à jour toute l'année.",
          },
        ],
      },
      {
        title: 'Tâches courantes — cookbook',
        intro: 'Comment faire X, étape par étape, sans réfléchir.',
        blocks: [
          { type: 'h2', text: 'Créer un appel de fonds exceptionnel' },
          {
            type: 'num',
            items: [
              "Faites voter l'enveloppe en AG extraordinaire.",
              'Sur /gestionnaire/paiements · « + Nouvel appel ».',
              'Choisissez « Exceptionnel » comme type.',
              'Saisissez la justification (référence PV AG).',
              'Définissez la répartition (tantième ou autre clé votée).',
              'Cliquez « Émettre ». Les résidents sont notifiés.',
            ],
          },
          { type: 'h2', text: 'Envoyer une mise en demeure' },
          {
            type: 'num',
            items: [
              '/gestionnaire/recouvrement.',
              'Trouvez la ligne du copropriétaire en retard.',
              'Cliquez « Mise en demeure » sur la ligne.',
              'Le PDF est généré et envoyé.',
              'Statut passe à « Mise en demeure ».',
            ],
          },
          { type: 'h2', text: "Générer le bilan annuel pour l'AG" },
          {
            type: 'num',
            items: [
              '/gestionnaire/annexes.',
              "Sélectionnez la résidence + l'exercice.",
              'Cliquez « PDF » sur Annexe 10, 13-1, 13-2.',
              'En régime normal, ajoutez les Annexes 3 et 4.',
              'Attachez les PDFs à la convocation AG.',
            ],
          },
          { type: 'h2', text: 'Importer un relevé bancaire' },
          {
            type: 'num',
            items: [
              'Connectez-vous à votre banque en ligne.',
              'Exportez le relevé du mois en .csv ou .xlsx.',
              '/gestionnaire/pointage.',
              'Sélectionnez votre banque, drop le fichier.',
              'Vérifiez les auto-matches.',
              'Cliquez « Tout confirmer ».',
            ],
          },
          { type: 'h2', text: 'Configurer des pénalités de retard' },
          {
            type: 'num',
            items: [
              'Faites voter le principe et les modalités en AG ordinaire.',
              '/gestionnaire/recouvrement · « Configuration pénalités ».',
              'Activer + type (forfait / % / journalier) + période de grâce + plafond.',
              'Enregistrer.',
              'Cliquez « Recalculer pénalités » pour appliquer aux impayés en cours.',
            ],
          },
          {
            type: 'h2',
            text: 'Inviter un nouveau gestionnaire dans votre équipe',
          },
          {
            type: 'num',
            items: [
              '/gestionnaire/profil · onglet Équipe.',
              'Cliquez « + Inviter ».',
              'Renseignez téléphone WhatsApp + email + rôle (Manager / Agent recouvrement / Conseil).',
              "L'invité reçoit un OTP et un lien d'activation.",
            ],
          },
          { type: 'h2', text: 'Créer une dépense depuis une facture (IA)' },
          {
            type: 'num',
            items: [
              '/gestionnaire/ia · onglet Extraction facture.',
              'Drag & drop la facture PDF ou photo.',
              'Vérifiez les champs extraits.',
              'Cliquez « Créer la dépense ».',
              'Validez le formulaire pré-rempli.',
            ],
          },
          { type: 'h2', text: 'Ajouter un occupant (locataire) sur un lot' },
          {
            type: 'num',
            items: [
              '/gestionnaire/occupants · « + Nouveau ».',
              'Choisissez le lot et type « Locataire ».',
              'Renseignez nom, téléphone du locataire.',
              'Saisissez date début / fin de bail.',
              'Enregistrez. Le locataire sera notifié pour les AG et annonces.',
            ],
          },
          { type: 'h2', text: 'Clôturer un exercice' },
          {
            type: 'num',
            items: [
              'Vérifiez la checklist pré-clôture (Chapitre 22).',
              '/gestionnaire/comptabilite · onglet Clôture.',
              'Étape 1 — Aperçu : vérifier résultat.',
              "Étape 2 — Affectation : choisir destination de l'excédent.",
              'Étape 3 — Verrouiller (action irréversible).',
              'Étape 4 — Récapitulatif et archivage automatique.',
            ],
          },
        ],
      },
      {
        title: 'FAQ',
        intro: 'Les questions qui reviennent souvent.',
        blocks: [
          { type: 'h2', text: 'Mes données sont-elles privées ?' },
          {
            type: 'p',
            text: "Oui. Imaro est multi-tenant — votre tenant est complètement isolé. Aucun autre syndic ne peut voir vos données. Pour l'IA, vos données sont traitées par Claude (Anthropic) mais ni stockées, ni utilisées pour entraîner les modèles.",
          },
          { type: 'h2', text: 'Le QR code des annexes, ça sert à quoi ?' },
          {
            type: 'p',
            text: "Anti-tampering et preuve d'authenticité. Quand un copropriétaire scanne le QR, il atterrit sur imaro.ma/verify/<code> qui confirme : document généré par Imaro, pour cette résidence et cet exercice, à cette date, avec ce contenu (hash SHA-256). Si quelqu'un modifie le PDF, le hash ne correspond plus.",
          },
          { type: 'h2', text: 'Imaro est-il conforme au Décret 2.23.700 ?' },
          {
            type: 'p',
            text: "Oui. Toutes les 12 annexes obligatoires sont générables, le Plan Comptable Marocain est respecté, le cycle annuel de conformité est suivi automatiquement, et le journal d'audit est conservé 7 ans.",
          },
          {
            type: 'h2',
            text: 'Que se passe-t-il si je passe en régime normal (>200K MAD/an) ?',
          },
          {
            type: 'p',
            text: 'Imaro détecte automatiquement le passage de seuil et ajoute les annexes additionnelles requises (3 et 4 obligatoires en plus de 10, 13-1, 13-2). Vous êtes notifié sur le dashboard.',
          },
          {
            type: 'h2',
            text: "Et si ma banque n'est pas dans la liste pour le pointage ?",
          },
          {
            type: 'p',
            text: "Choisissez « Format générique » dans le dropdown. Imaro analyse le fichier .csv ou .xlsx et vous demande de mapper manuellement les colonnes (date, libellé, débit, crédit). Une fois mappé, l'auto-matching fonctionne normalement.",
          },
          { type: 'h2', text: 'Combien coûte Imaro ?' },
          {
            type: 'p',
            text: "Imaro est facturé par nombre de lots gérés, avec un plan d'entrée et un plan pro. Contactez sales@imaro.ma pour un devis personnalisé selon votre portefeuille.",
          },
          { type: 'h2', text: 'Imaro fonctionne-t-il hors-ligne ?' },
          {
            type: 'p',
            text: 'Non, Imaro nécessite une connexion internet. Cela garantit que vos données sont toujours sauvegardées et synchronisées. En cas de coupure ponctuelle, le portail résident garde une version cache des dernières données consultées.',
          },
          { type: 'h2', text: 'Comment changer mon mot de passe ?' },
          {
            type: 'p',
            text: "Il n'y a pas de mot de passe sur Imaro. La connexion se fait par OTP WhatsApp envoyé à chaque session. Vous ne pouvez donc pas vous le faire voler.",
          },
          { type: 'h2', text: 'Puis-je télécharger toutes mes données ?' },
          {
            type: 'p',
            text: "Oui. Sur /gestionnaire/profil · onglet Données, le bouton « Exporter mon tenant » génère un .zip avec tous vos lots, copropriétaires, paiements, dépenses, documents, et journal d'audit en formats standards (CSV + PDF). Conforme RGPD.",
          },
          { type: 'h2', text: 'Et si je veux quitter Imaro ?' },
          {
            type: 'p',
            text: "Vous récupérez toutes vos données via l'export ci-dessus. Aucun verrouillage commercial. Votre tenant est archivé 7 ans (rétention légale) puis définitivement supprimé sur demande.",
          },
        ],
      },
      {
        title: 'Glossaire métier',
        intro:
          'Les termes techniques de la copropriété marocaine, expliqués simplement.',
        blocks: [
          {
            type: 'def',
            items: [
              [
                'Annexe',
                'État comptable réglementaire défini par le Décret 2.23.700. Il y en a 12, dont 3 obligatoires en régime simplifié (10, 13-1, 13-2).',
              ],
              [
                'Appel de fonds',
                'Facture périodique envoyée à chaque copropriétaire pour sa quote-part de charges.',
              ],
              [
                'Assemblée Générale (AG)',
                'Réunion des copropriétaires qui décide collectivement. Ordinaire (annuelle) ou extraordinaire (ponctuelle).',
              ],
              [
                'CIN',
                "Carte d'Identité Nationale marocaine — pièce d'identité standard.",
              ],
              [
                'CGNC',
                'Code Général de Normalisation Comptable — référentiel du Plan Comptable Marocain.',
              ],
              [
                'Conseil syndical',
                "Organe consultatif élu en AG. Contrôle l'action du syndic.",
              ],
              [
                'Copropriétaire',
                "Personne (physique ou morale) propriétaire d'un lot dans une copropriété.",
              ],
              [
                'Décret 2.23.700',
                'Décret du 24 mai 2023 fixant les obligations comptables des copropriétés au Maroc.',
              ],
              [
                'Exercice',
                'Période comptable, généralement 12 mois (1er janvier - 31 décembre).',
              ],
              [
                'Fonds de réserve',
                "Compte d'épargne de la copropriété pour gros travaux et imprévus.",
              ],
              [
                'Gestionnaire',
                'Collaborateur du cabinet syndic qui gère au quotidien une ou plusieurs copropriétés.',
              ],
              [
                'ICE',
                "Identifiant Commun de l'Entreprise — numéro unique à 15 chiffres pour toute entreprise marocaine.",
              ],
              [
                'Loi 18-00',
                'Loi marocaine de 2002 régissant le statut de la copropriété des immeubles bâtis.',
              ],
              [
                'Lot',
                'Unité de propriété dans une copropriété : appartement, bureau, parking, cave…',
              ],
              [
                'Mise en demeure',
                'Document officiel adressé à un copropriétaire en retard, lui rappelant sa dette et menaçant de poursuites.',
              ],
              [
                'Occupant',
                'Personne qui occupe réellement un lot : propriétaire, locataire, usufruitier.',
              ],
              [
                'Partie double',
                "Méthode comptable où chaque opération crédite un compte et débite un autre. Garantit l'équilibre des comptes.",
              ],
              [
                'Plan Comptable Marocain (PCM)',
                'Référentiel des comptes obligatoires, classés en 7 classes (1 à 7).',
              ],
              [
                'Pointage bancaire',
                'Rapprochement entre votre relevé bancaire et vos paiements/dépenses enregistrés.',
              ],
              [
                'Prescription quinquennale',
                '5 ans. Délai au-delà duquel une créance ne peut plus être recouvrée judiciairement (Loi 18-00 art. 25).',
              ],
              [
                'Prestataire',
                'Entreprise ou artisan intervenant pour la copropriété (ascensoriste, nettoyage…).',
              ],
              [
                'Quote-part',
                'Fraction des charges supportée par un copropriétaire, proportionnelle à ses tantièmes.',
              ],
              [
                'Régime simplifié',
                'Mode comptable allégé pour les copropriétés dont les appels annuels ne dépassent pas 200 000 MAD.',
              ],
              [
                'Régime normal',
                'Mode comptable étendu avec annexes 3 et 4 obligatoires (au-delà de 200 000 MAD/an).',
              ],
              [
                'RIBR',
                "Registre d'Immatriculation des Biens en Régime de copropriété — identifie chaque copropriété.",
              ],
              [
                'Syndic',
                'Personne morale ou physique mandatée pour gérer la copropriété. Élue en AG.',
              ],
              [
                'Tantième',
                "Quote-part exprimée en millièmes (ou en autre unité) qui détermine la contribution d'un lot aux charges.",
              ],
              [
                'Tenant',
                "Espace isolé d'un cabinet syndic dans Imaro. Aucune fuite de données entre tenants.",
              ],
              [
                'Trésorerie',
                'Liquidités disponibles : comptes bancaires + caisse + placements liquides.',
              ],
              [
                'TVA',
                'Taxe sur la Valeur Ajoutée — généralement 20 % au Maroc (taux normal).',
              ],
              [
                'Usufruitier',
                "Personne qui a le droit de jouir d'un bien sans en être propriétaire.",
              ],
            ],
          },
        ],
      },
      {
        title: 'Références légales',
        intro:
          "Les textes réglementaires qui encadrent l'activité du syndic au Maroc.",
        blocks: [
          { type: 'h2', text: 'Loi 18-00 — Statut de la copropriété' },
          {
            type: 'p',
            text: 'Promulguée en 2002, la Loi 18-00 fixe le cadre général de la copropriété des immeubles bâtis au Maroc. Elle traite de la propriété privative, des parties communes, des organes de la copropriété, des AG, et des modalités de gestion.',
          },
          {
            type: 'list',
            items: [
              'Article 11 — Tenue obligatoire du registre des occupants.',
              'Article 12 — Délai de 15 jours minimum pour la convocation aux AG.',
              'Article 25 — Recouvrement des charges, pénalités de retard, prescription quinquennale.',
            ],
          },
          { type: 'h2', text: 'Décret 2.23.700 — Obligations comptables' },
          {
            type: 'p',
            text: 'Décret du 24 mai 2023 fixant les obligations comptables, déontologiques et organisationnelles applicables aux syndics professionnels.',
          },
          {
            type: 'list',
            items: [
              'Définition du régime simplifié (≤ 200 000 MAD) et du régime normal.',
              'Liste des 12 annexes obligatoires.',
              "Rétention des justificatifs (10 ans) et du journal d'audit (7 ans).",
              'Cycle de conformité annuel et calendrier des obligations.',
            ],
          },
          {
            type: 'h2',
            text: 'Code Général de Normalisation Comptable (CGNC)',
          },
          {
            type: 'p',
            text: 'Référentiel comptable marocain — le « Plan Comptable » du pays. Imaro implémente nativement les 7 classes (1 à 7) avec une codification adaptée aux copropriétés.',
          },
          { type: 'h2', text: 'Autres textes connexes' },
          {
            type: 'list',
            items: [
              "Loi 09-08 — Protection des personnes physiques à l'égard du traitement des données à caractère personnel.",
              'Loi 31-08 — Mesures de protection du consommateur (applicable au recouvrement amiable).',
              'Code Général des Impôts (CGI) — TVA, IS sur produits financiers de la copropriété.',
            ],
          },
          {
            type: 'tip',
            title: 'Restez à jour',
            text: "L'équipe Imaro suit les évolutions réglementaires marocaines. Toute mise à jour légale est intégrée en ≤ 30 jours dans la plateforme, sans intervention de votre part.",
          },
          { type: 'h2', text: 'Support et formation' },
          {
            type: 'p',
            text: 'Pour toute question légale, technique ou commerciale :',
          },
          {
            type: 'list',
            items: [
              'support@imaro.ma — questions techniques et bugs.',
              'sales@imaro.ma — demandes commerciales et démos.',
              'WhatsApp +212 (le numéro support officiel) — assistance prioritaire.',
              'imaro.ma/help — base de connaissance en ligne.',
            ],
          },
          {
            type: 'ok',
            title: 'Merci !',
            text: "Merci d'avoir choisi Imaro pour gérer vos copropriétés. Toute l'équipe est à votre disposition pour faire de votre quotidien de syndic une expérience fluide et conforme.",
          },
        ],
      },
    ],
  },
]
