# Sellix Trace &bull; Dark Web Threat Actor Deanonymization Platform

> **Headline Mission:** Upload a suspicious report, text snippet, or image. Sellix Trace traces its footprints across dark web sources and answers: *"Does this come from a trusted source, a known threat actor, or an unknown source?"* with an explainable confidence score.

---

## ⚡ Quick Start

```bash
make run
```
*(Or `./run_demo.sh`)*

Once started:
- **Analyst Investigation App:** [http://127.0.0.1:8000/app/](http://127.0.0.1:8000/app/) *(Root `/` redirects straight here)*
- **Interactive API Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **About & Architecture Overview:** [http://127.0.0.1:8000/about](http://127.0.0.1:8000/about)

To run the automated test suite (all 20 tests pass):
```bash
make test
```

---

## 🧭 The 3 Things to Do First

1. **Verify Evidence:** Click the large **"Verify a file or text"** card on the Home screen. Paste an exploit message or upload an investigative document to test the headline deanonymization engine.
2. **Review Candidate Migrations:** Navigate to **Threat Actors**, select an actor (e.g. *ShadowBroker*), and inspect the **Suggested Persona Migration Links** panel to review and Accept/Reject AI-detected rebrands.
3. **Inspect Origin Matches:** Navigate to **Hidden Services**, select an onion service (e.g. *Alphabay V3 Mirror*), and evaluate the matched clearnet IP host candidate unmasked by TLS certificate and banner correlation.

---

## 🎬 5-Step Demo Walkthrough

### Step 1: Verify a Suspicious File
1. Click **Verify Evidence** in the top navbar.
2. In the text area, paste this intercepted vendor message:
   ```text
   Contact ShadowBroker for zero-day exploits.
   PGP: 0x4A89C2D1F9E3B7A50123456789ABCDEF01234567
   Escrow BTC: bc1qshadowbroker44918234812348912345678
   ```
3. Click **Trace & Deanonymize Evidence**.
4. Observe the red **THREAT ACTOR LINKED** badge, 98% confidence score, and explainable signal breakdown.

### Step 2: Open the Matched Actor Profile
1. On the verification result card, click the link: **`actor_shadow_broker (Inspect Actor Profile →)`**.
2. Examine the profile: Category (*Exploit Broker*), PGP keys, wallets ($420k volume), and attributed real-world individual (*Viktor K.*).
3. Review the **Behavioural Profile** 24-hour activity bar chart showing peak activity during Moscow/Eastern Europe evening hours (`UTC+3`).

### Step 3: View in the Relationship Graph
1. On the Threat Actors page, switch to the **Actor Relationship Graph** sub-tab.
2. Explore the interactive Cytoscape network connecting *ShadowBroker* across marketplaces (*AlphaBay*, *Nemesis*), crypto wallets, and real-world pivot nodes.

### Step 4: Filter by Timeline
1. In the header navbar, click the **Timeline Presets** (e.g., `30d` or `7d`), or enter custom `From` / `To` dates.
2. Notice how actor lists, service misconfigurations, and graph topologies dynamically recalculate according to the chosen timeframe.

### Step 5: Export Forensic Results
1. Navigate to **Export & Reports** (or click **Export Actors CSV** directly on the actor list).
2. Download standardized **CSV** or **JSON** extracts containing primary handles, PGP keys, wallets, and attribution confidence.
3. Click **Open Dossier Report** to review and print the publication-ready HTML threat intelligence brief.

---

## 🛡️ Synthetic Guardrails
- **100% Synthetic Data:** All IPs conform to RFC 5737 test prefixes (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`). All domains conform to RFC 2606 (`.example`, `.test`).
- **Autonomous Reliability Gate:** Autonomous crawler only ingests feeds from verified sources with `reliability_score >= 60` and `trusted = true`. Low-quality sources are skipped with logged audit rationales.
