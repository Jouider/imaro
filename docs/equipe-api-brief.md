# Module Équipe — Brief backend (Abdellah)

> **Pour Abdellah (backend)** — endpoints à livrer pour le module **Équipe** (gestion des membres de l'app + personnel de terrain).
> **Frontend**: déjà branché en **mode mock** (`frontend/src/services/equipe.service.ts`). Quand tu livres un endpoint, Mouad bascule `withMock(...)` → appel réel, rien d'autre à changer côté front.
> **Enveloppe standard**: `{ status: 'success' | 'error', message?, data, errors? }`.
> **Auth**: Bearer Sanctum, scope tenant courant (multi-tenant) sur **toutes** les routes.

---

## 1. Vue d'ensemble

Deux ressources distinctes, deux pages frontend :

| Ressource | Page front | Qui ? | Base path |
|---|---|---|---|
| **Utilisateurs de l'app** | `UtilisateursPage` | Membres qui opèrent Imaro (login email + mot de passe + permissions modulaires) | `/api/equipe/utilisateurs` |
| **Personnel de résidence** | `PersonnelPage` | Staff de terrain affecté à une résidence (sécurité, ménage, gardiennage…) — **pas** de login app | `/api/equipe/personnel` |

---

## 2. Utilisateurs de l'app (`AppUser`)

### 2.1 Schéma DB suggéré

Réutilise idéalement la table `users` existante + une pivot pour les résidences.

```sql
-- Colonnes à garantir sur `users` (ou table dédiée app_users) :
--   id, tenant_id, name, email (unique par tenant), password (hashé),
--   role ENUM(...), is_active BOOL DEFAULT 1, created_at

-- Permissions modulaires : colonne JSON `permissions` sur users
--   OU table users_permissions(user_id, permission)

-- Résidences gérées (multi) : table pivot
CREATE TABLE app_user_residences (
  user_id      BIGINT UNSIGNED NOT NULL,
  residence_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, residence_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (residence_id) REFERENCES residences(id) ON DELETE CASCADE
);
```

**Règle métier `residence_ids`** : tableau vide `[]` = le membre gère **toutes** les copropriétés du tenant. Sinon, il est restreint aux IDs listés.

### 2.2 Enums attendus par le front

```
role        : administrateur | gestionnaire | assistant | comptable
permissions : residences | coproprietaires | finances | depenses |
              recouvrement | assemblees | documents | personnel | parametres
```

Presets de permissions par rôle (le front pré-coche, mais reste éditable — donc **le backend doit accepter n'importe quelle combinaison**, pas forcer le preset) :

| Rôle | Permissions par défaut |
|---|---|
| `administrateur` | toutes |
| `gestionnaire` | residences, coproprietaires, finances, depenses, recouvrement, assemblees, documents, personnel |
| `assistant` | residences, coproprietaires, assemblees, documents |
| `comptable` | finances, depenses, recouvrement, documents |

### 2.3 Forme de réponse (`data` d'un AppUser)

```jsonc
{
  "id": 2,
  "name": "Salma Bennani",
  "email": "salma.bennani@imaro.ma",
  "role": "gestionnaire",
  "permissions": ["residences", "coproprietaires", "finances", "assemblees"],
  "residence_ids": [1, 2],          // [] = toutes
  "statut": "actif",                // "actif" | "inactif"  (mappé depuis is_active)
  "created_at": "2024-02-15T08:00:00Z"
}
```

> ⚠️ Le front attend `statut: "actif" | "inactif"` dans la **réponse**, mais envoie `is_active: boolean` dans les **requêtes** (voir update ci-dessous). À mapper côté backend.

### 2.4 Endpoints

#### `GET /api/equipe/utilisateurs`
→ `data: AppUser[]` (scopé tenant).

#### `POST /api/equipe/utilisateurs`
Body :
```jsonc
{
  "name": "string",
  "email": "string",            // unique par tenant
  "password": "string",         // en clair, généré côté front — à hasher
  "role": "administrateur | gestionnaire | assistant | comptable",
  "permissions": ["..."],
  "residence_ids": [1, 2]       // peut être []
}
```
→ `data: AppUser` (le membre créé, `statut: "actif"`).
Erreurs : `422` email déjà pris / invalide → `errors` par champ.

#### `PUT /api/equipe/utilisateurs/:id`
Body (tous les champs **optionnels** — patch partiel) :
```jsonc
{
  "name?": "string",
  "email?": "string",
  "role?": "...",
  "permissions?": ["..."],
  "residence_ids?": [1, 2],
  "is_active?": true,           // toggle statut
  "password?": "string"         // si présent → réinitialise le mot de passe
}
```
→ `data: AppUser` (à jour).
Le toggle Actif/Inactif du tableau envoie **uniquement** `{ "is_active": bool }`.

#### `DELETE /api/equipe/utilisateurs/:id`
→ `204` ou `{ status: "success" }`. Soft-delete recommandé.

---

## 3. Personnel de résidence (`ResidenceStaff`)

Staff de terrain, **sans accès à l'app** (pas d'email/password). Permissions = badges opérationnels (accès résidence, pointage…).

### 3.1 Schéma DB suggéré

```sql
CREATE TABLE residence_staff (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id    BIGINT UNSIGNED NOT NULL,
  residence_id BIGINT UNSIGNED NOT NULL,
  name         VARCHAR(255) NOT NULL,
  poste        ENUM('securite','menage','gardien','jardinier','technicien','concierge') NOT NULL,
  phone        VARCHAR(32) NULL,
  permissions  JSON NULL,           -- liste de StaffPermission
  is_active    BOOL NOT NULL DEFAULT 1,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (residence_id) REFERENCES residences(id) ON DELETE CASCADE,
  INDEX idx_tenant_residence (tenant_id, residence_id)
);
```

### 3.2 Enums attendus

```
poste       : securite | menage | gardien | jardinier | technicien | concierge
permissions : acces_residence | gestion_visiteurs | pointage | incidents | cles | livraisons
```

### 3.3 Forme de réponse (`ResidenceStaff`)

```jsonc
{
  "id": 1,
  "name": "Mohammed Ouahbi",
  "poste": "securite",
  "residence_id": 1,
  "residence_nom": "Résidence Atlas",   // dénormalisé pour l'affichage tableau
  "phone": "+212661112233",             // ou null
  "permissions": ["acces_residence", "gestion_visiteurs", "incidents"],
  "statut": "actif",                    // mappé depuis is_active
  "created_at": "2024-03-01T08:00:00Z"
}
```

### 3.4 Endpoints

#### `GET /api/equipe/personnel`
→ `data: ResidenceStaff[]` (scopé tenant, inclut `residence_nom`).

#### `POST /api/equipe/personnel`
Body :
```jsonc
{
  "name": "string",
  "poste": "securite | ...",
  "residence_id": 1,
  "phone?": "string | null",
  "permissions": ["..."]
}
```
→ `data: ResidenceStaff`.

#### `PUT /api/equipe/personnel/:id`
Body (patch partiel) :
```jsonc
{
  "name?": "string",
  "poste?": "...",
  "residence_id?": 1,
  "phone?": "string | null",
  "permissions?": ["..."],
  "is_active?": true
}
```
→ `data: ResidenceStaff`.

#### `DELETE /api/equipe/personnel/:id`
→ `204` ou `{ status: "success" }`.

---

## 4. Notes d'intégration

- **Multi-tenant** : toutes les routes scopées au tenant du token. Un membre/staff d'un autre tenant → `404`.
- **Autorisation** : seuls `administrateur` (et éventuellement `gestionnaire`) devraient pouvoir gérer l'équipe — à confirmer avec la matrice de permissions (`parametres` ?).
- **Audit trail** : créations / suppressions de membres = `severity: 'sensitive'` (cf. `docs/sprint-4-conformite-legale.md`).
- **Mot de passe** : généré côté front (12 car., classes mixtes). Backend hashe + ne renvoie **jamais** le hash. Optionnel : forcer changement à la première connexion.
- Quand un endpoint est livré, mettre à jour `docs/api.md` et pinger Mouad pour la bascule `withMock` → réel.
