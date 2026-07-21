# Imaro — Privacy labels & Data safety (KAN-73 / KAN-74)

Answers for **App Store privacy nutrition labels** and **Play Console Data safety**,
derived from the actual app behaviour and `/confidentialite` (loi 09-08).

**Global facts**

- No data is used for **tracking** or **advertising**.
- No data is **sold** or shared with third parties for their own use.
- Data **in transit is encrypted** (HTTPS).
- Users can **request deletion** via contact@imaro.ma.
- **Biometrics are NOT collected** — Face ID / Touch ID / fingerprint are verified
  locally by the OS; the app never receives or stores biometric data.
- **Payment card data is NOT collected** — online payment opens the provider in an
  in-app browser; the app never sees card details.

---

## App Store — Privacy nutrition labels

**Data used to track you:** None.

**Data linked to you** (collected, linked to identity, "App Functionality"):

| Category       | Type                                      |
| -------------- | ----------------------------------------- |
| Contact Info   | Name, Phone Number, Email Address         |
| Financial Info | Payment history / balances (no card data) |
| User Content   | Photos (visitor photos, when used)        |
| Identifiers    | User ID / session token                   |
| Diagnostics    | Crash data, performance/logs              |

**Data not linked to you:** none beyond the above (diagnostics may be reported
without identity depending on backend config — default to _linked_ to be safe).

---

## Google Play — Data safety

**Data collected** (not shared with third parties):

| Play category          | Data type                  | Collected | Optional? | Purpose                               |
| ---------------------- | -------------------------- | --------- | --------- | ------------------------------------- |
| Personal info          | Name                       | Yes       | Required  | App functionality, Account management |
| Personal info          | Email address              | Yes       | Required  | App functionality, Account management |
| Personal info          | Phone number               | Yes       | Required  | App functionality, Account management |
| Financial info         | Purchase / payment history | Yes       | Required  | App functionality                     |
| Photos and videos      | Photos                     | Yes       | Optional  | App functionality (visitor access)    |
| App activity           | App interactions           | Yes       | Optional  | Analytics / App functionality         |
| App info & performance | Crash logs, Diagnostics    | Yes       | Optional  | App functionality                     |

**Security practices**

- Data is encrypted in transit: **Yes**
- Users can request data deletion: **Yes** (contact@imaro.ma)
- Committed to Play Families policy: N/A (not directed at children)

**Permissions rationale (for review notes)**

- `CAMERA` — scan access QR codes and capture visitor photos, on user action only.
- Face ID usage string — unlock the app with biometrics (local only).
