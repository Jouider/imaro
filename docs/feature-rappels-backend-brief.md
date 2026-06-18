# Brief backend — Rappels (rappels automatiques de paiement)

**De :** Mouad (frontend) · **Pour :** Abdellah (backend)
**Feature :** `feat/frontend-rappels` — nouvelle page `/gestionnaire/rappels`
**État frontend :** UI complète + service `rappels.service.ts` câblé sur des
endpoints `withMock` (fallback mock tant que l'API n'existe pas). Bascule =
les endpoints ci-dessous répondent → les mocks disparaissent automatiquement.

## Contexte

Moteur de relances de paiement multi-étapes :

```
J-3  →  J-2  →  J-1  →  Jour J  →  En retard (quotidien)
```

Chaque étape part **toujours** en notification push (canal Imaro), plus des
canaux externes optionnels (**WhatsApp / Email / SMS**) activables par étape.
Chaque message est rendu dans la **langue préférée du résident** (fr, ar, en,
es, nl).

Enveloppe API standard attendue : `{ status, message?, data, errors? }`.
Toutes les routes sous le préfixe **`/api/gestionnaire/`** (confirmé via
`php artisan route:list`).

## Endpoints requis

### 1. `GET /api/gestionnaire/residences/{residence}/rappels/config`

Config de relance de la résidence.

```jsonc
{
  "residence_id": 11,
  "auto_enabled": true,
  "next_run_at": "2026-06-06T09:00:00Z", // null si auto désactivé
  "daily_limit": 3,            // plafond d'envois MANUELS / jour
  "used_today": 0,             // envois manuels déjà consommés aujourd'hui
  "max_overdue_days": 7,       // nb de relances retard avant arrêt
  "run_hour": 9,               // heure (0-23) du cron quotidien
  "stages": [
    {
      "id": "j3",              // j3 | j2 | j1 | jour_j | retard
      "enabled": true,
      "channels": { "whatsapp": true, "email": true, "sms": false },
      "pending": 4             // nb résidents actuellement éligibles à cette étape
    }
    // … 5 étapes au total, dans l'ordre ci-dessus
  ],
  "languages": ["fr", "ar", "en", "es", "nl"]
}
```

### 2. `PATCH /api/gestionnaire/residences/{residence}/rappels/config`

Mise à jour partielle. Corps possible (un ou plusieurs champs) :

```jsonc
{ "auto_enabled": false }
{ "daily_limit": 5 }
{ "max_overdue_days": 10 }
{ "stages": [ /* tableau complet d'étapes, même forme que ci-dessus */ ] }
```

Réponse : la config complète mise à jour (même shape que `GET`).

### 3. `GET /api/gestionnaire/residences/{residence}/rappels/stats`

```jsonc
{
  "delivery_rate": 96.4, // % — null tant que le volume est insuffisant
  "delivered": 134,
  "failed": 5,
  "sent_this_month": 139
}
```

### 4. `GET /api/gestionnaire/residences/{residence}/rappels/recent`

Historique récent (≈ 50 dernières lignes, plus récent d'abord).

```jsonc
[
  {
    "id": 1,
    "date": "2026-06-05T09:00:00Z",
    "resident_name": "Yassine Berrada",
    "stage": "jour_j",          // j3 | j2 | j1 | jour_j | retard
    "channel": "whatsapp",      // push | whatsapp | email | sms
    "status": "delivered",      // delivered | sent | pending | failed
    "trigger": "auto"           // auto | manual
  }
]
```

### 5. `GET /api/gestionnaire/residences/{residence}/rappels/templates`

Gabarits de message par canal. Placeholders en **accolades simples** :
`{name}`, `{amount}`, `{date}`, `{building}`.

```jsonc
{
  "push":     { "title": "Rappel de paiement", "body": "Bonjour {name}, …" },
  "whatsapp": { "body": "Bonjour {name}, rappel : … {amount} … {date}." },
  "email":    { "subject": "Rappel de paiement — {building}", "body": "…" },
  "sms":      { "body": "Imaro : votre paiement de {amount} est dû le {date}." }
}
```

> Le front affiche ces gabarits en aperçu (lecture seule pour l'instant).
> Édition des templates = itération suivante — pas bloquant pour le MVP.

### 6. `POST /api/gestionnaire/residences/{residence}/rappels/send`

Déclenche **une étape** manuellement, maintenant.

```jsonc
// corps
{ "stage": "j1" }
// réponse
{ "queued": 3 } // nb de résidents mis en file
```

À enforcer côté backend : décrémenter `used_today` vs `daily_limit` (403 +
message si dépassé — le front affichera le toast d'erreur).

### 7. `POST /api/gestionnaire/residences/{residence}/rappels/send-all`

Déclenche **toutes les étapes activées** ("Tout envoyer maintenant").

```jsonc
// corps {}  → réponse
{ "queued": 14 }
```

## À prévoir côté infra (hors API directe)

- **Cron quotidien** à `run_hour` qui calcule les éligibles par étape et
  envoie sur les canaux activés (push toujours + extras configurés).
- **Localisation** du message selon `resident.preferred_language` (fallback fr).
- **Intégrations canaux** : WhatsApp (Business API / provider), Email (SMTP),
  SMS (provider local MA). Push = déjà en place côté portail (web push).
- **Tracking de livraison** (delivered/failed) pour alimenter `/stats` et
  `/recent` (webhooks providers).
- **Idempotence** : un résident ne doit pas recevoir 2× la même étape le même
  jour, même si `send` + cron se chevauchent.

## Permissions

Route gatée côté front sous `finances` **ou** `recouvrement`
(`navAccess.ts`). Merci de protéger l'API avec la même logique (un
gestionnaire sans ces permissions → 403).

## Tables suggérées (indicatif)

- `reminder_configs` (1-1 résidence) — auto_enabled, daily_limit,
  max_overdue_days, run_hour.
- `reminder_stage_configs` (5 par résidence) — stage, enabled, channels (json).
- `reminder_logs` — résident, stage, channel, status, trigger, sent_at +
  provider_message_id pour le tracking.

---

Ping-moi pour ajuster les shapes ; le front est déjà branché et basculera tout
seul dès que les endpoints répondent (le `withMock` ne sert de filet qu'en dev).
