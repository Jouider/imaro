# Brief backend — Documents : édition + catégorie personnalisée (KAN-45)

**De :** Mouad (frontend) · **Pour :** Abdellah (backend)
**Feature :** `feat/frontend-documents-kan45` — page `/gestionnaire/documents`
**État frontend :** UI complète + service `documents.service.ts` câblé (mock
fallback en dev). Bascule = les endpoints ci-dessous répondent → les mocks
disparaissent.

## Contexte (ticket KAN-45)

Le module Documents doit permettre :
1. **Modifier (renommer) un document après l'avoir ajouté** — n'existait pas.
2. Sélectionner **résidence + date** à l'ajout — déjà présent côté front.
3. **Catégories prédéfinies** (`reglement`, `pv_ag`, `contrat`, `facture`) **+
   catégorie personnalisée** libre quand le type = `autre` (ex. « Manuel »).

Points 2 OK. Restent **2 ajouts backend** : (A) champ catégorie libre, (B)
endpoint d'édition.

Enveloppe API standard : `{ status, message?, data, errors? }`. Routes sous
`/api/gestionnaire/`.

## (A) Champ `categorie_libre`

Ajouter une colonne **`categorie_libre`** (string nullable) à la table
`documents`. Utilisée uniquement quand `type = 'autre'` — libellé saisi par le
gestionnaire.

- **`GET /gestionnaire/documents`** → inclure `categorie_libre` dans chaque
  document retourné.
- **`POST /gestionnaire/documents`** → accepter le champ optionnel
  `categorie_libre` (string) en plus des champs existants. Le front l'envoie
  dans le `multipart/form-data` **seulement** si `type = 'autre'` et non vide.

Shape `GestDoc` attendu côté front (déjà typé) :

```jsonc
{
  "id": 12,
  "nom": "Manuel d'utilisation ascenseur",
  "type": "autre",
  "categorie_libre": "Manuel",   // null si type != autre ou non fourni
  "residence": { "id": 1, "name": "Atlas Casablanca" }, // ou null
  "date": "2026-06-08",
  "url": "https://…/doc.pdf",
  "taille_ko": 88
}
```

## (B) `PATCH /gestionnaire/documents/{id}` — édition / renommage

Met à jour les **métadonnées** d'un document existant (pas le fichier).

**Body :** `application/json`

| Champ | Type | Requis | Note |
| ----- | ---- | ------ | ---- |
| `nom` | string | ✅ | Nouveau nom / titre |
| `type` | enum | ✅ | `reglement\|pv_ag\|contrat\|facture\|autre` |
| `categorie_libre` | string\|null | — | Libellé libre si `type = autre`, sinon `null` |
| `residence_id` | integer\|null | — | `null` = document global cabinet |
| `date` | date (YYYY-MM-DD) | ✅ | Date du document |

**Réponse 200 :** `{ "document": GestDoc }` (le document mis à jour, même shape
que GET).

> Le remplacement du **fichier** lui-même est hors scope de ce ticket — l'édition
> ne touche que les métadonnées (renommage = cas principal).

## Mise à jour du contrat

`docs/api.md` §13 (Documents) : ajouter la ligne `categorie_libre` au POST,
ajouter la section `PATCH /api/gestionnaire/documents/{id}`.

## Bascule front

Service `frontend/src/services/documents.service.ts` :
- `updateDocument(id, data)` appelle déjà `PATCH /gestionnaire/documents/{id}`.
- `storeDocument` envoie `categorie_libre` quand présent.
- Retirer les `withMock` fallback une fois les endpoints déployés.
