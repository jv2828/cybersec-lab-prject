from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List
from backend.app.core.database import get_db
from backend.app.models.models import Actor, Handle, PGPKey, Wallet, ClearnetHost, HiddenService
from backend.app.models.schemas import SearchResultItem

router = APIRouter(prefix="/search", tags=["Global Intelligence Search"])

@router.get("", response_model=List[SearchResultItem])
def search_entities(q: str = Query(..., min_length=2), db: Session = Depends(get_db)):
    q = q.strip()
    results = []

    # Check for typed syntax prefixes
    prefix = ""
    term = q
    if ":" in q:
        parts = q.split(":", 1)
        prefix = parts[0].lower().strip()
        term = parts[1].strip()

    # 1. Handles / Actors
    if prefix in ["", "handle", "actor"]:
        actors = db.query(Actor).filter(Actor.primary_handle.ilike(f"%{term}%")).limit(10).all()
        for a in actors:
            results.append(SearchResultItem(
                category="ACTOR",
                id=a.id,
                title=f"Actor: {a.primary_handle}",
                subtitle=f"Risk Score: {a.risk_score} | Category: {a.category}",
                risk_score=a.risk_score,
                url=f"/actors/{a.id}"
            ))
        handles = db.query(Handle).filter(Handle.handle_name.ilike(f"%{term}%")).limit(10).all()
        for h in handles:
            results.append(SearchResultItem(
                category="HANDLE",
                id=h.id,
                title=f"Handle: @{h.handle_name}",
                subtitle=f"Marketplace: {h.marketplace_id} | Rating: {h.vendor_rating}",
                risk_score=None,
                url=f"/actors/{h.actor_id}"
            ))

    # 2. PGP Keys
    if prefix in ["", "pgp", "key"]:
        pgps = db.query(PGPKey).filter(
            (PGPKey.fingerprint.ilike(f"%{term}%")) | (PGPKey.email.ilike(f"%{term}%"))
        ).limit(10).all()
        for p in pgps:
            results.append(SearchResultItem(
                category="PGP_KEY",
                id=p.id,
                title=f"PGP: {p.fingerprint[-16:]}",
                subtitle=f"UID: {p.email or 'Unknown'} | Key ID: {p.key_id}",
                risk_score=None,
                url=f"/graph?node={p.id}"
            ))

    # 3. Wallets
    if prefix in ["", "wallet", "btc", "eth"]:
        wallets = db.query(Wallet).filter(Wallet.address.ilike(f"%{term}%")).limit(10).all()
        for w in wallets:
            results.append(SearchResultItem(
                category="WALLET",
                id=w.id,
                title=f"{w.currency} Wallet: {w.address[:16]}...",
                subtitle=f"Received: ${w.total_received_usd:,.2f} | Exposure: ${w.exchange_exposure_usd:,.2f}",
                risk_score=80,
                url=f"/actors/{w.actor_id}" if w.actor_id else "/graph"
            ))

    # 4. Clearnet IPs
    if prefix in ["", "ip", "host"]:
        hosts = db.query(ClearnetHost).filter(
            (ClearnetHost.ip_address.ilike(f"%{term}%")) | (ClearnetHost.hostname.ilike(f"%{term}%"))
        ).limit(10).all()
        for host in hosts:
            results.append(SearchResultItem(
                category="CLEARNET_IP",
                id=host.id,
                title=f"Clearnet Host: {host.ip_address}",
                subtitle=f"ASN: {host.asn} ({host.country_code}) | Host: {host.hostname}",
                risk_score=75,
                url=f"/services"
            ))

    # 5. Onion Services
    if prefix in ["", "onion", "service"]:
        services = db.query(HiddenService).filter(
            (HiddenService.onion_address.ilike(f"%{term}%")) | (HiddenService.name.ilike(f"%{term}%"))
        ).limit(10).all()
        for s in services:
            results.append(SearchResultItem(
                category="HIDDEN_SERVICE",
                id=s.id,
                title=f"Onion Service: {s.name}",
                subtitle=f"Address: {s.onion_address[:24]}... | Risk: {s.risk_score}",
                risk_score=s.risk_score,
                url=f"/services/{s.id}"
            ))

    return results[:25]
