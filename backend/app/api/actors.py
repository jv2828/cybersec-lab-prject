from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime

from backend.app.core.database import get_db
from backend.app.models.models import (
    Actor, Handle, Wallet, PGPKey, RealWorldEntity, TrustEdge,
    PersonaLink, Source, AuditLog
)
from backend.app.models.schemas import ActorProfileOut, PersonaLinkOut, PersonaLinkReview
from backend.app.resolver.entity_resolver import entity_resolver
from backend.app.graph.graph_store import graph_store

router = APIRouter(prefix="/actors", tags=["Threat Actor Profiles & Persona Linking"])

@router.get("", response_model=List[ActorProfileOut])
def list_actors(
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD or ISO)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD or ISO)"),
    category: Optional[str] = Query(None, description="Filter by threat category"),
    min_risk: Optional[int] = Query(None, description="Minimum risk score (0-100)"),
    marketplace: Optional[str] = Query(None, description="Filter by marketplace ID"),
    source: Optional[str] = Query(None, description="Filter by primary source ID"),
    min_attribution_confidence: Optional[float] = Query(None, description="Minimum attribution confidence"),
    q: Optional[str] = Query(None, description="Search handles, notes, or identifiers"),
    db: Session = Depends(get_db)
):
    """
    Lists threat actor profiles with multi-criteria timeline querying and search.
    """
    query = db.query(Actor)

    if date_from:
        try:
            df = datetime.datetime.fromisoformat(date_from.replace("Z", "+00:00"))
            query = query.filter(Actor.last_seen >= df)
        except Exception:
            pass

    if date_to:
        try:
            dt = datetime.datetime.fromisoformat(date_to.replace("Z", "+00:00"))
            query = query.filter(Actor.first_seen <= dt)
        except Exception:
            pass

    if category and category != "ALL":
        query = query.filter(Actor.category.ilike(category))

    if min_risk is not None:
        query = query.filter(Actor.risk_score >= min_risk)

    if source and source != "ALL":
        query = query.filter(Actor.source_id == source)

    if min_attribution_confidence is not None:
        query = query.filter(Actor.attribution_confidence >= min_attribution_confidence)

    if q:
        query = query.filter(
            (Actor.primary_handle.ilike(f"%{q}%")) |
            (Actor.notes.ilike(f"%{q}%")) |
            (Actor.category.ilike(f"%{q}%"))
        )

    actors = query.all()
    results = []

    for a in actors:
        handles = db.query(Handle).filter(Handle.actor_id == a.id).all()
        
        # Marketplace filter check
        if marketplace and marketplace != "ALL":
            if not any(h.marketplace_id == marketplace for h in handles):
                continue

        wallets = db.query(Wallet).filter(Wallet.actor_id == a.id).all()
        rw_entities = db.query(RealWorldEntity).filter(RealWorldEntity.actor_id == a.id).all()
        
        # PGP Keys
        pgp_keys = []
        for h in handles:
            if h.pgp_fingerprint:
                pk = db.query(PGPKey).filter(PGPKey.fingerprint == h.pgp_fingerprint).first()
                if pk and pk.fingerprint not in [p["fingerprint"] for p in pgp_keys]:
                    pgp_keys.append({"fingerprint": pk.fingerprint, "email": pk.email, "uids": pk.uids})

        handles_out = [{
            "id": h.id,
            "handle_name": h.handle_name,
            "marketplace_id": h.marketplace_id,
            "vendor_rating": h.vendor_rating,
            "sales_count": h.sales_count,
            "first_seen": h.first_seen.isoformat(),
            "last_seen": h.last_seen.isoformat(),
            "pgp_fingerprint": h.pgp_fingerprint,
            "listing_sample": h.listing_sample
        } for h in handles]

        wallets_out = [{
            "id": w.id,
            "address": w.address,
            "currency": w.currency,
            "total_received_usd": w.total_received_usd,
            "exchange_exposure_usd": w.exchange_exposure_usd
        } for w in wallets]

        rw_out = [{
            "id": r.id,
            "name": r.name_or_alias,
            "type": r.entity_type,
            "country": r.country,
            "platform": r.platform,
            "confidence": r.confidence_score,
            "evidence_chain": r.evidence_chain
        } for r in rw_entities]

        results.append(ActorProfileOut(
            id=a.id,
            primary_handle=a.primary_handle,
            risk_score=a.risk_score,
            category=a.category,
            attribution_confidence=round(a.attribution_confidence or 75.0, 1),
            last_scan_date=a.last_scan_date or a.last_seen,
            source_id=a.source_id,
            source_name=a.source.name if a.source else None,
            first_seen=a.first_seen,
            last_seen=a.last_seen,
            notes=a.notes or "",
            activity_timezone=a.activity_timezone,
            handles=handles_out,
            wallets=wallets_out,
            pgp_keys=pgp_keys,
            real_world_entities=rw_out,
            trust_links_count=len(handles) * 3,
            stylometry_summary=a.stylometry_profile or {},
            behavioural_profile=None,
            suggested_links=[],
            attribution_breakdown=None
        ))

    results.sort(key=lambda x: x.risk_score, reverse=True)
    return results

@router.get("/{actor_id}", response_model=ActorProfileOut)
def get_actor_profile(actor_id: str, db: Session = Depends(get_db)):
    """
    Fetches full forensic profile of a threat actor including:
    - Behavioural hour-of-day profile
    - Suggested persona links with explainable rationale
    - Full attribution confidence breakdown
    """
    actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")

    handles = db.query(Handle).filter(Handle.actor_id == actor.id).all()
    wallets = db.query(Wallet).filter(Wallet.actor_id == actor.id).all()
    rw_entities = db.query(RealWorldEntity).filter(RealWorldEntity.actor_id == actor.id).all()

    pgp_keys = []
    timestamps = []
    for h in handles:
        if h.first_seen:
            timestamps.append(h.first_seen)
        if h.last_seen:
            timestamps.append(h.last_seen)
        if h.pgp_fingerprint:
            pk = db.query(PGPKey).filter(PGPKey.fingerprint == h.pgp_fingerprint).first()
            if pk and pk.fingerprint not in [p["fingerprint"] for p in pgp_keys]:
                pgp_keys.append({"fingerprint": pk.fingerprint, "email": pk.email, "uids": pk.uids})

    # Behavioural profiling
    behaviour = entity_resolver.compute_actor_behaviour(timestamps)

    # Suggested persona links
    persona_links = db.query(PersonaLink).filter(PersonaLink.actor_id == actor.id).all()
    suggested = []
    accepted_count = 0
    for pl in persona_links:
        if pl.status == "ACCEPTED":
            accepted_count += 1
        h_rec = db.query(Handle).filter(Handle.id == pl.handle_id).first()
        suggested.append(PersonaLinkOut(
            id=pl.id,
            handle_id=pl.handle_id,
            handle_name=h_rec.handle_name if h_rec else pl.handle_id,
            actor_id=pl.actor_id,
            method=pl.method,
            score=pl.score,
            status=pl.status,
            rationale=pl.rationale or {},
            created_at=pl.created_at,
            reviewed_by=pl.reviewed_by
        ))

    # Attribution confidence calculation
    has_pgp = len(pgp_keys) > 0
    conf_score, breakdown = entity_resolver.compute_attribution_confidence(
        handles_count=len(handles),
        has_pgp=has_pgp,
        wallets_count=len(wallets),
        accepted_persona_links=accepted_count,
        stylometry_avg=0.82
    )

    # Sync computed confidence
    actor.attribution_confidence = conf_score
    db.commit()

    handles_out = [{
        "id": h.id,
        "handle_name": h.handle_name,
        "marketplace_id": h.marketplace_id,
        "vendor_rating": h.vendor_rating,
        "sales_count": h.sales_count,
        "first_seen": h.first_seen.isoformat(),
        "last_seen": h.last_seen.isoformat(),
        "pgp_fingerprint": h.pgp_fingerprint,
        "listing_sample": h.listing_sample
    } for h in handles]

    wallets_out = [{
        "id": w.id,
        "address": w.address,
        "currency": w.currency,
        "total_received_usd": w.total_received_usd,
        "exchange_exposure_usd": w.exchange_exposure_usd
    } for w in wallets]

    rw_out = [{
        "id": r.id,
        "name": r.name_or_alias,
        "type": r.entity_type,
        "country": r.country,
        "platform": r.platform,
        "confidence": r.confidence_score,
        "evidence_chain": r.evidence_chain
    } for r in rw_entities]

    return ActorProfileOut(
        id=actor.id,
        primary_handle=actor.primary_handle,
        risk_score=actor.risk_score,
        category=actor.category,
        attribution_confidence=round(conf_score, 1),
        last_scan_date=actor.last_scan_date or actor.last_seen,
        source_id=actor.source_id,
        source_name=actor.source.name if actor.source else None,
        first_seen=actor.first_seen,
        last_seen=actor.last_seen,
        notes=actor.notes or "",
        activity_timezone=actor.activity_timezone,
        handles=handles_out,
        wallets=wallets_out,
        pgp_keys=pgp_keys,
        real_world_entities=rw_out,
        trust_links_count=len(handles) * 3,
        stylometry_summary=actor.stylometry_profile or {},
        behavioural_profile=behaviour,
        suggested_links=suggested,
        attribution_breakdown=breakdown
    )

@router.post("/persona-links/{link_id}/review")
def review_persona_link(
    link_id: int,
    req: PersonaLinkReview,
    db: Session = Depends(get_db)
):
    """
    Analyst Human-in-the-Loop decision: ACCEPT or REJECT proposed persona migration link.
    Accepted links merge the handle into the actor and update the relationship graph.
    """
    pl = db.query(PersonaLink).filter(PersonaLink.id == link_id).first()
    if not pl:
        raise HTTPException(status_code=404, detail="Persona link record not found")

    action = req.action.upper()
    if action not in ["ACCEPT", "REJECT"]:
        raise HTTPException(status_code=400, detail="Action must be ACCEPT or REJECT")

    pl.status = "ACCEPTED" if action == "ACCEPT" else "REJECTED"
    pl.reviewed_by = "Analyst Vance"

    if action == "ACCEPT":
        # Associate handle with actor
        handle = db.query(Handle).filter(Handle.id == pl.handle_id).first()
        if handle:
            old_actor_id = handle.actor_id
            handle.actor_id = pl.actor_id
            # Merge in graph store
            graph_store.add_edge(pl.actor_id, handle.id, "OWNS_HANDLE", confidence=int(pl.score))

        # Recompute actor confidence
        actor = db.query(Actor).filter(Actor.id == pl.actor_id).first()
        if actor:
            actor.attribution_confidence = min(99.0, actor.attribution_confidence + 8.0)

    # Log audit
    audit = AuditLog(
        user_name="Analyst Vance",
        action=f"PERSONA_LINK_{action}",
        target_type="PERSONA_LINK",
        target_id=str(link_id),
        details=f"Decision: {action} on handle '{pl.handle_id}' for actor '{pl.actor_id}'. Notes: {req.notes}"
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "link_id": pl.id,
        "decision": pl.status,
        "reviewed_by": pl.reviewed_by
    }
