# Brief backend — Convocation AG : délai 15 jours + PDF perso + notif (KAN-44)

**De :** Mouad (frontend) · **Pour :** Abdellah (backend)
**Feature :** `feat/frontend-ag-15jours-kan44` — page `/gestionnaire/assemblees`

## Contexte (ticket KAN-44)

À la création d'une AG :
1. **Respecter le délai légal de 15 jours** avant la date (loi 18-00,
   art. 16 quinquies). Bloquer l'enregistrement si trop rapproché.
2. Générer un **PDF personnalisé par copropriétaire** (nom, prénom, n°
   d'appartement + l'article légal loi 18-00 encadrant les délais).
3. **Notifier** chaque copropriétaire avec son PDF individuel (suivi simple).

## Côté front — fait

- Le formulaire **bloque** toute date à moins de 15 jours : champ `min` sur le
  date-picker, message d'erreur légal, et bouton **Enregistrer désactivé** tant
  que `date < aujourd'hui + 15 j`. (Vérifié en preview.)

## Côté backend — demandé

### 1. Validation serveur du délai (défense)
`POST /gestionnaire/assemblees` doit **rejeter en 422** si
`date < now + 15 jours` (le front bloque déjà, mais l'API doit garantir la règle
contre les appels directs) :
```json
{ "status":"error","message":"La convocation doit partir au moins 15 jours avant l'AG (loi 18-00).",
  "errors": { "date": ["Délai légal de 15 jours non respecté."] } }
```

### 2. Génération PDF de convocation personnalisé (par copropriétaire)
À la création (ou via une action dédiée `POST /gestionnaire/assemblees/{id}/convocations`) :
- pour **chaque copropriétaire** de la résidence, générer un PDF nominatif :
  - en-tête syndic + résidence,
  - **nom, prénom, n° d'appartement (lot)** du destinataire,
  - **ordre du jour**, date / heure / lieu,
  - **article légal** loi 18-00 (délai de convocation 15 j — art. 16 quinquies),
  - référence AG.
- stocker les PDF (ex. `storage/convocations/{ag_id}/{copro_id}.pdf`).

### 3. Notification avec PDF individuel
- envoyer à chaque copropriétaire une notification (email Resend + push portail)
  contenant **son** PDF de convocation, pour un suivi simple côté syndic.
- exposer un récap côté AG : nb convocations envoyées / lues (optionnel).

## Contrat (réponse attendue à la création)

Idéalement, `POST /gestionnaire/assemblees` renvoie l'AG + un résumé
convocations :
```jsonc
{ "status":"success", "data": {
  "assemblee": { /* Assemblee */ },
  "convocations": { "total": 24, "envoyees": 24, "pdf_base_path": "storage/convocations/12/" }
}}
```

Le front n'a pas besoin de changement pour le MVP (création OK) ; un onglet de
suivi des convocations pourra être ajouté ensuite quand l'endpoint existe.

## Référentiel légal
- Loi 18-00, **art. 16 quinquies** : convocation AG ≥ **15 jours** avant la date,
  par lettre recommandée / email avec AR (preuve horodatée).
