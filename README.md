# Sellix Trace &mdash; Dark Web Threat Intelligence &amp; De-anonymization Platform

**Sellix Trace** is a law-enforcement-grade threat-intelligence platform that de-anonymizes dark web threat actors by correlating passive hidden-service footprints with clearnet infrastructure and real-world identities.

---

## ⚡ Quick Start (One Command)

### Using Makefile
```bash
make demo
```

### Using Docker Compose
```bash
docker compose up
```

Once started, navigate to:
- **Landing Page:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Investigation Web App:** [http://127.0.0.1:8000/app/](http://127.0.0.1:8000/app/)
- **OpenAPI Documentation:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 🛡️ Guardrails & Synthetic Safety (Non-Negotiable)
- **100% Synthetic Demo Data:** All IPs reside within RFC 5737 reserved test ranges (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`). All hostnames use RFC 2606 reserved domains (`.example`, `.test`, `example.com`).
- **Passive-Only Ingestion:** Active network probing, exploitation, brute forcing, and traffic analysis attacks are strictly excluded. The Tor SOCKS proxy crawler is disabled by default (`TOR_CRAWLER_ENABLED=false`).
- **Explainable & Human-in-the-Loop:** Every link calculates an explainable 0–100 confidence score with contributing signal weights. No attribution is auto-committed without analyst review (`ACCEPT` / `REJECT`).
- **Cryptographic Chain of Custody:** Every evidence item computes an immutable SHA-256 integrity hash at ingestion time.

---

## 📐 Architecture
- **Backend:** Python FastAPI, SQLite (embedded with WAL for friction-free local runs, configurable to PostgreSQL), SQLAlchemy ORM, Pydantic v2, NetworkX Graph Engine.
- **Frontend App (`/app`):** React 18, TypeScript, Vite, Cytoscape.js with physics layouts, Recharts, Lucide Icons, Obsidian dark glass aesthetics (`#080808`, `#141416`, `#a78bfa`).
- **Landing Page (`index.html`):** Spec-compliant single-file presentation page matching `docs/ui-spec.md` with ambient generative canvas background, mobile drawer at $\le 1160\text{px}$, and `prefers-reduced-motion` compliance.

---

## 🔍 Core Capabilities
1. **Tor Hidden Service Misconfiguration Analyzer:**
   - 10 rule-based detectors: `RULE_MOD_STATUS`, `RULE_PHPINFO`, `RULE_BANNER_LEAK`, `RULE_TLS_CLEARNET_CERT`, `RULE_IP_HOSTNAME_BODY`, `RULE_FAVICON_HASH`, `RULE_HEADER_ORDER`, `RULE_TIME_SKEW_UPTIME`, `RULE_MIXED_CONTENT`, `RULE_EXIF_METADATA`.
   - Clearnet Origin Matcher with weighted multi-signal scoring matrix and explanation panel.
2. **Cross-Marketplace Actor Graph:**
   - Resolves handles across ~6 darknet markets into consolidated actor syndicates using 4096-bit PGP fingerprints, reused cryptocurrency wallets, lexical stylometry cosine similarity, and activity time zones.
   - Force-directed Cytoscape canvas with ego-network expansion, shortest pathfinding, and GraphML export.
3. **Real-World Pivots, Continuous Pipeline & Reporting:**
   - KYC exchange flow tracking, suspect persona cards, continuous ingestion monitor, and one-click court-ready investigation dossiers.

---

## 🧪 Testing
Run the complete automated test suite:
```bash
make test
```
Or directly:
```bash
PYTHONPATH=. ./backend/venv/bin/pytest backend/tests
```
