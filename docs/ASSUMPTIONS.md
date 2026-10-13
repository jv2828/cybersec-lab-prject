# Design & Scoping Assumptions: Sellix Trace

## 1. Zero-Friction Standalone Execution
- **Database Engine**: Uses SQLite (`sqlite:///./sellix_trace.db`) via SQLAlchemy with write-ahead logging (WAL) for instant local setup with zero external daemon requirements. Can seamlessly target PostgreSQL by changing the `DATABASE_URL` environment variable.
- **Graph Engine**: Uses NetworkX for in-memory graph representation, shortest-path calculation, ego-network clustering, and community detection, encapsulated behind a clean `GraphStore` abstraction. This provides zero friction for local demos while allowing drop-in replacement with Neo4j if desired.
- **Async Workers**: Continuous background jobs and scheduled pipelines run via an embedded async worker task loop in FastAPI, avoiding mandatory Celery/Redis external daemon overhead during standalone demo runs while supporting external queues if configured.

## 2. Safe Synthetic Data
- **IP Addressing**: All synthetic clearnet origin servers use IP addresses strictly within RFC 5737 test ranges (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`).
- **Domain Names**: All synthetic domains use RFC 2606 reserved domains (`.example`, `.test`, `example.com`, `example.org`).
- **Onion Addresses**: All hidden service addresses are synthetic 56-character v3 `.onion` strings deterministically derived from seeded marketplace keys.
- **Passive-Only Ingestion**: The Tor SOCKS proxy crawler adapter is disabled by default (`TOR_CRAWLER_ENABLED=false`). The system operates purely in passive ingestion mode using local snapshot dumps, simulated feeds, and public certificate transparency datasets.

## 3. Human-in-the-Loop & Legal Evidentiary Standard
- **No Autonomous Attribution**: De-anonymization links and actor cluster merges remain in "proposed" or "candidate" status until an analyst explicitly reviews the signal breakdown and records an `accepted` or `rejected` judgment.
- **Chain of Custody**: Every evidence item calculates a SHA-256 integrity hash at ingestion time. Changes or analyst annotations are immutably appended to the audit log.
