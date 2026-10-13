from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.app.core.database import get_db
from backend.app.models.models import Actor, Handle, Wallet, PGPKey, RealWorldEntity, TrustEdge
from backend.app.models.schemas import ActorProfileOut

router = APIRouter(prefix="/actors", tags=["Threat Actor Profiles"])

@router.get("", response_model=List[ActorProfileOut])
def list_actors(db: Session = Depends(get_db)):
    actors = db.query(Actor).all()
    results = []
    for a in actors:
        handles = db.query(Handle).filter(Handle.actor_id == a.id).all()
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
            first_seen=a.first_seen,
            last_seen=a.last_seen,
            notes=a.notes or "",
            activity_timezone=a.activity_timezone,
            handles=handles_out,
            wallets=wallets_out,
            pgp_keys=pgp_keys,
            real_world_entities=rw_out,
            trust_links_count=len(handles) * 3,
            stylometry_summary=a.stylometry_profile or {}
        ))

    results.sort(key=lambda x: x.risk_score, reverse=True)
    return results

@router.get("/{actor_id}", response_model=ActorProfileOut)
def get_actor_profile(actor_id: str, db: Session = Depends(get_db)):
    actor = db.query(Actor).filter(Actor.id == actor_id).first()
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")

    handles = db.query(Handle).filter(Handle.actor_id == actor.id).all()
    wallets = db.query(Wallet).filter(Wallet.actor_id == actor.id).all()
    rw_entities = db.query(RealWorldEntity).filter(RealWorldEntity.actor_id == actor.id).all()

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

    return ActorProfileOut(
        id=actor.id,
        primary_handle=actor.primary_handle,
        risk_score=actor.risk_score,
        category=actor.category,
        first_seen=actor.first_seen,
        last_seen=actor.last_seen,
        notes=actor.notes or "",
        activity_timezone=actor.activity_timezone,
        handles=handles_out,
        wallets=wallets_out,
        pgp_keys=pgp_keys,
        real_world_entities=rw_out,
        trust_links_count=len(handles) * 3,
        stylometry_summary=actor.stylometry_profile or {}
    )
