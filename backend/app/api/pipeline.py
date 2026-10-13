from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import datetime
from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.models import AuditLog, Alert

router = APIRouter(prefix="/pipeline", tags=["Continuous Ingestion Pipeline & Worker Monitoring"])

@router.get("/status")
def get_pipeline_status():
    return {
        "worker_state": "ACTIVE_IDLE",
        "active_jobs": [
            {
                "id": "job_passive_monitor_01",
                "name": "Onion Snapshot Ingestion & Misconfig Scanner",
                "interval": "Every 5 minutes",
                "last_run": "2 minutes ago",
                "status": "HEALTHY",
                "items_processed": 40
            },
            {
                "id": "job_entity_resolver_02",
                "name": "Cross-Marketplace Persona Cluster Resolution",
                "interval": "Every 15 minutes",
                "last_run": "8 minutes ago",
                "status": "HEALTHY",
                "items_processed": 150
            },
            {
                "id": "job_origin_correlator_03",
                "name": "Clearnet Infrastructure Correlation Engine",
                "interval": "Continuous Streaming",
                "last_run": "Just now",
                "status": "HEALTHY",
                "items_processed": 8
            }
        ],
        "guardrails": {
            "tor_socks_crawler_enabled": settings.TOR_CRAWLER_ENABLED,
            "authorized_investigation_flag": settings.AUTHORIZED_INVESTIGATION_FLAG,
            "passive_ingestion_mode": True,
            "proactive_probing_blocked": True,
            "rate_limit": "1 request / 5 seconds per domain"
        }
    }

@router.post("/trigger-simulated-crawl")
def trigger_simulated_crawl(db: Session = Depends(get_db)):
    # Record synthetic pipeline execution
    audit = AuditLog(
        user_name="Special Agent Vance",
        action="TRIGGER_PASSIVE_INGESTION",
        target_type="PIPELINE",
        target_id="ALL_FEEDS",
        details="Triggered passive snapshot batch update cycle"
    )
    db.add(audit)
    
    # Create notification alert
    al = Alert(
        alert_type="PIPELINE_CYCLE",
        title="Passive Snapshot Batch Completed",
        description="Scanned 40 hidden services. Verified 12 high-severity misconfigurations against clearnet telemetry.",
        severity="INFO",
        status="UNREAD",
        metadata_json={"batch_size": 40, "timestamp": str(datetime.datetime.now(datetime.timezone.utc))}
    )
    db.add(al)
    db.commit()

    return {
        "status": "success",
        "message": "Passive crawler snapshot refresh executed successfully",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }
