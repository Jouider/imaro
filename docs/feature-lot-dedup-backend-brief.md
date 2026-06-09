# Brief backend — Lot déjà assigné : déduplication (KAN-40)

**De :** Mouad (frontend) · **Pour :** Abdellah (backend)
**Feature :** `fix/frontend-copro-lot-dedup-kan40` — page `/gestionnaire/coproprietaires`

## Contexte (ticket KAN-40)

Quand on ajoute un copropriétaire et qu'on sélectionne un lot, **ce lot ne doit
plus apparaître** dans la liste des lots disponibles une fois assigné — pour
éviter les doublons (deux copropriétaires sur le même lot).

## Côté front — déjà fait

- La liste « lots disponibles » filtre déjà sur `lot.coproprietaire === null`
  (l'endpoint `GET /gestionnaire/residences/{id}/lots` renvoie bien le champ
  `coproprietaire`).
- **Correctif de ce PR** : après création d'un copropriétaire, on invalide la
  requête `['lots']` → le lot fraîchement assigné disparaît immédiatement de la
  liste (avant, la liste restait périmée jusqu'à un refresh manuel — c'était le
  bug visible).

## Côté backend — demandé (autorité + sécurité course)

La validation visuelle ne suffit pas : il faut une **garantie serveur** contre
la double assignation (requêtes concurrentes, appels API directs).

1. **`POST /gestionnaire/coproprietaires`** (et toute route d'assignation de lot,
   ex. `storeLot` / assignation) : **rejeter en 422** si le `lot_id` a déjà un
   copropriétaire actif.
   ```json
   { "status": "error", "message": "Ce lot est déjà attribué à un copropriétaire.",
     "errors": { "lot_id": ["Lot déjà attribué."] } }
   ```
2. Idéalement, **contrainte d'unicité** en base (un lot ↔ au plus un
   copropriétaire actif) pour fermer la course définitivement.
3. (Optionnel) `GET …/lots` : exposer un filtre `?available=1` qui ne renvoie
   que les lots libres, pour éviter de filtrer côté client.

Le front gère déjà proprement un 422 (toast d'erreur) — pas de changement front
nécessaire si le message d'erreur est renvoyé dans l'enveloppe standard.
