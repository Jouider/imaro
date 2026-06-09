# Brief backend — Filtre résidence universel (KAN-47)

**De :** Mouad (frontend) · **Pour :** Abdellah (backend)
**Feature :** `feat/frontend-global-residence-kan47`
**État frontend :** Sélecteur de résidence global dans la sidebar (store
`residenceStore`, persisté). Les sections filtrent leurs données selon la
résidence choisie (`null` = toutes).

## Contexte

Le ticket demande un **filtrage universel** : choisir une résidence dans la
sidebar filtre toutes les sections. Côté front, c'est fait **client-side** pour
les sections dont la donnée porte déjà la résidence :

| Section | Champ utilisé | Statut |
| ------- | ------------- | ------ |
| Tickets | `ticket.residence.id` | ✅ filtré client-side |
| Dépenses | `depense.residence_id` | ✅ filtré client-side |
| Documents | `document.residence.id` | ✅ filtré client-side |
| Comptabilité | `residence_id` (pilote les requêtes exercices/écritures) | ✅ |

## Dépendance backend — Paiements / Créances

La section **Paiements** ne peut pas être filtrée côté front : le type
`Creance` **ne porte aucune information de résidence**, et
`GET /gestionnaire/creances` n'accepte pas de filtre résidence.

Demandé :
1. **`GET /gestionnaire/creances`** → accepter un query param **`residence_id`**
   (optionnel) qui restreint les créances à la résidence donnée. Le front
   l'envoie déjà quand une résidence est sélectionnée
   (`getCreances({ residence_id })`).
2. (Idéalement) ajouter la résidence à la réponse `Creance`
   (`residence: { id, name }`) pour permettre aussi un filtrage/affichage
   client-side et la cohérence avec les autres sections.

Tant que ce n'est pas livré, le sélecteur global n'affecte pas Paiements (le
param est transmis mais ignoré).

## Note (optionnel, perf)

Les sections filtrées client-side fonctionnent, mais pour de gros volumes il
serait préférable que **tous** les endpoints liste acceptent `residence_id`
(tickets, dépenses, documents…) afin de filtrer côté serveur. Non bloquant —
à considérer quand les volumes augmentent.

## Aucune action si

Si `residence_id` est déjà supporté sur certains endpoints, rien à faire pour
ceux-là — le front est rétrocompatible (il filtre en plus côté client).
