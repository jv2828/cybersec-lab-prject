from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from backend.app.core.database import get_db
from backend.app.models.models import RealWorldEntity, Actor, Wallet

router = APIRouter(prefix="/pivots", tags=["Real-World Linking & Identity Pivots"])

@router.get("")
def list_real_world_pivots(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    entities = db.query(RealWorldEntity).all()
    results = []
    for r in entities:
        actor = db.query(Actor).filter(Actor.id == r.actor_id).first()
        wallets = db.query(Wallet).filter(Wallet.actor_id == r.actor_id).all() if actor else []
        total_crypto_exposure = sum(w.exchange_exposure_usd for w in wallets)

        results.append({
            "id": r.id,
            "actor_id": r.actor_id,
            "actor_handle": actor.primary_handle if actor else "Unknown",
            "actor_risk": actor.risk_score if actor else 50,
            "entity_type": r.entity_type,
            "name_or_alias": r.name_or_alias,
            "country": r.country,
            "platform": r.platform,
            "confidence_score": r.confidence_score,
            "evidence_chain": r.evidence_chain,
            "total_crypto_exposure_usd": total_crypto_exposure,
            "created_at": r.created_at.isoformat()
        })
    results.sort(key=lambda x: x["confidence_score"], reverse=True)
    return results
