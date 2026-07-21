# Imaro — Submission runbook (KAN-73 / KAN-74 / KAN-75)

Step-by-step to ship `ma.imaro.portail` to TestFlight/App Store and Play.
Run everything from `frontend/`. Apple Team ID: **6U4S82LM57**.

> Companion files: [`listings.md`](listings.md) (store copy),
> [`data-safety.md`](data-safety.md) (privacy forms).

---

## 0. Shared prep (do once per release)

1. **Version bump** (keep iOS and Android in sync):
   - iOS: Xcode → target → General → Version (`MARKETING_VERSION`) and Build (`CURRENT_PROJECT_VERSION`).
   - Android: `android/app/build.gradle` → `versionName` and `versionCode` (increment `versionCode` every upload).
   - First release: `1.0` / build `1` (current).
2. **Build the web bundle and sync native:**
   ```bash
   npm run build
   npx cap sync
   ```
3. **Demo account for review** (Apple AND Google require a working login):
   - Create a test résident (phone + a fixed/known OTP) on the backend — ask Abdellah.
   - Put the phone + OTP in the review notes of each store.
4. **Privacy policy is live**: https://imaro.ma/confidentialite (route shipped — confirm imaro.ma serves the SPA).

---

## 1. iOS — TestFlight → App Store (KAN-73)

1. `npx cap open ios` → Xcode.
2. **Signing & Capabilities**:
   - Team = 6U4S82LM57, Bundle ID = `ma.imaro.portail`, automatic signing.
   - Capabilities present: **Push Notifications**, **Associated Domains** (`applinks:imaro.ma`).
   - `aps-environment` is already `production` in `App.entitlements`.
3. **Device family** — for a faster first review, set the app to **iPhone-only**
   (target → General → Supported Destinations: remove iPad). Otherwise you must
   also provide iPad screenshots.
4. Scheme = **Any iOS Device (arm64)**, Release.
5. **Product → Archive** → Organizer → **Distribute App → App Store Connect → Upload**.
6. In **App Store Connect** (https://appstoreconnect.apple.com):
   - Create the app record (Bundle ID `ma.imaro.portail`) if it doesn't exist.
   - Fill listing from `listings.md` (name, subtitle, keywords, description, URLs).
   - Fill **App Privacy** labels from `data-safety.md`.
   - Upload screenshots (6.7" 1290×2796 required; 6.5" 1242×2688).
   - **App Review Information** → add the demo phone + OTP and a note: "Sign in with
     the provided phone number, request OTP, enter the code."
7. The build appears in **TestFlight** after processing → install on a real iPhone, smoke-test.
8. **Submit for Review**.

**Caveats**

- Push only functions once the APNs backend (KAN-68) is live; the capability can ship now.
- Universal Links verify only once `apple-app-site-association` is served at imaro.ma (KAN-71). Until then links open in-browser — harmless.

---

## 2. Android — AAB → Play internal test → production (KAN-74)

1. **Generate the upload key** (once), in `frontend/android/`:
   ```bash
   keytool -genkey -v -keystore imaro-upload.jks -keyalg RSA -keysize 2048 \
           -validity 10000 -alias imaro-upload
   ```
2. `cp keystore.properties.example keystore.properties` and fill in the passwords
   (gitignored — never commit).
3. **SHA-256 for App Links** (KAN-70/71): with **Play App Signing**, the fingerprint
   that goes into `assetlinks.json` is **Google's app-signing key**, found in
   Play Console → Test and release → App integrity → App signing. Send that SHA-256
   to Abdellah. (Your upload-key SHA-256 from `keytool -list -v -keystore imaro-upload.jks`
   is only needed if you also register it.)
4. **Build the signed AAB:**
   ```bash
   ./gradlew bundleRelease
   # → app/build/outputs/bundle/release/app-release.aab
   ```
5. In **Play Console** (https://play.google.com/console):
   - Create the app, select an **Internal testing** track, upload the AAB.
   - Complete the **store listing** from `listings.md` (+ feature graphic 1024×500, icon 512×512, ≥2 phone screenshots).
   - Complete the **Data safety** form from `data-safety.md`.
   - Complete the **content rating** questionnaire and set the **privacy policy URL**.
   - Add the demo account in the testing notes.
6. Roll out to **internal testing** → install on a real Android device, smoke-test.
7. Promote internal → **production** when QA passes.

---

## 3. Final QA checklist (real devices, iOS + Android) — KAN-75

- [ ] Login (OTP) and **biometric** unlock (Face ID / Touch ID / fingerprint)
- [ ] Accueil, Finances **+ online payment** (in-app browser returns to app), Réclamations, Profil
- [ ] QR / Visiteurs: generate + **native share**
- [ ] AI assistant responds
- [ ] **Camera** prompt appears with the purpose string and QR scan works
- [ ] Deep links open the app (once AASA/assetlinks deployed)
- [ ] **Arabic RTL** layout across all screens
- [ ] Splash + icon show the deep-navy branding
- [ ] Privacy policy opens from Profil → Confidentialité

---

## Status

| Item                             | State                            |
| -------------------------------- | -------------------------------- |
| iOS camera purpose string        | ✅ shipped                       |
| iOS aps-environment = production | ✅ shipped                       |
| Android CAMERA permission        | ✅ shipped                       |
| Android release signing config   | ✅ shipped (needs your keystore) |
| Privacy policy page (loi 09-08)  | ✅ shipped at /confidentialite   |
| Store listings FR/AR/EN          | ✅ drafted (`listings.md`)       |
| Privacy labels / Data safety     | ✅ drafted (`data-safety.md`)    |
| Screenshots                      | ⬜ capture on device             |
| Demo review account              | ⬜ backend (Abdellah)            |
| AASA / assetlinks on imaro.ma    | ⬜ backend KAN-71                |
| APNs / FCM backend (push)        | ⬜ backend KAN-68                |
| Archive + upload + submit        | ⬜ you (accounts ready)          |
