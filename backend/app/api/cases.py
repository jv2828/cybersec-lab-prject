import hashlib
import json
import datetime
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from backend.app.core.database import get_db
from backend.app.models.models import Case, CaseEvidence, AuditLog
from backend.app.models.schemas import CaseCreate, CaseEvidenceAdd

router = APIRouter(prefix="/cases", tags=["Case Management & Evidence Custody"])

@router.get("")
def list_cases(db: Session = Depends(get_db)):
    cases = db.query(Case).all()
    results = []
    for c in cases:
        ev_count = db.query(CaseEvidence).filter(CaseEvidence.case_id == c.id).count()
        results.append({
            "id": c.id,
            "title": c.title,
            "status": c.status,
            "priority": c.priority,
            "assigned_analyst": c.assigned_analyst,
            "summary": c.summary,
            "tags": c.tags_json or [],
            "evidence_count": ev_count,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat()
        })
    results.sort(key=lambda x: x["created_at"], reverse=True)
    return results

@router.post("")
def create_case(req: CaseCreate, db: Session = Depends(get_db)):
    new_id = f"CASE-{datetime.datetime.now(datetime.timezone.utc).year}-{len(db.query(Case).all()) + 1:04d}"
    c = Case(
        id=new_id,
        title=req.title,
        status="ACTIVE",
        assigned_analyst="Special Agent Vance",
        priority=req.priority,
        summary=req.summary,
        tags_json=req.tags
    )
    db.add(c)
    
    audit = AuditLog(
        user_name="Special Agent Vance",
        action="CREATE_CASE",
        target_type="CASE",
        target_id=new_id,
        details=f"Opened case dossier: {req.title}"
    )
    db.add(audit)
    db.commit()

    return {"status": "success", "case_id": new_id, "case": {
        "id": c.id, "title": c.title, "priority": c.priority, "status": c.status
    }}

@router.get("/{case_id}")
def get_case_detail(case_id: str, db: Session = Depends(get_db)):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")

    evidence = db.query(CaseEvidence).filter(CaseEvidence.case_id == case_id).all()
    ev_out = [{
        "id": e.id,
        "entity_type": e.entity_type,
        "entity_id": e.entity_id,
        "title": e.title,
        "sha256_hash": e.sha256_hash,
        "details": e.details_json,
        "added_at": e.added_at.isoformat()
    } for e in evidence]

    return {
        "id": c.id,
        "title": c.title,
        "status": c.status,
        "priority": c.priority,
        "assigned_analyst": c.assigned_analyst,
        "summary": c.summary,
        "tags": c.tags_json or [],
        "evidence": ev_out,
        "created_at": c.created_at.isoformat(),
        "updated_at": c.updated_at.isoformat()
    }

@router.post("/{case_id}/evidence")
def attach_evidence(case_id: str, req: CaseEvidenceAdd, db: Session = Depends(get_db)):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")

    # Compute deterministic SHA-256 chain-of-custody fingerprint
    raw_payload = f"{case_id}:{req.entity_type}:{req.entity_id}:{req.title}:{json.dumps(req.details, sort_keys=True)}"
    sha256_hash = hashlib.sha256(raw_payload.encode()).hexdigest()

    ev = CaseEvidence(
        case_id=case_id,
        entity_type=req.entity_type,
        entity_id=req.entity_id,
        title=req.title,
        sha256_hash=sha256_hash,
        details_json=req.details
    )
    db.add(ev)
    
    audit = AuditLog(
        user_name="Special Agent Vance",
        action="ATTACH_EVIDENCE",
        target_type="CASE",
        target_id=case_id,
        details=f"Appended evidence [{req.entity_type}] '{req.title}' with SHA-256 hash {sha256_hash[:16]}..."
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "evidence_id": ev.id,
        "sha256_hash": sha256_hash,
        "message": "Evidence successfully sealed and attached to case dossier"
    }

@router.get("/{case_id}/report")
def export_investigation_report(case_id: str, db: Session = Depends(get_db)):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")

    evidence = db.query(CaseEvidence).filter(CaseEvidence.case_id == case_id).all()
    timestamp_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    # Generate printable HTML report
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Investigation Dossier: {c.id}</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0c0d0e; color: #e2e8f0; margin: 0; padding: 40px; line-height: 1.6; }}
  .header {{ border-bottom: 2px solid #a78bfa; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-start; }}
  .badge {{ background: #2e1065; color: #c084fc; border: 1px solid #7c3aed; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; }}
  .classification {{ color: #ef4444; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; font-size: 13px; }}
  h1 {{ margin: 8px 0 4px 0; color: #ffffff; font-size: 26px; }}
  .meta {{ color: #94a3b8; font-size: 14px; }}
  .section {{ background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 24px; margin-bottom: 24px; }}
  .section h2 {{ margin-top: 0; color: #a78bfa; font-size: 18px; border-bottom: 1px solid #27272a; padding-bottom: 8px; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }}
  th, td {{ text-align: left; padding: 10px; border-bottom: 1px solid #27272a; }}
  th {{ color: #94a3b8; background: #27272a; }}
  .hash {{ font-family: monospace; color: #38bdf8; word-break: break-all; font-size: 12px; }}
  .methodology {{ font-size: 13px; color: #cbd5e1; }}
  @media print {{ body {{ background: #fff; color: #000; padding: 20px; }} .section {{ background: #fff; border: 1px solid #ccc; }} th {{ background: #eee; color: #000; }} }}
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="classification">LAW ENFORCEMENT SENSITIVE // OFFICIAL INVESTIGATION DOSSIER</div>
      <h1>Sellix Trace: Case Intelligence Report</h1>
      <div class="meta">Case Reference: <strong>{c.id}</strong> | Lead Investigator: <strong>{c.assigned_analyst}</strong> | Generated: <strong>{timestamp_str}</strong></div>
    </div>
    <div class="badge">{c.priority} PRIORITY // {c.status}</div>
  </div>

  <div class="section">
    <h2>1. Executive Summary & Objective</h2>
    <p><strong>Case Title:</strong> {c.title}</p>
    <p>{c.summary}</p>
    <p><strong>Associated Tags:</strong> {', '.join(c.tags_json or ['None'])}</p>
  </div>

  <div class="section">
    <h2>2. Evidentiary Chain of Custody (Cryptographically Sealed)</h2>
    <p>All items ingested and correlated by Sellix Trace are fingerprinted with SHA-256 checksums at acquisition time to guarantee evidentiary integrity.</p>
    <table>
      <thead>
        <tr>
          <th>Evidence Item</th>
          <th>Type</th>
          <th>Entity Identifier</th>
          <th>SHA-256 Digest</th>
          <th>Acquisition Date</th>
        </tr>
      </thead>
      <tbody>
        {"".join([f'''<tr>
          <td><strong>{e.title}</strong></td>
          <td>{e.entity_type}</td>
          <td><code>{e.entity_id}</code></td>
          <td class="hash">{e.sha256_hash}</td>
          <td>{e.added_at.strftime('%Y-%m-%d %H:%M:%S UTC')}</td>
        </tr>''' for e in evidence])}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>3. De-anonymization & Attribution Methodology</h2>
    <div class="methodology">
      <p>Attribution in this dossier leverages a tripartite correlation matrix:</p>
      <ul>
        <li><strong>Tor Hidden-Service Misconfiguration:</strong> Direct matching of TLS certificate SHA-256 fingerprints, web server diagnostic dumps (mod_status), and Favicon MurmurHash3 against clearnet scan telemetry.</li>
        <li><strong>Cross-Marketplace Entity Resolution:</strong> Graph-based clustering linking pseudonymous vendor handles via shared 4096-bit PGP key fingerprints, reused cryptocurrency deposit addresses, and lexical stylometry cosine similarity.</li>
        <li><strong>Financial & Clearnet Footprint Corroboration:</strong> Tracing cryptocurrency transaction flow to KYC-verified exchange deposits and matching technical handles with clearweb software repositories.</li>
      </ul>
    </div>
  </div>

  <div class="section">
    <h2>4. Legal Caveats & Operational Guardrails</h2>
    <div class="methodology">
      <p>All intelligence presented herein was gathered via passive, non-intrusive monitoring without unauthorized computer access, active exploitation, or traffic analysis attacks. De-anonymization scores represent probabilistic confidence metrics. In accordance with platform operational guardrails, manual analyst review and judicial subpoena verification are required prior to enforcement action.</p>
    </div>
  </div>
</body>
</html>"""

    return Response(content=html_content, media_type="text/html")
