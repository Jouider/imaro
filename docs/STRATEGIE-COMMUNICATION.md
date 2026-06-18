# 📡 Stratégie de Communication — Imaro

> **Objectif** : définir QUEL canal (Email / SMS / WhatsApp) part QUAND, à QUI, et POURQUOI — pour chaque événement métier du système.
>
> **Principes directeurs** :
> 1. **Email** = gratuit, asynchrone → pour les pros (manager, gestionnaire, conseil) et tout ce qui contient un PDF (reçus, convocations, PV)
> 2. **WhatsApp** = très peu cher, lu rapidement → canal principal pour la communauté (copros) au Maroc
> 3. **SMS** = cher (~0.20 MAD), mais preuve de réception → réservé à l'urgent + valeur légale
> 4. **Toujours le canal le plus universel pour la première invitation** (sinon l'utilisateur n'a pas accès à son code)

---

## 🆕 1. Setup & Onboarding

| Événement déclencheur | Qui reçoit ? | Canal idéal | Pourquoi |
|---|---|---|---|
| **Digitoyou crée un cabinet syndic** (super_admin → manager) | Manager (ex: Fikri) | 📧 Email | Email pro garanti, contient les credentials initiaux |
| **Manager crée un gestionnaire** (employé du cabinet) | Gestionnaire | 📧 Email | Employé professionnel |
| **Manager crée un membre du Conseil syndical** | Conseil | 📧 Email + 📱 SMS | Email principal + SMS avec lien d'activation (le conseil est élu, pas employé) |
| **Manager invite un copropriétaire** | Copropriétaire | 📱 SMS (+ 📧 Email si dispo) | Au Maroc, tout le monde a un mobile, pas tous un email — SMS = canal universel |
| **Reset password / code oublié** | Utilisateur | Même canal que son login | Cohérence |

> 💡 **Règle invariable** : la première invitation passe TOUJOURS par le canal le plus universel pour l'utilisateur cible, pour qu'il puisse récupérer son code initial.

---

## 💰 2. Argent & Recouvrement (le cœur business)

**Escalade progressive** : du moins cher (push/email/WA) au plus cher (SMS), selon l'urgence.

| Événement | Qui reçoit | Canal | Timing |
|---|---|---|---|
| **Nouvel appel de fonds émis** | Tous les copros | 📧 Email (avec PDF) + 💬 WhatsApp (avec lien) | À l'émission |
| **Paiement reçu → reçu PDF** | Le copro payeur | 📧 Email (PDF) | Automatique après encaissement |
| **Rappel J-3** (paiement dans 3 jours) | Copros pas encore payé | 💬 WhatsApp | Push doux |
| **Rappel J-1** | Copros pas encore payé | 💬 WhatsApp + 📧 Email | Plus pressant |
| **Rappel Jour J** (échéance aujourd'hui) | Copros pas encore payé | 💬 WhatsApp + 📧 Email | Critique |
| **Rappel en retard** (J+3, J+7, J+15…) | Copros en impayé | 💬 WhatsApp + 📧 Email | Escalade quotidienne |
| **Mise en demeure légale** (Art. 25 Loi 18-00, J+30) | Copro en impayé | 📱 SMS + 📧 Email | SMS = preuve de réception, valeur juridique |

> 💡 **Règle** : SMS coûte cher, on le réserve à **l'urgent à valeur légale**. WhatsApp + Email font 90% du travail de recouvrement.

---

## 🏛️ 3. Communauté & Vie de la copropriété

| Événement | Qui reçoit | Canal |
|---|---|---|
| **Annonce normale** (info travaux, fermeture piscine…) | Copros ciblés (par résidence ou immeuble) | 💬 WhatsApp |
| **Annonce urgente** (coupure d'eau, incendie, panne ascenseur) | Tous copros concernés | 💬 WhatsApp + 📱 SMS + 📧 Email |
| **Convocation Assemblée Générale** (15j avant, Art. 16quinquies) | Tous copros | 📧 Email (PDF convocation officielle) + 💬 WhatsApp (lien) |
| **Rappel AG J-1** | Copros qui n'ont pas confirmé présence | 💬 WhatsApp |
| **Résultats de vote AG** (PV signé) | Tous copros | 📧 Email (PV signé en PDF) |

> 💡 **Règle légale** : la convocation AG **DOIT** partir par email avec PDF horodaté (preuve du délai 15j Art. 16quinquies Loi 18-00).

---

## 🛠️ 4. Tickets / Réclamations

| Événement | Qui reçoit | Canal |
|---|---|---|
| **Copro déclare un ticket** | Le gestionnaire en charge | 💬 WhatsApp |
| **Gestionnaire répond** | Le copro qui a ouvert | 💬 WhatsApp |
| **Ticket clôturé** | Le copro | 💬 WhatsApp |
| **Ticket urgent** (ascenseur, incendie, fuite gaz…) | Manager + gestionnaire en charge | 💬 WhatsApp + 📱 SMS |

---

## ⚙️ 5. Alertes système (pour le manager/gestionnaire)

| Événement | Qui reçoit | Canal |
|---|---|---|
| **Contrat fournisseur expire dans 30j** | Manager | 📧 Email |
| **Solde compte bancaire < seuil** | Manager | 📧 Email + 💬 WhatsApp |
| **Dépense en attente de validation niveau 2** | Manager | 📧 Email |
| **Échéance fiscale / déclaration** | Manager | 📧 Email |

---

## 🏗️ Architecture technique — État et roadmap

### ✅ Déjà en place (PR #156 + #162)

- `NotificationManager` avec **fallback automatique** par canal
- 4 providers câblés aux vrais SDK :
  - 📧 **ResendEmailProvider** — sender per-tenant (`{subdomain}@imaro.ma`)
  - 💬 **TwilioWhatsAppProvider** — stub en attendant compte Twilio
  - 📱 **Sms8Provider** — opérationnel en réel via SMS8.io
  - 📱 **TwilioSmsProvider** — fallback international + numéros expat
- Logging systématique dans `notifications_log` (audit + analytics)
- Mode simulated quand credentials absents (CI/local)
- Migration future = édition de `config/notifications.php`, **zéro code**

### ⏳ À coder pour brancher les flows ci-dessus

| Brique | Pourquoi | Estimation |
|---|---|---|
| **`sendAll($message, channels: [...])`** | Envoyer simultanément sur plusieurs canaux (vs `send()` actuel mono-canal) | ~2h |
| **Respect des `notification_prefs`** (déjà en DB) | Skip + log `statut: skipped` si l'utilisateur a désactivé une catégorie | ~3h |
| **Templates centralisés par feature × canal × langue (FR/AR)** | Éviter de hardcoder les bodies dans 30 controllers | ~1j |
| **Jobs async (Horizon Queue)** | Envoyer 50 SMS d'un coup ne doit PAS bloquer la réponse API | ~3h |
| **Webhooks providers** (delivery tracking) | Mettre à jour `notifications_log.statut` (livré / lu / échec) à partir des callbacks Twilio, SMS8, Resend | ~1j |

### Total chantier : ~3-4 jours pour avoir une infra de notif production-ready couvrant les 5 parcours ci-dessus.

---

## 💸 Coût mensuel estimé par canal (10 clients, 200 copros chacun = 2000 copros)

Estimations basées sur l'usage prévu en régime de croisière (Phase 2 du plan d'infra).

| Canal | Volume mensuel estimé | Coût unitaire | Coût mensuel |
|---|---|---|---|
| 📧 Email (Resend Pro) | ~20 000 envois (appels de fonds + reçus + alertes) | gratuit jusqu'à 50k | **0 €** |
| 💬 WhatsApp (Twilio puis Meta direct en Phase 3) | ~10 000 conversations (rappels + annonces + tickets) | Twilio: ~0.04€/conv → Meta direct: gratuit jusqu'à 1000/numéro | **~50 € → ~5 €** |
| 📱 SMS Maroc (SMS8) | ~2 000 SMS/mois (mises en demeure + alertes urgentes) | 0.15-0.20 MAD/SMS | **~40 €** |
| 📱 SMS international (Twilio) | ~200 SMS/mois (copros expat) | ~0.10€/SMS | **~20 €** |
| **TOTAL communications** | | | **~115 €/mois** |

> 💡 La migration Twilio WhatsApp → **Meta Cloud API directe** en Phase 3 fait chuter la facture WhatsApp de ~50€ à ~5€/mois (1000 conv gratuites par numéro). C'est l'item le plus rentable du plan d'infra.

---

## 📊 Préférences utilisateur (déjà en DB)

La table `users.notification_prefs` (JSON) stocke 4 toggles déjà gérés par le frontend (`ProfilController`) :

```json
{
  "paiement": true,    // notifications appels de fonds + paiements + rappels
  "ticket": true,      // notifications tickets/réclamations
  "assemblee": true,   // convocations + résultats AG
  "retard": true       // rappels de retard
}
```

> ⚠️ **Aucune catégorie ne peut désactiver les notifications légales** (mise en demeure, convocation AG officielle). Ces envois passent toujours, peu importe les prefs.

---

## 🎯 Implémentation recommandée — Ordre

1. **Sprint 1 — Brique `sendAll` + respect des prefs** (1 jour)
   - Étend le `NotificationManager` avec une méthode multi-canal
   - Skip + log si l'utilisateur a désactivé la catégorie
2. **Sprint 2 — Templates FR/AR + Jobs async** (1.5 jour)
   - `config/notification-templates.php` avec arborescence `feature.canal.lang`
   - Variables par template (nom, montant, date, lien…)
   - Tous les envois passent par un `SendNotification` Job (Horizon)
3. **Sprint 3 — Câblage parcours par parcours** (2 jours)
   - Setup/Onboarding (8 events) — quick win visible immédiatement
   - Argent (7 events) — cœur business
   - Communauté (5 events) — module AG + Annonces
   - Tickets (4 events) — module 10
   - Alertes (4 events) — modules 9 + alertes système
4. **Sprint 4 — Webhooks delivery** (1 jour)
   - Callbacks Resend / Twilio / SMS8 pour update `notifications_log.statut`

**Total : ~6 jours** pour avoir TOUS les flows de communication du système opérationnels, monitorés, multi-canal, multi-langue, avec respect des prefs.

---

**Document version** : 1.0
**Dernière mise à jour** : Juin 2026
**Contact technique** : jouider.abdellah@gmail.com
