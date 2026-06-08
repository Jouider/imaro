# Brief backend — Assistance recouvrement (service payant délégué)

**De :** Mouad (frontend) · **Pour :** Abdellah (backend)
**Feature :** `feat/frontend-assistance-recouvrement` — nouvelle page
`/gestionnaire/assistance-recouvrement` · PR #180 · issue #179
**État frontend :** UI complète + service `assistanceRecouvrement.service.ts`
câblé sur l'endpoint ci-dessous (early-return mock en dev, fallback
`mailto:recouvrement@imaro.ma`). Bascule = l'endpoint répond → le mock disparaît
(retirer le `if (import.meta.env.DEV) return mock`).

## Contexte

Service **optionnel payant** distinct du tool opérationnel `/recouvrement`
(mise en demeure / pénalités / prescription que le syndic exécute **lui-même**).

Ici, le syndic **délègue** tout le recouvrement à l'équipe Imaro :
**syndics bénévoles** et **nouvelles sociétés de gestion** sans personnel
dédié. Le formulaire génère une **demande** qui doit :

1. partir en **e-mail** vers l'équipe IT → **`recouvrement@imaro.ma`** ;
2. être **persistée** pour un **suivi complet et structuré** (statut, tenant,
   contact, horodatage).

Enveloppe API standard attendue : `{ status, message?, data, errors? }`.
Route sous le préfixe **`/api/gestionnaire/`** (gardée comme les autres routes
gestionnaire, accessible managers + gestionnaires).

## Conformité loi 18-00 (le service couvre toute la chaîne légale)

La page présente — et le service doit honorer — les **étapes légales** du
recouvrement des charges de copropriété, dans l'ordre :

| # | Étape | Base légale |
| - | ----- | ----------- |
| 1 | Appel de fonds | Loi 18-00 art. 25 (provisions / budget voté en AG) |
| 2 | Relance amiable (SMS / WhatsApp / e-mail) | — (préalable au contentieux) |
| 3 | **Mise en demeure** (LRAR, J+30) | Loi 18-00 **art. 25** ; le SMS/LRAR vaut **preuve de réception** |
| 4 | Injonction de payer | Code de procédure civile marocain |
| 5 | Tribunal de première instance | Code de procédure civile marocain |
| 6 | Exécution du jugement | Voies d'exécution |

**Règles de conformité à respecter côté backend / process :**

- **Prescription quinquennale** : les créances de charges se prescrivent à
  **5 ans** sans acte interruptif (Loi 18-00 + Code des obligations marocain).
  Toute demande d'assistance doit être traitée **avant** ce délai → le champ
  `impayes_estimate` et le suivi servent à prioriser les dossiers à risque
  (cf. `prescription_risks` dans `GET /api/residences/:id/recouvrement`).
- **Décision en AG préalable** : les pénalités de retard ne sont exigibles que
  **votées en AG** (art. 25). L'assistance n'invente pas de pénalités — elle
  s'appuie sur la config existante (`penalty_configs.ag_approved_at`).
- **Mise en demeure horodatée** : conserver une preuve datée (LRAR / SMS) ;
  c'est le point de départ du contentieux et un acte **interruptif de
  prescription**.

> Réf. : `docs/sprint-4-conformite-legale.md` §3.5 (prescription) et
> `docs/STRATEGIE-COMMUNICATION.md` (Art. 25 Loi 18-00, mise en demeure J+30).

## Endpoint requis

### `POST /api/gestionnaire/assistance-recouvrement`

Crée une demande d'assistance, **envoie l'e-mail IT** et **persiste** la demande.

**Payload (exactement ce que le front envoie — `AssistanceRequestPayload`) :**

```jsonc
{
  "contactName": "Mouad Test",        // requis
  "contactPhone": "+212600000000",    // requis
  "contactEmail": "contact@blanca.ma",// requis
  "syndicName": "Syndic Blanca",      // requis
  "residencesCount": "3",             // optionnel (string numérique)
  "impayesEstimate": "120 000 DH",    // optionnel (texte libre)
  "plan": "complet",                  // essentiel | complet | sur_mesure
  "message": "…"                      // optionnel
}
```

**Validation :** `contactName`, `contactPhone`, `contactEmail` (email valide),
`syndicName` requis ; `plan` ∈ `{essentiel, complet, sur_mesure}`.

**Réponse (`AssistanceRequestResult`) :**

```jsonc
{
  "status": "success",
  "data": { "reference": "AR-7F3K9Q" }  // identifiant lisible, unique
}
```

`reference` : préfixe `AR-` + 6 caractères base36 majuscules (le front en génère
un en mock — le backend devient la source de vérité une fois livré).

## E-mail vers l'équipe IT

- Destinataire : **`recouvrement@imaro.ma`**.
- Canal : **Resend** (même intégration que la notif de bienvenue copro,
  `CoproprietaireWelcomeNotifier`), expéditeur `{subdomain}@imaro.ma`.
- Objet suggéré : `Demande d'assistance recouvrement — {syndicName}`.
- Corps : récap structuré (syndic, contact, tél, e-mail, nb résidences, impayés
  estimés, formule, message) + `reference` + tenant + date.
- `Reply-To` : `contactEmail` du demandeur (pour répondre directement).

## Persistance (suivi structuré)

Table suggérée `assistance_requests` :

| Colonne | Type | Note |
| ------- | ---- | ---- |
| `id` | bigint PK | |
| `tenant_id` | FK | scope multi-tenant |
| `reference` | string unique | `AR-XXXXXX` |
| `contact_name` | string | |
| `contact_phone` | string | |
| `contact_email` | string | |
| `syndic_name` | string | |
| `residences_count` | string null | |
| `impayes_estimate` | string null | |
| `plan` | enum | `essentiel\|complet\|sur_mesure` |
| `message` | text null | |
| `status` | enum | `nouvelle\|en_cours\|qualifiee\|convertie\|refusee` (défaut `nouvelle`) |
| `created_by` | FK user | l'utilisateur connecté |
| `created_at` / `updated_at` | timestamp | |

> Le workflow de statut permet le **suivi complet** demandé : `nouvelle` à la
> création → `en_cours` quand l'IT prend contact → `qualifiee` après cadrage →
> `convertie` (abonnement signé) ou `refusee`.

## Formules (abonnement) — pour cohérence des libellés

| `plan` | Libellé | Portée légale couverte |
| ------ | ------- | ---------------------- |
| `essentiel` | Essentiel | amiable → **mise en demeure** (étapes 1-3) |
| `complet` | Complet | + **injonction de payer** (étapes 1-4) |
| `sur_mesure` | Sur mesure | + **tribunal** & **exécution** (étapes 1-6) |

## Sécurité / conformité données

- Scope tenant strict (un syndic ne voit que ses demandes).
- Les données contact sont des **données personnelles** (loi 09-08 / CNDP) :
  ne pas les exposer hors tenant, durée de conservation raisonnable.

## (Optionnel — phase 2) Suivi côté app

Si on veut afficher l'historique des demandes au gestionnaire :

```
GET   /api/gestionnaire/assistance-recouvrement        // liste des demandes du tenant
GET   /api/gestionnaire/assistance-recouvrement/{ref}  // détail + statut
```

Hors scope du MVP (issue #179) — à voir séparément si besoin.

---

**Bascule front :** dès que `POST /api/gestionnaire/assistance-recouvrement`
répond, retirer l'early-return mock dans
`frontend/src/services/assistanceRecouvrement.service.ts`.
