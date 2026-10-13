from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import Optional, List
import datetime
from backend.app.core.database import get_db
from backend.app.models.models import Actor, Handle, AuditLog
from backend.app.models.schemas import (
    GraphData, MergeActorRequest, SplitActorRequest
)
from backend.app.graph.graph_store import graph_store

router = APIRouter(prefix="/graph", tags=["Cross-Marketplace Actor Graph"])

@router.get("", response_model=GraphData)
def get_graph(
    node_type: Optional[str] = None,
    min_confidence: Optional[int] = 0,
    max_nodes: Optional[int] = 300,
    db: Session = Depends(get_db)
):
    if graph_store.graph.number_of_nodes() == 0:
        graph_store.populate_from_db(db)

    data = graph_store.get_full_graph_json(max_nodes=max_nodes)
    nodes = data["nodes"]
    edges = data["edges"]

    if node_type:
        type_upper = node_type.upper()
        nodes = [n for n in nodes if n["type"] == type_upper]
        valid_ids = {n["id"] for n in nodes}
        edges = [e for e in edges if e["source"] in valid_ids and e["target"] in valid_ids]

    if min_confidence:
        edges = [e for e in edges if e.get("confidence", 100) >= min_confidence]

    return {"nodes": nodes, "edges": edges}

@router.get("/ego/{node_id}", response_model=GraphData)
def get_ego_graph(node_id: str, hops: Optional[int] = 2):
    return graph_store.get_ego_graph(center_node_id=node_id, hops=hops)

@router.get("/path")
def find_graph_path(source_id: str = Query(...), target_id: str = Query(...)):
    res = graph_store.find_shortest_path(source_id, target_id)
    if not res.get("found"):
        raise HTTPException(status_code=404, detail="No connective path discovered between entities")
    return res

@router.get("/communities")
def get_communities():
    return graph_store.detect_communities()

@router.post("/merge")
def merge_actors(req: MergeActorRequest, db: Session = Depends(get_db)):
    source_actor = db.query(Actor).filter(Actor.id == req.source_actor_id).first()
    target_actor = db.query(Actor).filter(Actor.id == req.target_actor_id).first()
    if not source_actor or not target_actor:
        raise HTTPException(status_code=404, detail="One or both actor clusters not found")

    # Reassign handles from source to target
    handles = db.query(Handle).filter(Handle.actor_id == req.source_actor_id).all()
    for h in handles:
        h.actor_id = target_actor.id
        graph_store.add_edge(target_actor.id, h.id, "MANUAL_MERGE", confidence=99)

    # Reassign wallets
    for w in source_actor.wallets:
        w.actor_id = target_actor.id
        graph_store.add_edge(target_actor.id, w.id, "MANUAL_MERGE", confidence=99)

    audit = AuditLog(
        user_name="Special Agent Vance",
        action="MERGE_ACTOR_CLUSTERS",
        target_type="ACTOR",
        target_id=target_actor.id,
        details=f"Merged actor {source_actor.id} ({source_actor.primary_handle}) into {target_actor.id} ({target_actor.primary_handle}). Reason: {req.reason}"
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "target_actor_id": target_actor.id,
        "message": f"Successfully merged {len(handles)} handles into {target_actor.primary_handle}"
    }

@router.post("/split")
def split_actor(req: SplitActorRequest, db: Session = Depends(get_db)):
    handle = db.query(Handle).filter(Handle.id == req.handle_id, Handle.actor_id == req.actor_id).first()
    if not handle:
        raise HTTPException(status_code=404, detail="Handle not found under specified actor")

    # Create new isolated actor
    new_actor_id = f"actor_split_{handle.handle_name.lower()}_{datetime.datetime.now(datetime.timezone.utc).strftime('%H%M%S')}"
    new_actor = Actor(
        id=new_actor_id,
        primary_handle=handle.handle_name,
        risk_score=60,
        category="Split Persona",
        notes=f"Split from {req.actor_id}. Reason: {req.reason}"
    )
    db.add(new_actor)
    handle.actor_id = new_actor_id

    graph_store.add_node(new_actor_id, handle.handle_name, "ACTOR", risk_score=60)
    graph_store.add_edge(new_actor_id, handle.id, "SPLIT_PERSONA", confidence=90)

    audit = AuditLog(
        user_name="Special Agent Vance",
        action="SPLIT_ACTOR_PERSONA",
        target_type="ACTOR",
        target_id=new_actor_id,
        details=f"Extracted handle {handle.handle_name} from actor {req.actor_id} into new cluster {new_actor_id}. Reason: {req.reason}"
    )
    db.add(audit)
    db.commit()

    return {
        "status": "success",
        "new_actor_id": new_actor_id,
        "message": f"Handle @{handle.handle_name} extracted into new distinct actor profile"
    }

@router.get("/export/graphml")
def export_graphml():
    xml_data = graph_store.export_graphml()
    return Response(content=xml_data, media_type="application/xml", headers={"Content-Disposition": "attachment; filename=sellix_trace_graph.graphml"})
