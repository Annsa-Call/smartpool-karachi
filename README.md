# SmartPool v2.0 – AI-Powered Smart Carpooling System (Karachi, Pakistan)

Zero-cost, privacy-first, NADRA CNIC KYC-verified peer-to-peer commuter carpooling platform engineered for Karachi corridors (Shahrah-e-Faisal, Gulshan-e-Iqbal, Saddar, Clifton, DHA, Iqra University, Korangi, Nazimabad). Deployable directly on **Cloudflare Pages** and ready for **CapacitorJS Android (`.apk`)** packaging.

## Key Capabilities (Modules A–G)

- **Module A — Universal 4-Step Citizen KYC Onboarding (Zero Institutional Email Lock-In):**
  - Pakistani SIM OTP verification (`+92`), NADRA 13-digit CNIC OCR scanning, and biometric face-match liveness.
  - **Immutable Backend Gender Isolation:** Derives citizen gender strictly from the NADRA CNIC 13th digit (`even = Female`, `odd = Male`) and locks it permanently. Every listing, pool query, seat booking, approval request, and peer chat enforces strict `Female-to-Female` and `Male-to-Male` KYC matching.
- **Module B — Production Role-Based Workspaces & 2D Right-Hand-Drive Cabin Engine:**
  - **Passenger Mode:** `Find Pool`, `My Ride`, `Wallet & CO2`, `Profile` (rates publishers, pays via escrow/cash, inspects street-corner Virtual Meeting Points).
  - **Publisher Mode:** `Publish`, `Requests`, `Drive Live`, `Earnings`, `Profile` (publishes KYC gender-locked pools, approves/declines requests, manages 2D RHD cabin seats, confirms On-Cash handovers, withdraws zero-commission payouts, rates co-riders).
- **Module C — Zero-API-Key Interactive Karachi Maps & Virtual Meeting Point:**
  - Powered by Leaflet + free, watermark-free **Esri World Street Map** (`Street HD`) and **OpenStreetMap** (`OSM`) with 1-tap style switching and automatic `tileerror` failover (zero API keys required, works in browsers and Android WebViews).
  - Projects inner-street (*gali*) home pins onto main Karachi arterial street corners to protect home address privacy and minimize driver detours.
- **Module D — Live GPS Telemetry, Anti-Spoofing & Emergency SOS:**
  - Dual-device BLE in-cabin proximity verification (`1.4m`), road-map snapping vs. raw GPS jitter toggle, E2E masked-phone peer chat, and a 3-second cancellable Emergency SOS protocol (Sindh Police Madadgar 15 + Family WhatsApp + Control Unit).
- **Module E — Non-Profit Cost-Recovery Ledger & Pakistani Gateways:**
  - Zero-surge, zero-profit fuel + maintenance cost-sharing across occupants, simulated **Easypaisa** & **JazzCash** digital escrow holds, **On-Cash** publisher confirmation, and append-only PostgreSQL-style SHA-256 receipts.
- **Module F — Smog Reduction, Carbon Credit Marketplace & Live NLP Sentiment:**
  - 4-solo-cars vs. 1-pool CO2 comparison, per-user redeemable partner vouchers, and real-time NLP behavioral sentiment scoring on bidirectional reviews.
- **Module G — Password-Protected System Control Unit (Admin Panel):**
  - Locked behind administrator credential verification (`123456`) with brute-force attempt throttling and session lock/sign-out. Includes city-wide corridor map, KYC gender-isolation audit, CNIC verification queue, SOS/escrow dispute resolution, and ledger audit.

---

## Local Development

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # Type-checks & builds static bundle into dist/
npm run preview   # Preview production build
```

### Seeded Demo Accounts (Citizen Passcode: `112233`)
- **Female Verified Citizens:** Ayesha Siddiqui (`42201-8491023-4`), Dr. Hira Kamal (`42301-6712390-2`)
- **Male Verified Citizens:** Ahmed Hassan Ali (`42101-7382910-3`), Kamran Siddiqui (`42201-5192837-5`)
- Or register any new citizen through the 4-step SIM OTP + 13-digit CNIC OCR + Biometric KYC flow.
- **Admin Control Unit Password:** `123456`

---

## Deploy to Cloudflare Pages

### Option A — Git Repository (Recommended, Auto-Deploy on Push)
1. Push this project folder to a **GitHub** or **GitLab** repository.
2. In the **Cloudflare Dashboard**, go to **Workers & Pages** → **Create** → **Pages** → **Connect to Git** and select your repo.
3. Configure build settings:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Environment variable** (optional — `.node-version` is already set to `22`): `NODE_VERSION` = `22`
4. Click **Save and Deploy**. SPA routing (`public/_redirects`) and tile referrer headers (`public/_headers`) are applied automatically.

### Option B — Direct Upload / Wrangler CLI (No Git Needed)
```bash
npm install
npm run build
npx wrangler pages deploy dist --project-name=smartpool-karachi
```
*(Or drag-and-drop the generated `dist/` folder in Cloudflare Dashboard → Workers & Pages → Create → Pages → Upload assets.)*

---

## Build Android `.apk` with CapacitorJS

```bash
npm install @capacitor/android
npm run build
npx cap add android
npm run cap:sync
npm run cap:open   # Opens Android Studio -> Build > Build APK(s)
```
