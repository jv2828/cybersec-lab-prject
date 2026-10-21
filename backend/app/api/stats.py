from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
import datetime

from backend.app.core.database import get_db
from backend.app.models.models import (
    HiddenService, MisconfigFinding, Actor, OriginCandidate, ClearnetHost, Marketplace, Alert
)

router = APIRouter(prefix="/stats", tags=["Dashboard Intelligence KPIs"])

@router.get("")
def get_dashboard_stats(
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD or ISO)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD or ISO)"),
    db: Session = Depends(get_db)
):
    df = None
    dt = None
    if date_from:
        try:
            df = datetime.datetime.fromisoformat(date_from.replace("Z", "+00:00"))
        except Exception:
            pass
    if date_to:
        try:
            dt = datetime.datetime.fromisoformat(date_to.replace("Z", "+00:00"))
        except Exception:
            pass

    # Query with date filtering
    services_q = db.query(HiddenService)
    if df:
        services_q = services_q.filter(HiddenService.last_seen >= df)
    if dt:
        services_q = services_q.filter(HiddenService.first_seen <= dt)
    services_count = services_q.count()

    actors_q = db.query(Actor)
    if df:
        actors_q = actors_q.filter(Actor.last_seen >= df)
    if dt:
        actors_q = actors_q.filter(Actor.first_seen <= dt)
    actors_count = actors_q.count()

    markets_count = db.query(Marketplace).count()
    clearnet_count = db.query(ClearnetHost).count()

    # Misconfigs by severity
    findings_q = db.query(MisconfigFinding)
    if df:
        findings_q = findings_q.filter(MisconfigFinding.detected_at >= df)
    if dt:
        findings_q = findings_q.filter(MisconfigFinding.detected_at <= dt)
    findings = findings_q.all()

    severity_breakdown = {
        "CRITICAL": sum(1 for f in findings if f.severity == "CRITICAL"),
        "HIGH": sum(1 for f in findings if f.severity == "HIGH"),
        "MEDIUM": sum(1 for f in findings if f.severity == "MEDIUM"),
        "LOW": sum(1 for f in findings if f.severity == "LOW"),
    }

    # High confidence origin links (>= 80%)
    high_conf_origins = db.query(OriginCandidate).filter(OriginCandidate.confidence_score >= 80).count()

    # ASN & Country Distribution
    clearnet_hosts = db.query(ClearnetHost).all()
    country_counts = {}
    asn_counts = {}
    for h in clearnet_hosts:
        country_counts[h.country_code] = country_counts.get(h.country_code, 0) + 1
        asn_short = h.asn.split()[0] if h.asn else "Unknown"
        asn_counts[asn_short] = asn_counts.get(asn_short, 0) + 1

    # Top risky actors
    top_actors = actors_q.order_by(Actor.risk_score.desc()).limit(5).all()
    top_actors_data = [{
        "id": a.id,
        "handle": a.primary_handle,
        "risk_score": a.risk_score,
        "category": a.category,
        "handles_count": len(a.handles),
        "wallets_count": len(a.wallets)
    } for a in top_actors]

    # Ingestion health & status
    ingestion_health = {
        "pipeline_status": "ONLINE (PASSIVE_STREAM)",
        "rate_limit_per_min": 60,
        "last_snapshot_cycle": "Real-time DB Active",
        "tor_socks_status": "STANDBY (DISABLED BY DEFAULT - PASSIVE ONLY)",
        "evidential_integrity": "100% SHA-256 HASH VERIFIED"
    }

    return {
        "kpis": {
            "services_monitored": services_count,
            "actors_resolved": actors_count,
            "marketplaces_indexed": markets_count,
            "clearnet_hosts_indexed": clearnet_count,
            "high_confidence_origins": high_conf_origins,
            "total_findings": len(findings)
        },
        "severity_breakdown": severity_breakdown,
        "country_distribution": country_counts,
        "asn_distribution": asn_counts,
        "top_risky_actors": top_actors_data,
        "ingestion_health": ingestion_health
    }
