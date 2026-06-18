# Brief backend — Annexes/comptes complets + prestataire (KAN-46)

**De :** Mouad (frontend) · **Pour :** Abdellah (backend)
**Feature :** `feat/frontend-prestataire-combobox-kan46`

## Contexte (ticket KAN-46)

Sur plusieurs étapes (dépenses, comptabilité, documents…), au moment de choisir
un **compte** ou un **document** :
1. Plus de 50 % des **annexes / comptes** du **décret 2.23.700** manquent dans
   les sélecteurs — il faut proposer **l'ensemble** des comptes numérotés
   (classes 6, 7, etc. : 61xx, 31xx, 70x…).
2. Permettre de **sélectionner un prestataire existant** ou, à défaut, de le
   **saisir manuellement**.

## Côté front — fait (point 2)

- Le champ **Prestataire** de la dépense est désormais un **combobox** :
  liste des prestataires actifs (`getPrestataires`) via `<datalist>`, **tout en
  laissant la saisie libre** d'un nouveau nom. (Vérifié en preview.)

## Côté backend — demandé (point 1 : complétude des comptes)

Le front consomme `GET /gestionnaire/comptes-pcg` (`getComptesPcg`) pour peupler
les sélecteurs de comptes. Le problème : la liste renvoyée est **incomplète**
(le front filtre seulement par classe selon l'écran, mais ne peut pas inventer
des comptes absents du backend).

Demandé :
1. **Compléter le plan comptable (PCG copropriété / décret 2.23.700)** côté seed
   pour que `GET /gestionnaire/comptes-pcg` renvoie **tous** les comptes
   normalisés — au minimum :
   - **classe 6** (charges) : 61xx, 612x, 613x, 614x, 616x, 617x, 65xx…
   - **classe 7** (produits) : 70x, 75x, 76x…
   - les comptes de tiers/trésorerie utilisés par les écritures (3xx, 4xx, 5xx).
2. Chaque compte : `{ numero, libelle, classe }` (shape déjà consommé par le
   front).
3. Si certaines **annexes comptables** (décret 2.23.700, annexes numérotées)
   doivent alimenter des sélecteurs spécifiques, exposer leur liste de référence
   via un endpoint dédié (ex. `GET /gestionnaire/annexes/catalogue`) — à
   préciser ensemble selon l'écran concerné.

> Le front affichera automatiquement la liste complète dès que le backend la
> renvoie — aucune modification front nécessaire pour les comptes (le filtre par
> classe reste correct, il s'appuie sur `compte.classe`).

## Lien KAN-42
La complétude des **annexes 3→12** + leur génération PDF est traitée dans le
ticket KAN-42 (module Conformité) — voir le brief associé si créé.
