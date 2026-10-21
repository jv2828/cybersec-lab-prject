import pytest
import io
import json
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.core.database import SessionLocal
from backend.app.models.models import Actor, Source, PersonaLink, IngestRun
from backend.app.pipeline.engine import pipeline_engine

client = TestClient(app)

def test_evidence_verdict_threat_actor_linked():
    """
    Acceptance Test: Uploading a file or text containing a seeded actor's PGP/wallet
    gives THREAT_ACTOR_LINKED with the actor named.
    """
    # Use seeded wallet of ShadowBroker
    malicious_text = "Urgent: send 0.5 BTC to bc1qshadowbroker44918234812348912345678 immediately."
    response = client.post(
        "/api/v1/evidence/verify",
        data={"text_content": malicious_text}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "THREAT_ACTOR_LINKED"
    assert data["matched_actor"] is not None
    assert "ShadowBroker" in data["matched_actor"]["primary_handle"]
    assert data["trust_score"] >= 85

def test_evidence_verdict_trusted_source():
    """
    Acceptance Test: Uploading a file from a known verified source gives TRUSTED_SOURCE.
    """
    trusted_text = "Official release bulletin from AlphaBay Market Feed [SYNTHETIC] authenticated intelligence."
    response = client.post(
        "/api/v1/evidence/verify",
        data={"text_content": trusted_text}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "TRUSTED_SOURCE"
    assert data["matched_source"] is not None
    assert "AlphaBay" in data["matched_source"]["name"]
    assert data["trust_score"] >= 75

def test_evidence_verdict_unknown():
    """
    Acceptance Test: An unrelated file gives UNKNOWN.
    """
    clean_text = "Meeting minutes for local gardening committee scheduled for next Tuesday afternoon."
    response = client.post(
        "/api/v1/evidence/verify",
        data={"text_content": clean_text}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "UNKNOWN"
    assert data["matched_actor"] is None
    assert data["matched_source"] is None
    assert data["trust_score"] <= 25

def test_persona_link_review_accept_and_reject():
    """
    Tests analyst human-in-the-loop review workflow for proposed persona migration links.
    """
    db = SessionLocal()
    try:
        # Find or create a PROPOSED persona link for idempotent testing
        pl = db.query(PersonaLink).filter(PersonaLink.status == "PROPOSED").first()
        if not pl:
            pl = PersonaLink(
                handle_id="h_specter_nem",
                actor_id="actor_shadow_broker",
                method="stylometry",
                score=74.0,
                status="PROPOSED",
                rationale={"reasons": ["Test stylometric similarity"]}
            )
            db.add(pl)
            db.commit()
            db.refresh(pl)
        link_id = pl.id
        target_actor_id = pl.actor_id
    finally:
        db.close()

    # ACCEPT link
    res = client.post(
        f"/api/v1/actors/persona-links/{link_id}/review",
        json={"action": "ACCEPT", "notes": "Verified identical stylometric patterns."}
    )
    assert res.status_code == 200
    assert res.json()["decision"] == "ACCEPTED"

    # Verify link updated in DB
    db = SessionLocal()
    try:
        updated_pl = db.query(PersonaLink).filter(PersonaLink.id == link_id).first()
        assert updated_pl.status == "ACCEPTED"
        assert updated_pl.reviewed_by == "Analyst Vance"
    finally:
        db.close()

def test_date_range_filtering():
    """
    Tests timeline querying parameters (date_from, date_to) across list endpoints and stats.
    """
    # 1. Stats with past date range
    res_stats = client.get("/api/v1/stats?date_from=2026-01-01&date_to=2026-12-31")
    assert res_stats.status_code == 200
    assert "kpis" in res_stats.json()

    # 2. Actors with date range
    res_actors = client.get("/api/v1/actors?date_from=2026-01-01&date_to=2026-12-31")
    assert res_actors.status_code == 200
    assert len(res_actors.json()) > 0

    # 3. Hidden services with date range
    res_services = client.get("/api/v1/services?date_from=2026-01-01&date_to=2026-12-31")
    assert res_services.status_code == 200
    assert len(res_services.json()) > 0

    # 4. Out-of-bounds future date range returns 0
    res_empty = client.get("/api/v1/actors?date_from=2030-01-01&date_to=2030-12-31")
    assert res_empty.status_code == 200
    assert len(res_empty.json()) == 0

def test_export_formats():
    """
    Tests CSV, JSON, and printable HTML dossier report exports.
    """
    # 1. Actors CSV
    res_csv = client.get("/api/v1/export/actors?format=csv")
    assert res_csv.status_code == 200
    assert "actor_id,primary_handle" in res_csv.text
    assert "ShadowBroker" in res_csv.text

    # 2. Actors JSON
    res_json = client.get("/api/v1/export/actors?format=json")
    assert res_json.status_code == 200
    actors_data = res_json.json()
    assert isinstance(actors_data, list)
    assert len(actors_data) > 0
    assert "primary_handle" in actors_data[0]

    # 3. Services CSV & JSON
    res_svc_csv = client.get("/api/v1/export/services?format=csv")
    assert res_svc_csv.status_code == 200
    assert "onion_address,service_name" in res_svc_csv.text

    res_svc_json = client.get("/api/v1/export/services?format=json")
    assert res_svc_json.status_code == 200
    assert isinstance(res_svc_json.json(), list)

    # 4. Evidence CSV & JSON
    res_ev_csv = client.get("/api/v1/export/evidence?format=csv")
    assert res_ev_csv.status_code == 200

    # 5. Printable HTML Report
    res_report = client.get("/api/v1/export/report")
    assert res_report.status_code == 200
    assert "SELLIX TRACE" in res_report.text
    assert "THREAT INTELLIGENCE DOSSIER" in res_report.text
    assert "Print / Save as PDF" in res_report.text

def test_autonomous_mode_reliability_gate():
    """
    Acceptance Test: Autonomous mode toggled ON ingests feed files and strictly
    skips low-reliability sources (score < 60 or trusted=False) with a logged reason.
    """
    # Toggle autonomous mode ON
    res_toggle = client.post("/api/v1/pipeline/autonomous", json={"enabled": True})
    assert res_toggle.status_code == 200
    assert res_toggle.json()["autonomous_mode"] is True

    # Run pipeline now
    res_run = client.post("/api/v1/pipeline/run-now")
    assert res_run.status_code == 200
    run_data = res_run.json()
    assert run_data["status"] == "success"
    assert run_data["autonomous_mode"] is True
    assert run_data["items_rejected"] > 0, "Low reliability source must be rejected by gate"

    # Verify pipeline status endpoint shows real IngestRun records
    res_status = client.get("/api/v1/pipeline/status")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert status_data["autonomous_mode"] is True
    assert len(status_data["recent_runs"]) > 0
    assert any("REJECTED_BY_GATE" in r["status"] for r in status_data["recent_runs"])
