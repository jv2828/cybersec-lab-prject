# Sellix Trace: 3-Minute Guided Demo Script

This script walks judges and evaluators through the end-to-end de-anonymization and threat-intelligence investigation workflow.

---

## Pre-flight: Starting the Platform
Run the single command:
```bash
./run_demo.sh
# or
make demo
```
*(This automatically clears any port conflicts, ensures the Python environment and synthetic seeds are loaded, builds the React app, and opens your browser.)*

Open your browser at:
- **Landing Page:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Investigation App:** [http://127.0.0.1:8000/app/](http://127.0.0.1:8000/app/)
- **API Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## Step 1: Spec-Compliant Landing Page (0:00 &ndash; 0:45)
1. **Visual Polish:** Notice the deep black obsidian palette (`#080808`), glowing violet accents (`#a78bfa`), ambient particle network canvas in the background, and clean typography.
2. **Breakpoints:** Resize your browser below $1160\text{px}$ to observe the responsive mobile hamburger drawer.
3. **Action:** Click **"Launch Platform"** or **"Open Investigation App"** to transition seamlessly into `/app`.

---

## Step 2: Capability 1 &mdash; Hidden Service Misconfiguration Analyzer (0:45 &ndash; 1:30)
1. Click the **"Hidden Services"** tab in the top navigation.
2. Select **"ShadowGate Vault & Stash"** (`shadowgate991abcde...onion`).
3. **Detector Findings:** Review the detected leaks:
   - `RULE_MOD_STATUS` (Critical): Exposed Apache server-status page disclosing virtual host `shadowgate-cloud.example.org` and internal worker state.
   - `RULE_TLS_CLEARNET_CERT` (Critical): TLS certificate leaf SHA-256 fingerprint matches clearnet domain `origin-proxy01.host-node.example.org`.
4. **Origin Matcher:** Review the top origin candidate:
   - **Host:** `198.51.100.44` (AS16276 OVH SAS, France).
   - **Confidence Score:** **98% (High Confidence)**.
   - **Match Matrix:** See individual signal weights (+35 TLS Cert, +30 Clearnet SAN Domain, +30 Leaked IP, +15 Clock Skew).
5. **Human-in-the-Loop Analyst Verification:** Click the white pill button **"Accept Origin"**. Notice the live status update and audit trail entry!

---

## Step 3: Capability 2 &mdash; Cross-Marketplace Actor Graph (1:30 &ndash; 2:15)
1. Click the **"Actor Graph"** tab.
2. **Interactive Cytoscape Visualizer:** Observe the color-coded force-directed relationship graph:
   - Violet: Resolved Actors
   - Cyan: Marketplace Handles
   - Emerald: 4096-bit PGP Keys
   - Amber: Cryptocurrency Wallets
   - Red: Real-World Suspect Identities
   - Blue: Clearnet Origin IPs
3. **Shortest Pathfinder:** In the right panel under *Investigative Path Finder*:
   - Enter Source: `hs_shadowgate`
   - Enter Target: `host_fr_ovh`
   - Click **"Trace Connection Path"** &mdash; see the direct forensic route highlighted through the graph!
4. Click node **`GhostVendor`** to inspect attributes and click **"Expand 2-Hop Ego"** to isolate the syndicate's immediate perimeter.

---

## Step 4: Capability 3 &mdash; Actor Dossier, Real-World Pivots & Reporting (2:15 &ndash; 3:00)
1. Click the **"Threat Actors"** tab and inspect **`GhostVendor`**:
   - See how 3 handles across AlphaBay (`GhostVendor`), Nemesis (`PhantomSec_EU`), and TorVend (`CipherX_Direct`) were merged via shared PGP key `0x98A1...` and wallet `bc1qxy2kgd...`.
   - Review the stylometric vocabulary richness and posting timezone (`UTC+1`).
   - Notice the attributed suspect: **Mikhail 'Ghost' Volkov** (Estonia / Remote) linked via PGP commit author and a 14.5 BTC deposit to a KYC Kraken account.
2. Click **"Cases & Dossiers"** and select **`CASE-2026-0881: Operation GhostTrace`**:
   - Inspect the **Evidentiary Chain of Custody table** showing cryptographically sealed SHA-256 digests.
   - Click **"Export Official Dossier"** &mdash; opens the printable, law-enforcement sensitive investigation report with full methodology, graph evidence, and legal guardrail statements!
