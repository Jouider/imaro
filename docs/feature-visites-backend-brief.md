# Brief backend — Visites (QR pass + audit trail)

**De :** Mouad (frontend) · **Pour :** Abdellah (backend)
**Feature :** `feat/frontend-visites-qr` — nouvelle page `/gestionnaire/visites`
+ page publique `/v/:token` (sans auth).
**État frontend :** UI complète + service `visites.service.ts` câblé sur des
endpoints `withMock` (fallback mock tant que l'API n'existe pas). Bascule =
les endpoints ci-dessous répondent → les mocks disparaissent automatiquement.

## Contexte (besoin syndic)

> Chaque visiteur ou livreur scannant un QR code doit avoir ses données
> enregistrées dans la base, afin de suivre précisément qui accède à
> l'immeuble, qui est resté, et de comptabiliser chaque passage de manière
> structurée. Le QR code doit être unique, valable pour une seule utilisation,
> et expirer après scan.

### Modèle d'accès (validé avec Mouad)

- **Visiteurs / livreurs** : **pas d'app, pas de login**. Reçoivent un lien
  public `/v/:token` par SMS / WhatsApp avec leur QR.
- **Gardiens (concierges)** : nouveau rôle MVP+1. Scannent le QR sur leur
  téléphone / tablette (Phase 2 PWA).
- **Résidents** : depuis le portail, peuvent inviter un visiteur (Phase 2).
- **Gestionnaire** : page `/gestionnaire/visites` (CRUD + scan d'override).

### Cycle de vie du QR (refinement vs spec)

Le syndic a dit "single-use, expires after scan". Pris littéralement, ça
casse le tracking de sortie (si le QR meurt à l'entrée, comment loguer la
sortie ?). Modèle implémenté :

- **QR pré-invité** : valide dans une fenêtre ±2h autour du `planned_at`,
  permet 1× check-in + 1× check-out puis meurt.
- **QR walk-in** (gardé crée à la volée) : même cycle 2-scans.
- **Expire automatiquement** : 24h sans check-in OU immédiatement après
  check-out.
- **Pas de réutilisation** par un autre visiteur (single-use = 1 identité
  visiteur, pas 1 scan total).

## Endpoints requis

Enveloppe standard : `{ status, message?, data, errors? }`. Préfixe :
`/api/gestionnaire/` pour les routes admin, `/api/` pour les routes publiques.

### 1. `GET /api/gestionnaire/residences/{residence}/visites`

Liste des visites de la résidence (plus récente d'abord).

```jsonc
[
  {
    "id": 1,
    "residence_id": 11,
    "qr_token": "vst_abc123def",
    "visitor_name": "Ahmed Ouazzani",
    "visitor_phone": "+212600112233",
    "type": "visitor",                       // visitor | delivery | contractor | prestataire
    "purpose": "Visite familiale",
    "host_lot_id": 12,
    "host_lot_numero": "A-12",
    "host_name": "Hassan Benali",
    "planned_at": "2026-06-07T16:00:00Z",    // null = walk-in
    "arrived_at": null,
    "left_at": null,
    "status": "planned",                     // planned | arrived | departed | expired | cancelled
    "created_by_name": "Hassan Benali",
    "created_at": "2026-06-06T12:00:00Z"
  }
]
```

### 2. `GET /api/gestionnaire/residences/{residence}/visites/stats`

```jsonc
{
  "today": 4,                // visites du jour (tous statuts)
  "currently_inside": 1,     // status=arrived
  "planned": 2,              // status=planned avec planned_at futur
  "expired_today": 1         // status=expired sur les 24h
}
```

### 3. `POST /api/gestionnaire/residences/{residence}/visites`

Création d'une visite (par gestionnaire ou résident hôte).

```jsonc
// corps
{
  "visitor_name": "Yassine Berrada",
  "visitor_phone": "+212611223344",
  "type": "visitor",
  "purpose": "Rendez-vous personnel",     // optional
  "host_lot_id": 5,                       // optional (pour walk-ins du gardien)
  "planned_at": "2026-06-07T16:00:00Z"    // optional → si absent : walk-in (status='arrived' direct)
}
// réponse: la visite créée (même shape que GET, avec qr_token généré)
```

**Génération du token** : token opaque cryptographiquement sûr
(`random_bytes(16)` + base62 ou ULID), 12-22 chars. **Indexé unique** en DB.

### 4. `POST /api/gestionnaire/visites/{id}/cancel`

Annule une visite `planned` ou `arrived`. Réponse : la visite avec
`status='cancelled'`.

### 5. `POST /api/visites/scan`

**Endpoint guardien** (ou gestionnaire en override). Auth requise (rôle
`gestionnaire`, `gardien` ou `manager`). Implémente la logique du cycle :

```jsonc
// corps
{ "token": "vst_abc123def" }
// réponse 200
{
  "visit": { ... },
  "action": "check_in",   // check_in | check_out | rejected
  "reason": null          // string si rejected
}
```

**Logique côté backend** :
- Si `status='planned'` ET dans la fenêtre ±2h du `planned_at` → set
  `arrived_at=now()`, `status='arrived'`, return `action='check_in'`.
- Si `status='arrived'` → set `left_at=now()`, `status='departed'`,
  return `action='check_out'`.
- Sinon → `action='rejected'` avec `reason` ('expired', 'cancelled',
  'too_early', 'already_departed', etc.).

### 6. `GET /api/public/visites/{token}` ⚠️ **PUBLIC, pas d'auth**

Lookup par token pour la page `/v/:token` que le visiteur ouvre. **Pas
d'auth requise**. Retourne uniquement les champs utiles côté visiteur
(nom, hôte, lot, planned_at, status). **Ne pas exposer** : `id`,
`residence_id`, `created_by`, phone côté visiteur (déjà connu de lui),
ou autres tokens.

Si token invalide / expiré / annulé → **404** (le front affiche
"Laissez-passer introuvable").

## Tables suggérées

```
visites
  id                bigint PK
  residence_id      bigint FK
  qr_token          string(32) UNIQUE INDEX
  visitor_name      string
  visitor_phone     string
  type              enum('visitor','delivery','contractor','prestataire')
  purpose           text NULL
  host_lot_id       bigint FK NULL
  host_user_id      bigint FK NULL          -- résident hôte si invité par lui
  planned_at        timestamp NULL
  arrived_at        timestamp NULL
  left_at           timestamp NULL
  status            enum('planned','arrived','departed','expired','cancelled')
  created_by_id     bigint FK
  created_at        timestamp
  updated_at        timestamp

  INDEX (residence_id, status)
  INDEX (planned_at)

visite_scan_logs
  id                bigint PK
  visite_id         bigint FK
  scanned_by_id     bigint FK              -- user qui a scanné (gardien/gestionnaire)
  action            enum('check_in','check_out','rejected')
  reason            string NULL
  scanned_at        timestamp
```

## Permissions

- `GET / POST / cancel` : `gestionnaire`, `manager`, `super_admin` + le
  résident hôte (uniquement ses propres visites — non testé côté front,
  ça vient en Phase 2 quand on construit le flow résident).
- `POST /visites/scan` : `gestionnaire`, `manager`, `gardien` (nouveau rôle).
- `GET /public/visites/{token}` : **public, pas d'auth**.

## Tâche planifiée (cron)

Job quotidien (3h du matin par exemple) qui passe à `status='expired'`
toutes les visites `planned` dont `planned_at < now() - 24h` et qui n'ont
jamais eu de check-in. Sinon les KPIs `expired_today` ne se remplissent
jamais.

## Notifications (nice-to-have, Phase 2)

- Création d'une visite → SMS/WhatsApp au visiteur avec le lien `/v/:token`
  (utiliser ton `NotificationProvider` déjà en place).
- Check-in du visiteur → notification push à l'hôte ("Ahmed est arrivé").

## Cross-link avec autres modules

- `host_lot_id` → table `lots` existante
- `host_user_id` → table `users` (rôle resident)
- Si le visiteur est de type `prestataire` ET il existe une entrée
  `prestataires` qui matche → lier (Phase 2, idée d'amélioration).

---

## Phase 2 additions (gardien PWA — branch `feat/frontend-gardien-pwa`)

Frontend ajoute deux endpoints supplémentaires pour la PWA gardien :

### 8. `POST /api/visites/walk-in`

**Auth** : `gardien`, `gestionnaire`, `manager`. Crée une visite **et**
marque l'arrivée dans la même requête (atomique). Idempotent par phone+nom
sur ±5 min pour éviter les doubles-saisies de gardiens stressés.

```jsonc
// corps (mêmes champs que POST visites, sans planned_at)
{
  "residence_id": 11,
  "visitor_name": "Yassine Berrada",
  "visitor_phone": "+212611223344",
  "type": "visitor",
  "purpose": "Visite famille",
  "host_lot_id": 12   // optionnel
}
// réponse : la visite avec status='arrived', arrived_at=now()
```

### 9. `GET /api/gardien/visites/active`

Liste des visiteurs actuellement à l'intérieur (`status='arrived'`) pour
la **résidence du gardien connecté** (le backend lit `user.residence_id`,
le front n'envoie pas de `residence_id`). Trié par `arrived_at` desc.

```jsonc
[ /* même shape que /visites mais filtré sur status='arrived' */ ]
```

### Nouveau rôle `gardien`

Ajouter à `RolesSeeder` côté backend :
- Slug : `gardien`
- Hérite : permission `visites:scan` + `visites:walk-in` uniquement
- **Pas** d'accès admin (`/api/gestionnaire/*` → 403)
- **A** accès à `/api/visites/scan`, `/api/visites/walk-in`, `/api/gardien/*`
- Le manager peut créer un gardien depuis Utilisateurs (réutilise le flow
  manager-creates-gestionnaire avec un picker de rôle).

### Auth gardien

Réutilise le login existant (`POST /api/auth/login`) — le backend décide
de la redirection en renvoyant `user.role`. Le frontend redirige
automatiquement les rôles `gardien` vers `/gardien` (à ajouter dans
`LoginPage` après ce PR — pas encore fait pour éviter de bloquer le merge).

### PWA install hint

Le front peut suggérer "ajouter à l'écran d'accueil" sur `/gardien` —
utile pour les tablettes de lobby. Pas de besoin d'endpoint.

## Phase 2.B additions (branch `feat/frontend-visites-wallet-photo`)

Trois nouveautés frontend qui s'appuient sur des endpoints / champs
backend additionnels :

### 10. `POST /api/visites/{id}/photo`

**Auth** : `gardien`, `gestionnaire`, `manager`. Stocke une photo capturée
au check-in (anti-spoofing). Corps :

```jsonc
{ "photo": "data:image/jpeg;base64,/9j/4AAQ..." }   // ~30-150 kB JPEG
```

Réponse : la `Visite` à jour avec `photo_url` rempli. Storage suggéré :
disk S3-like avec URL publique courte (signed link 7 jours suffit).
Limite payload côté backend (ex. 500 kB max).

### 11. `GET /api/public/visites/{token}/wallet` ⚠️ **PUBLIC**

Retourne deux URLs (Apple `.pkpass` + Google Wallet JWT) que le front
ouvre depuis la page visiteur. Pas d'auth.

```jsonc
{
  "apple_url":  "https://app.imaro.ma/api/public/visites/{token}/apple.pkpass",
  "google_url": "https://pay.google.com/gp/v/save/<google-wallet-JWT>"
}
```

Cèoté backend : besoin d'une cert Apple Wallet (Apple Developer Program,
~$99/an, certs `pass.com.imaro.visit`) + un service account Google Wallet
+ classe wallet définie une fois pour toutes. Si pas prio MVP, retourner
404 — le front n'affichera simplement pas les boutons.

### 12. Nouveaux champs sur la table `visites`

```
visites
  ...
  photo_url     string nullable       -- public URL après upload
  is_recurring  boolean default false  -- pass réutilisable (prestataire récurrent)
  recurrence    string nullable        -- libellé humain (ex. "Mardi 9h-12h")
```

**Impact sur la logique scan** : si `is_recurring=true`, ne pas
expirer après check-out. Le QR reste valide indéfiniment. Idéalement
ajouter un champ `valid_until` (date d'expiration de contrat) — pas
fait côté front pour l'instant.

### Redirection login `gardien`

Le front redirige automatiquement vers `/gardien` quand le login renvoie
`user.role === 'gardien'`. Vérifie côté backend que le rôle est bien
renvoyé dans le payload `verify-otp` / `loginEmail`.

---

Ping-moi pour ajuster les shapes ; le front bascule tout seul dès que tes
routes répondent (le `withMock` ne sert de filet qu'en dev).
