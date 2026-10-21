from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from backend.app.core.database import get_db
from backend.app.models.models import EvidenceUpload, Actor, Source
from backend.app.models.schemas import EvidenceUploadOut
from backend.app.evidence.verifier import evidence_verifier

router = APIRouter(prefix="/evidence", tags=["Evidence Deanonymization & Source Verification"])

@router.post("/verify")
async def verify_evidence_endpoint(
    file: Optional[UploadFile] = File(None),
    text_content: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Headline Feature: Traces uploaded report, document, photo, or text and answers:
    'Does this come from a trusted source, a known threat actor, or an unknown source?'
    with an explainable confidence score and cryptographic signals.
    """
    if not file and not text_content:
        raise HTTPException(status_code=400, detail="Please provide a file upload or text content to verify.")

    if file:
        content = await file.read()
        filename = file.filename or "uploaded_evidence.txt"
    else:
        content = (text_content or "").encode("utf-8")
        filename = "pasted_text_intel.txt"

    result = evidence_verifier.verify(
        db=db,
        filename=filename,
        content=content,
        manual_text=text_content
    )
    return result

@router.get("", response_model=List[EvidenceUploadOut])
def list_evidence_history(
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD or ISO)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD or ISO)"),
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Retrieves history of verified evidence items with optional timeline date filtering.
    """
    query = db.query(EvidenceUpload)

    if date_from:
        try:
            df = datetime.datetime.fromisoformat(date_from.replace("Z", "+00:00"))
            query = query.filter(EvidenceUpload.uploaded_at >= df)
        except Exception:
            pass

    if date_to:
        try:
            dt = datetime.datetime.fromisoformat(date_to.replace("Z", "+00:00"))
            query = query.filter(EvidenceUpload.uploaded_at <= dt)
        except Exception:
            pass

    records = query.order_by(EvidenceUpload.uploaded_at.desc()).limit(limit).all()
    
    out = []
    for r in records:
        out.append({
            "id": r.id,
            "filename": r.filename,
            "file_type": r.file_type,
            "sha256": r.sha256,
            "size": r.size,
            "uploaded_at": r.uploaded_at,
            "extracted_json": r.extracted_json or {},
            "signals_json": r.signals_json or [],
            "verdict": r.verdict,
            "trust_score": r.trust_score,
            "matched_source_id": r.matched_source_id,
            "matched_actor_id": r.matched_actor_id,
            "matched_source_name": r.source.name if r.source else None,
            "matched_actor_name": r.actor.primary_handle if r.actor else None
        })
    return out

@router.get("/{evidence_id}", response_model=EvidenceUploadOut)
def get_evidence_detail(evidence_id: int, db: Session = Depends(get_db)):
    """
    Fetches full forensic details for a single evidence upload.
    """
    r = db.query(EvidenceUpload).filter(EvidenceUpload.id == evidence_id).first()
    if not r:
        raise HTTPException(status_code=404, detail=f"Evidence upload #{evidence_id} not found.")

    return {
        "id": r.id,
        "filename": r.filename,
        "file_type": r.file_type,
        "sha256": r.sha256,
        "size": r.size,
        "uploaded_at": r.uploaded_at,
        "extracted_json": r.extracted_json or {},
        "signals_json": r.signals_json or [],
        "verdict": r.verdict,
        "trust_score": r.trust_score,
        "matched_source_id": r.matched_source_id,
        "matched_actor_id": r.matched_actor_id,
        "matched_source_name": r.source.name if r.source else None,
        "matched_actor_name": r.actor.primary_handle if r.actor else None
    }
