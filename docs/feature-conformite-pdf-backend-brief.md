# Brief backend — Conformité : annexes 3-12, audit PDF, sync compta (KAN-42)

**De :** Mouad (frontend) · **Pour :** Abdellah (backend)
**Feature :** `feat/frontend-conformite-kan42` — module Conformité
(`/gestionnaire/conformite`, `/gestionnaire/annexes`, `/gestionnaire/audit`)

## Contexte (ticket KAN-42)

Le module Conformité a 3 volets : calendrier, annexes comptables, journal
d'audit. Problèmes signalés :
1. **Calendrier** : description/design désorganisés, notion d'AG pas claire.
2. **Annexes 3 → 12** : absentes du système, leurs **PDF ne se téléchargent
   pas**.
3. **Journal d'audit** : aucun **PDF**, et **pas de synchronisation** avec la
   comptabilité.

## Côté front — fait (volet 1)

- Correction des **libellés de phases** du calendrier (clés i18n désalignées :
  les phases s'affichaient en slugs bruts `operations_mensuelles`… → désormais
  « Opérations mensuelles », « Clôture d'exercice », « Préparation de l'AG »,
  « Archivage »).
- Ajout d'une **description par phase** + correction des statuts (`pending` /
  `overdue` manquaient → « À faire » / « En retard »).
- **Notion d'AG clarifiée** : la phase « Préparation de l'AG » décrit le délai
  légal (15 j, loi 18-00) et porte un lien direct **« Gérer les assemblées »**
  vers `/gestionnaire/assemblees`. (Vérifié en preview.)

## Côté backend — demandé (volets 2 & 3)

### A. Annexes comptables 3 → 12 (décret 2.23.700)
Le front consomme `GET /gestionnaire/annexes` (liste + statut par annexe) et
attend un PDF par annexe.

1. **Implémenter les annexes manquantes (3 à 12)** côté backend : chaque annexe
   doit être **calculable** depuis les données de l'exercice (comptes, écritures,
   budget, AG…).
2. **Endpoint de génération/téléchargement PDF** par annexe — ex.
   `GET /gestionnaire/annexes/{num}/pdf?residence_id=&exercice_id=` → renvoie le
   PDF (ou 422 si données insuffisantes). Aujourd'hui le téléchargement échoue.
3. `GET /gestionnaire/annexes` doit renvoyer, pour chaque annexe 3-12 :
   `{ num, required, available, last_generated }` (shape déjà typé côté front,
   `AnnexeStatus`).

### B. Journal d'audit — PDF + synchronisation compta
1. **Export PDF** du journal d'audit :
   `GET /gestionnaire/audit/pdf?from=&to=&residence_id=` → PDF horodaté.
2. **Synchronisation comptabilité** : les écritures comptables
   (création/modification/validation) doivent **alimenter le journal d'audit**
   (catégorie `paiement` / `depense` / `budget`…), pour que l'audit reflète
   les mouvements comptables. Aujourd'hui l'audit ne se synchronise pas avec la
   compta.

## Notes
- Les PDF peuvent être générés côté backend (recommandé pour les annexes
  réglementaires — cohérence + archivage légal). Le front se contente de
  déclencher le téléchargement.
- Référentiel : **décret 2.23.700** (annexes 1-13, régime simplifié vs normal).
