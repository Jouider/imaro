# 🏗️ Plan d'Infrastructure — Plateforme Copropriété

> **Objectif** : Démarrer économique, scaler intelligemment selon le volume réel de logins.
> **Principe directeur** : *"Code comme si vous aviez 10 clients, payez comme si vous en aviez 1."*

---

## 📊 Vue d'ensemble — Phases d'évolution

| Phase | Période | Logins/mois | Clients | Coût/mois | Coût MAD |
|-------|---------|-------------|---------|-----------|----------|
| **🚀 MVP** | Mois 1–3 | < 7 000 | 1 pilote | **~68 €** | ~720 MAD |
| **📈 Croissance** | Mois 4–6 | 7 000 – 20 000 | 2–3 | **~130 €** | ~1 400 MAD |
| **⚡ Scaling** | Mois 7–9 | 20 000 – 40 000 | 4–5 | **~280 €** | ~3 000 MAD |
| **🏢 Production multi-tenant** | Mois 10–12 | 40 000 – 70 000 | 6–10 | **~600 €** | ~6 400 MAD |

---

## 🚀 PHASE 1 — MVP (Mois 1–3)

**Cible : < 7 000 logins/mois, 1 client pilote**

### Stack technique

| Catégorie | Fournisseur | Plan | Coût/mois | Pourquoi |
|-----------|-------------|------|-----------|----------|
| **Hébergement** | Hostinger KVM2 | 2 vCPU / 8 Go RAM / 100 Go NVMe | 9 € | Déjà en place, suffisant pour 230 logins/jour |
| **Backup BDD** | Google Drive (gratuit) + rclone | 15 Go gratuit | 0 € | Cron pg_dump quotidien |
| **CDN / Sécurité** | Cloudflare | Free | 0 € | Cache + DDoS + WAF + SSL auto |
| **Email transactionnel** | Resend | Free tier (3 000 emails/mois) | 0 € | Excellente délivrabilité |
| **SMS Maroc** | SMS8.io | 1 device ($29) | ~27 € | Économique pour démarrer |
| **WhatsApp** | Twilio WhatsApp Business API | Pay-as-you-go | ~25 € | Setup 30 min, SDK unifié avec SMS |
| **SMS International** | Twilio | Pay-as-you-go | ~5 € | Fallback + expat (10%) |
| **Monitoring uptime** | UptimeRobot | Free (50 monitors) | 0 € | Ping toutes 5 min |
| **Monitoring erreurs** | Sentry | Free tier | 0 € | Capture erreurs Next.js |
| **Domaine** | Registrar .ma | Annuel | 2 € | |
| **TOTAL** | | | **~68 €/mois** | **~720 MAD** |

### ⚠️ Risques à mitiger
- **SMS8 = 1 SIM = SPOF** → Activer fallback automatique vers Twilio dans le code
- **Backup non testé** → Tester la restauration **avant** le 1er client en production
- **Pas de SLA WhatsApp Twilio** → Acceptable à ce volume

### ✅ Décisions techniques critiques (gratuites maintenant, vitales plus tard)
1. **Interface `NotificationProvider`** abstraite — permet de switcher de fournisseur en 1h
2. **Sessions JWT 30 jours** — divise les SMS OTP par 6
3. **`client_id` partout dans la BDD** — multi-tenant ready dès le jour 1
4. **Table `notification_log`** — traçage coûts + analytics
5. **Fallback automatique** SMS principal → Twilio si erreur

---

## 📈 PHASE 2 — Croissance (Mois 4–6)

**Cible : 7 000 – 20 000 logins/mois, 2–3 clients**

### Évolutions vs Phase 1

| Catégorie | Action | Impact coût |
|-----------|--------|-------------|
| **Hébergement** | KVM2 toujours OK (monitor CPU < 70%) | — |
| **Backup** | ➕ Ajouter **Backblaze B2** offsite (50 Go) | +3 € |
| **CDN** | Cloudflare Free toujours OK | — |
| **Email** | Resend Pro ($20) — dépassement free tier | +18 € |
| **SMS Maroc** | SMS8.io 5 devices ($89) si volume augmente | +55 € (vs phase 1) |
| **WhatsApp** | Twilio toujours OK (< 1500 conv/mois) | — |
| **Monitoring** | Sentry Team ($26) si plus de bugs | +24 € |
| **TOTAL** | | **~130 €/mois (~1 400 MAD)** |

### 🎯 Triggers de migration
- ➡️ **CPU VPS > 70% pendant 2 jours** → passer KVM2 → KVM4
- ➡️ **Disque > 70 Go** → upgrade KVM4
- ➡️ **1 SIM SMS8 bloquée** → migration IMMÉDIATE vers Mediatel
- ➡️ **Plainte délivrabilité** → tester Mediatel en parallèle

---

## ⚡ PHASE 3 — Scaling (Mois 7–9)

**Cible : 20 000 – 40 000 logins/mois, 4–5 clients**

### Migrations majeures

| Catégorie | AVANT | APRÈS | Coût/mois |
|-----------|-------|-------|-----------|
| **Hébergement** | KVM2 | **KVM4** (4 vCPU / 16 Go / 200 Go) | 16 € |
| **Base de données** | Sur KVM4 | **Séparer Redis** (cache sessions) | inclus |
| **SMS Maroc** | SMS8.io | **🔄 MIGRATION → Mediatel ou Inwi Business** (carrier-grade) | ~150 € |
| **WhatsApp** | Twilio | **🔄 MIGRATION → Meta Cloud API direct** | ~0 € (1000 conv. gratuites × N numéros) |
| **Email** | Resend Pro | Resend Pro maintenu | 18 € |
| **Backup** | Google Drive + B2 | **Backblaze B2 principal** + snapshots Hostinger | 5 € |
| **Monitoring** | Sentry Team | Sentry Team + **BetterStack** (logs + alertes) | +25 € |
| **CDN** | Cloudflare Free | Cloudflare **Pro** ($20) si attaques DDoS | +20 € |
| **Twilio** | SMS + WhatsApp | International uniquement + fallback | ~30 € |
| **TOTAL** | | | **~280 €/mois (~3 000 MAD)** |

### 🔄 Migrations critiques à planifier

**Migration #1 : SMS8 → Mediatel/Inwi (À FAIRE)**
- **Pourquoi** : > 3000 SMS/mois rend Mediatel rentable (0,15 MAD vs 0,20 MAD)
- **Quand** : Mois 7 ou dès qu'un SIM SMS8 est bloquée
- **Comment** : Grâce à l'interface `NotificationProvider`, c'est 1 ligne de config
- **Durée** : 1 journée (tests + bascule progressive)

**Migration #2 : Twilio WhatsApp → Meta Cloud API direct**
- **Pourquoi** : Économie ~150-300 €/mois à grande échelle (1000 conv./mois gratuites par numéro)
- **Quand** : > 1500 conversations WhatsApp/mois
- **Comment** : Nouveau provider `MetaWhatsAppProvider` dans l'interface existante
- **Durée** : 1-2 jours (incluant validation Meta Business)

### 🎯 Triggers vers Phase 4
- ➡️ **5ème client signé** → séparer la base de données
- ➡️ **RAM > 80%** → migration vers 2 VPS ou Supabase
- ➡️ **> 50 000 logins/mois** → architecture multi-serveurs

---

## 🏢 PHASE 4 — Production Multi-Tenant (Mois 10–12)

**Cible : 40 000 – 70 000 logins/mois, 6–10 clients**

### Architecture pro

| Catégorie | Solution | Coût/mois |
|-----------|----------|-----------|
| **Hébergement App** | Hostinger KVM4 (Next.js + Redis) | 16 € |
| **Base de données** | **OPTION A** : KVM4 dédié PostgreSQL — 17 € | 17 € |
| | **OPTION B** : Supabase Pro (managed) — 23 € | 23 € |
| **CDN + Sécurité** | Cloudflare Pro + WAF custom rules | 20 € |
| **Email** | Resend Pro + domaine dédié | 18 € |
| **SMS Maroc** | **Mediatel Business** (~22 000 SMS) | ~330 € |
| **SMS International** | Twilio (2 500 SMS) | ~30 € |
| **WhatsApp** | **Meta Cloud API direct** (10 numéros × 1000 conv. gratuites) | ~0–50 € |
| **Monitoring** | Sentry Team + BetterStack Pro | 50 € |
| **Backup** | Backblaze B2 (200 Go) + snapshots quotidiens | 10 € |
| **Domaines (10 clients ?)** | Sous-domaines `*.assil-syndic.ma` | 5 € |
| **Astreinte / DevOps** | Honoraires technique externe | ~50 € |
| **TOTAL** | | **~600 €/mois (~6 400 MAD)** |

### Architecture recommandée

```
┌─────────────────────────────────────────────┐
│  Cloudflare Pro (CDN + WAF + DDoS)          │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Hostinger KVM4 (App)                        │
│  • Next.js (PM2 cluster, 4 workers)          │
│  • Redis (cache + sessions)                  │
│  • Nginx reverse proxy                       │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Hostinger KVM4 (DB) ou Supabase Pro         │
│  • PostgreSQL 16                             │
│  • Backup auto quotidien                     │
│  • Read replica (optionnel)                  │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Providers externes (via NotificationProvider) │
│  • Mediatel (SMS Maroc)                      │
│  • Meta Cloud API (WhatsApp officiel)        │
│  • Twilio (international + fallback)         │
│  • Resend (email + PDF)                      │
│  • Backblaze B2 (storage docs)               │
└─────────────────────────────────────────────┘
```

---

## 📅 Calendrier de décisions — Récap

### 🎬 Semaine 1 (À FAIRE MAINTENANT)
- [ ] Créer compte Meta Business → WhatsApp Cloud API (gratuit, anticipation Phase 3)
- [ ] Créer compte Resend → vérifier DNS domaine
- [ ] Souscrire SMS8.io 1 device OU Mediatel pré-payé (500 MAD test)
- [ ] Créer compte Twilio (pay-as-you-go, ~20 € de crédit)
- [ ] Coder l'interface `NotificationProvider` ⭐ **CRITIQUE**
- [ ] Implémenter fallback automatique SMS
- [ ] Sessions JWT 30 jours
- [ ] Table `notification_log`
- [ ] `client_id` dans toutes les tables ⭐ **CRITIQUE**
- [ ] Cron backup PostgreSQL → Google Drive
- [ ] UptimeRobot + Sentry free
- [ ] Hardening sécurité VPS (UFW, fail2ban, SSH keys)
- [ ] Tester restauration backup sur staging
- [ ] Documenter variables d'env (README privé)

### 🎯 Triggers automatiques à monitorer

| Métrique | Seuil | Action |
|----------|-------|--------|
| CPU VPS | > 70% pendant 2j | Upgrade KVM2 → KVM4 |
| RAM | > 80% | Séparer DB ou Supabase |
| Disque | > 70 Go | Upgrade KVM4 ou nettoyage |
| SMS Maroc/mois | > 3 000 | Migration Mediatel |
| Conv WhatsApp/mois | > 1 500 | Migration Meta Cloud API direct |
| Clients signés | 3 | Sentry payant + Backblaze B2 |
| Clients signés | 5 | Séparer base de données |
| Clients signés | 8 | Mediatel + Meta + monitoring pro |
| SIM SMS8 bloquée | 1 fois | Migration immédiate Mediatel |
| Plainte délivrabilité | 1 | Audit SMS provider |

---

## 🔄 Stratégie de migration des fournisseurs

### Pourquoi cette stratégie marche

```
Mois 1 ──────► Mois 6 ──────► Mois 12

SMS:     SMS8.io ───────► Mediatel/Inwi (Phase 3)
         (~27 €)          (~150-330 €)
         
WhatsApp: Twilio WA ────► Meta Cloud API direct (Phase 3)
         (~25 €)          (~0-50 €)
         
DB:      Sur VPS ───────► VPS dédié OU Supabase (Phase 4)
         (inclus)         (+17-23 €)
         
Backup:  Google Drive ──► Backblaze B2 (Phase 2/3)
         (0 €)            (+3-10 €)
         
Monitor: UptimeRobot ───► + Sentry Team + BetterStack (Phase 3)
         (0 €)            (+50 €)
```

### Règle d'or
> **Aucune migration ne doit prendre plus d'1 journée** grâce à l'abstraction code faite en Phase 1.

---

## 💰 Récap budgétaire annuel

| Phase | Mois | Coût mensuel | Cumul phase | Cumul total |
|-------|------|--------------|-------------|-------------|
| MVP | 1–3 | 68 € | 204 € | 204 € |
| Croissance | 4–6 | 130 € | 390 € | 594 € |
| Scaling | 7–9 | 280 € | 840 € | 1 434 € |
| Production | 10–12 | 600 € | 1 800 € | **3 234 € / an** |

**Total année 1 : ~3 234 € (~34 500 MAD)** pour atteindre 10 clients en production.

### À l'échelle 10 clients
- Revenus estimés : 10 × ~3 000 MAD/mois × 12 = **360 000 MAD/an**
- Infrastructure : **34 500 MAD/an**
- **Ratio infra/CA : ~9,5%** → très confortable

---

## 📞 Contacts fournisseurs

| Service | URL | Contact |
|---------|-----|---------|
| Hostinger | hostinger.com | Support 24/7 chat |
| SMS8.io | sms8.io | support@sms8.io |
| Mediatel Maroc | mediatel.ma | À contacter pour devis Phase 3 |
| Inwi Business | inwi.ma/business | Account manager dédié |
| Twilio | twilio.com | console.twilio.com |
| Meta Business | business.facebook.com | Via Meta Business Manager |
| Resend | resend.com | support@resend.com |
| Cloudflare | cloudflare.com | dash.cloudflare.com |
| Backblaze B2 | backblaze.com/b2 | help@backblaze.com |
| Sentry | sentry.io | sentry.io/support |
| UptimeRobot | uptimerobot.com | Self-service |
| BetterStack | betterstack.com | Self-service |

---

## ✅ Checklist de validation Phase 1 → Phase 2

Avant de passer à la Phase 2, valider :

- [ ] Interface `NotificationProvider` testée avec 2 providers minimum
- [ ] Backup restauré avec succès au moins 1 fois
- [ ] Monitoring actif depuis 30 jours sans incident majeur
- [ ] 1 client pilote en production avec retour positif
- [ ] Logs `notification_log` exploitables (dashboard ou SQL)
- [ ] Documentation infra à jour
- [ ] 1 personne backup formée sur les accès admin

---

## 📝 Notes finales

### Ce qui est **VOLONTAIREMENT** simple en Phase 1
- Pas de Kubernetes
- Pas de microservices
- Pas de CI/CD complexe (git push + script de déploiement suffit)
- Pas de tests E2E exhaustifs (tests critiques uniquement)
- Pas de cache distribué (Redis arrive en Phase 3)

### Ce qui est **NON-NÉGOCIABLE** dès la Phase 1
- ✅ Backups quotidiens testés
- ✅ HTTPS partout
- ✅ Sessions sécurisées
- ✅ Logs des notifications
- ✅ Multi-tenant ready (`client_id`)
- ✅ Interface abstraite providers
- ✅ Monitoring uptime
- ✅ Fallback SMS automatique
- ✅ Documentation accès admin

---

**Document version** : 1.0
**Dernière mise à jour** : Juin 2026
**Contact technique** : jouider.abdellah@gmail.com
