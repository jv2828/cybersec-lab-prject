from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
from backend.app.core.database import get_db
from backend.app.models.models import HiddenService, ServiceSnapshot, MisconfigFinding, OriginCandidate, AuditLog
from backend.app.models.schemas import (
    HiddenServiceSummary, HiddenServiceDetail, CandidateReviewRequest, OriginCandidateOut
)

router = APIRouter(prefix="/services", tags=["Hidden Services & Origin Matcher"])

@router.get("", response_model=List[HiddenServiceSummary])
def list_hidden_services(
    marketplace_id: Optional[str] = None,
    min_risk: Optional[int] = 0,
    has_origin_match: Optional[bool] = False,
    db: Session = Depends(get_db)
):
    query = db.query(HiddenService)
    if marketplace_id:
        query = query.filter(HiddenService.marketplace_id == marketplace_id)
    if min_risk:
        query = query.filter(HiddenService.risk_score >= min_risk)

    services = query.all()
    results = []
    for s in services:
        findings_cnt = db.query(MisconfigFinding).filter(MisconfigFinding.service_id == s.id).count()
        candidates = db.query(OriginCandidate).filter(OriginCandidate.service_id == s.id).all()
        top_conf = max([c.confidence_score for c in candidates], default=0)
        
        if has_origin_match and top_conf < 70:
            continue

        results.append(HiddenServiceSummary(
            id=s.id,
            onion_address=s.onion_address,
            name=s.name,
            marketplace_id=s.marketplace_id,
            status=s.status,
            risk_score=s.risk_score,
            first_seen=s.first_seen,
            last_seen=s.last_seen,
            findings_count=findings_cnt,
            top_origin_confidence=top_conf
        ))
    
    # Sort by risk score and top confidence descending
    results.sort(key=lambda x: (x.top_origin_confidence, x.risk_score), reverse=True)
    return results

@router.get("/{service_id}", response_model=HiddenServiceDetail)
def get_hidden_service_detail(service_id: str, db: Session = Depends(get_db)):
    service = db.query(HiddenService).filter(HiddenService.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Hidden service not found")

    snapshots = db.query(ServiceSnapshot).filter(ServiceSnapshot.service_id == service_id).all()
    findings = db.query(MisconfigFinding).filter(MisconfigFinding.service_id == service_id).all()
    candidates = db.query(OriginCandidate).filter(OriginCandidate.service_id == service_id).all()

    candidates_out = []
    for c in candidates:
        ch_dict = None
        if c.clearnet_host:
            ch_dict = {
                "id": c.clearnet_host.id,
                "ip_address": c.clearnet_host.ip_address,
                "hostname": c.clearnet_host.hostname,
                "asn": c.clearnet_host.asn,
                "asn_org": c.clearnet_host.asn_org,
                "country_code": c.clearnet_host.country_code,
                "banner": c.clearnet_host.banner,
                "favicon_hash": c.clearnet_host.favicon_hash,
                "cert_fingerprint": c.clearnet_host.cert_fingerprint
            }
        candidates_out.append(OriginCandidateOut(
            id=c.id,
            service_id=c.service_id,
            clearnet_host_id=c.clearnet_host_id,
            confidence_score=c.confidence_score,
            status=c.status,
            match_matrix=c.match_matrix,
            rationale=c.rationale,
            created_at=c.created_at,
            reviewed_at=c.reviewed_at,
            reviewer=c.reviewer,
            clearnet_host=ch_dict
        ))

    snaps_out = []
    for s in snapshots:
        snaps_out.append({
            "id": s.id,
            "status_code": s.status_code,
            "response_time_ms": s.response_time_ms,
            "headers": s.headers_json,
            "body_sample": s.body_sample,
            "cert_data": s.cert_data,
            "favicon_hash": s.favicon_hash,
            "banners": s.banners,
            "captured_at": s.captured_at.isoformat() if s.captured_at else None,
            "content_hash": s.content_hash
        })

    return HiddenServiceDetail(
        id=service.id,
        onion_address=service.onion_address,
        name=service.name,
        marketplace_id=service.marketplace_id,
        status=service.status,
        risk_score=service.risk_score,
        first_seen=service.first_seen,
        last_seen=service.last_seen,
        snapshots=snaps_out,
        findings=findings,
        candidates=candidates_out
    )

@router.post("/{service_id}/candidates/{candidate_id}/review")
def review_origin_candidate(
    service_id: str,
    candidate_id: int,
    req: CandidateReviewRequest,
    db: Session = Depends(get_db)
):
    candidate = db.query(OriginCandidate).filter(
        OriginCandidate.id == candidate_id,
        OriginCandidate.service_id == service_id
    ).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    new_status = "ACCEPTED" if req.action.upper() == "ACCEPT" else "REJECTED"
    candidate.status = new_status
    candidate.reviewed_at = datetime.datetime.now(datetime.timezone.utc)
    candidate.reviewer = "Special Agent Vance"
    
    # Audit log entry
    audit = AuditLog(
        user_name="Special Agent Vance",
        action=f"{new_status}_ORIGIN_CANDIDATE",
        target_type="ORIGIN_CANDIDATE",
        target_id=str(candidate_id),
        details=f"Analyst {new_status} candidate {candidate.clearnet_host_id} for service {service_id}. Notes: {req.notes}"
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "candidate_id": candidate_id,
        "new_status": new_status,
        "message": f"Candidate successfully {new_status.lower()} with audit trail."
    }
