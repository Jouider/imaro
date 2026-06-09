# Brief backend — Tickets : création + référence + audit (KAN-43)

**De :** Mouad (frontend) · **Pour :** Abdellah (backend)
**Feature :** `feat/frontend-tickets-kan43` — page `/gestionnaire/tickets`
**État frontend :** UI complète + service `gestionnaire.service.ts` câblé (mock
fallback en dev).

## Contexte (ticket KAN-43)

1. **Aucun bouton pour créer un ticket** côté gestionnaire → ajouté + endpoint à fournir.
2. **Référence unique** par ticket (le copropriétaire la communique au syndic).
3. **Audit** : nombre de tickets par résidence (le plus / le moins sollicité).

## (A) Référence unique sur le ticket

Ajouter un champ **`reference`** (string, unique) à la table `tickets`, généré à
la création — format suggéré **`TKT-{année}-{séquence}`** (ex. `TKT-2026-0007`).

- **`GET /gestionnaire/tickets`** et **`GET /gestionnaire/tickets/{id}`** →
  inclure `reference` dans la réponse (déjà typé côté front).

## (B) `POST /gestionnaire/tickets` — création gestionnaire

**Body :** `application/json`

| Champ | Type | Requis |
| ----- | ---- | ------ |
| `residence_id` | integer | ✅ |
| `lot_id` | integer | ✅ |
| `categorie` | string | ✅ |
| `priorite` | `urgent\|normal\|faible` | ✅ |
| `description` | string | ✅ |

Logique : `statut` initial = `ouvert`, `reference` générée, `created_at` = now.

**Réponse 201 :** `{ "ticket": Ticket }` (avec `reference`).

## (C) Audit par résidence

Pour l'instant **calculé côté front** à partir de la liste des tickets
(`buildAudit` : total + répartition par statut, trié par volume). Aucun endpoint
requis pour le MVP.

> Optionnel (perf, gros volumes) : un endpoint d'agrégat
> `GET /gestionnaire/tickets/audit` → `[{ residence_id, residence, total,
> ouvert, en_cours, resolu, clos }]`. Non bloquant.

## Mise à jour du contrat

`docs/api.md` — section Tickets : ajouter `reference` aux réponses GET, et la
section `POST /api/gestionnaire/tickets`.

## Bascule front

`createTicket()` appelle déjà `POST /gestionnaire/tickets` (mock génère une
référence en dev). Retirer le `withMock` une fois l'endpoint déployé.
