from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import datetime

from backend.app.core.database import get_db
from backend.app.models.models import IngestRun, Source, HiddenService, Actor, MisconfigFinding
from backend.app.pipeline.engine import pipeline_engine

router = APIRouter(prefix="/pipeline", tags=["Continuous Ingestion Pipeline & Autonomous Mode"])

@router.get("/status")
def get_pipeline_status(db: Session = Depends(get_db)):
    """
    Returns real computed pipeline telemetry:
    - Autonomous mode ON/OFF state
    - Last 20 real IngestRun records from the database
    - Per-source reliability metrics
    - Real database ingestion KPIs
    """
    recent_runs = db.query(IngestRun).order_by(IngestRun.started_at.desc()).limit(20).all()
    sources = db.query(Source).all()

    runs_data = []
    for r in recent_runs:
        runs_data.append({
            "id": r.id,
            "job_name": r.job_name,
            "source_id": r.source_id,
            "source_name": r.source.name if r.source else "Global / Synthetic Feed",
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "finished_at": r.finished_at.isoformat() if r.finished_at else None,
            "items_ingested": r.items_ingested,
            "items_rejected": r.items_rejected,
            "status": r.status,
            "error": r.error
        })

    sources_data = []
    for s in sources:
        runs_for_source = [r for r in recent_runs if r.source_id == s.id]
        ingested_count = sum(r.items_ingested for r in runs_for_source)
        rejected_count = sum(r.items_rejected for r in runs_for_source)
        sources_data.append({
            "id": s.id,
            "name": s.name,
            "type": s.type,
            "reliability_score": s.reliability_score,
            "trusted": s.trusted,
            "last_scanned_at": s.last_scanned_at.isoformat() if s.last_scanned_at else None,
            "total_ingested": ingested_count,
            "total_rejected": rejected_count,
            "gated": bool(pipeline_engine.autonomous_enabled and (not s.trusted or s.reliability_score < 60.0))
        })

    services_count = db.query(HiddenService).count()
    actors_count = db.query(Actor).count()
    findings_count = db.query(MisconfigFinding).count()

    return {
        "autonomous_mode": pipeline_engine.autonomous_enabled,
        "worker_state": "RUNNING" if pipeline_engine.is_running_job else ("AUTONOMOUS_ACTIVE" if pipeline_engine.autonomous_enabled else "STANDBY"),
        "total_runs_recorded": db.query(IngestRun).count(),
        "recent_runs": runs_data,
        "sources_reliability": sources_data,
        "database_metrics": {
            "services_indexed": services_count,
            "actors_monitored": actors_count,
            "misconfigurations_detected": findings_count
        },
        "reliability_gate": {
            "min_reliability_threshold": 60.0,
            "require_trusted": True,
            "active": pipeline_engine.autonomous_enabled
        }
    }

@router.post("/autonomous")
def toggle_autonomous_mode(
    payload: Dict[str, bool] = Body(..., example={"enabled": True})
):
    """
    Enables or disables autonomous ingestion mode.
    When enabled, the pipeline strictly enforces the reliability gate (trusted=True, score >= 60).
    """
    enabled = payload.get("enabled", False)
    status = pipeline_engine.set_autonomous_mode(enabled)
    return {
        "status": "success",
        "autonomous_mode": status,
        "message": f"Autonomous mode has been {'ENABLED' if status else 'DISABLED'}."
    }

@router.post("/run-now")
def run_pipeline_now(db: Session = Depends(get_db)):
    """
    Triggers an immediate ingestion and correlation cycle across all disk feed files.
    """
    result = pipeline_engine.run_pipeline_cycle(db)
    return result
