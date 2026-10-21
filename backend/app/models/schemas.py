from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import datetime

class UserBase(BaseModel):
    username: str
    role: str = "Analyst"

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class MisconfigFindingOut(BaseModel):
    id: int
    rule_id: str
    severity: str
    title: str
    description: str
    evidence_data: Dict[str, Any]
    confidence: int
    detected_at: datetime.datetime

    class Config:
        from_attributes = True

class OriginCandidateOut(BaseModel):
    id: int
    service_id: str
    clearnet_host_id: str
    confidence_score: int
    status: str
    match_matrix: Dict[str, Any]
    rationale: str
    created_at: datetime.datetime
    reviewed_at: Optional[datetime.datetime] = None
    reviewer: Optional[str] = None
    clearnet_host: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class HiddenServiceSummary(BaseModel):
    id: str
    onion_address: str
    name: str
    marketplace_id: Optional[str] = None
    source_id: Optional[str] = None
    source_name: Optional[str] = None
    status: str
    risk_score: int
    first_seen: datetime.datetime
    last_seen: datetime.datetime
    findings_count: int = 0
    top_origin_confidence: int = 0

class HiddenServiceDetail(BaseModel):
    id: str
    onion_address: str
    name: str
    marketplace_id: Optional[str] = None
    source_id: Optional[str] = None
    source_name: Optional[str] = None
    status: str
    risk_score: int
    first_seen: datetime.datetime
    last_seen: datetime.datetime
    snapshots: List[Dict[str, Any]] = []
    findings: List[MisconfigFindingOut] = []
    candidates: List[OriginCandidateOut] = []

    class Config:
        from_attributes = True

class CandidateReviewRequest(BaseModel):
    action: str = Field(..., description="'ACCEPT' or 'REJECT'")
    notes: Optional[str] = ""

class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # ACTOR, HANDLE, MARKETPLACE, PGP, WALLET, REAL_WORLD, ONION, CLEARNET_IP
    risk_score: Optional[int] = 50
    properties: Dict[str, Any] = {}

class GraphEdge(BaseModel):
    source: str
    target: str
    type: str  # OWNS_HANDLE, SHARES_PGP, REUSES_WALLET, PIVOT_LINK, ORIGIN_MATCH, TRUST_REVIEW
    confidence: int = 90
    properties: Dict[str, Any] = {}

class GraphData(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

class SourceOut(BaseModel):
    id: str
    name: str
    type: str
    reliability_score: float
    trusted: bool
    last_scanned_at: datetime.datetime

    class Config:
        from_attributes = True

class PersonaLinkOut(BaseModel):
    id: int
    handle_id: str
    handle_name: Optional[str] = ""
    actor_id: str
    method: str
    score: float
    status: str
    rationale: Dict[str, Any]
    created_at: datetime.datetime
    reviewed_by: Optional[str] = None

    class Config:
        from_attributes = True

class PersonaLinkReview(BaseModel):
    action: str = Field(..., description="'ACCEPT' or 'REJECT'")
    notes: Optional[str] = ""

class EvidenceSignal(BaseModel):
    name: str
    weight: int
    matched_value: str
    reason: str

class EvidenceUploadOut(BaseModel):
    id: int
    filename: str
    file_type: str
    sha256: str
    size: int
    uploaded_at: datetime.datetime
    extracted_json: Dict[str, Any]
    signals_json: List[Dict[str, Any]]
    verdict: str  # TRUSTED_SOURCE, THREAT_ACTOR_LINKED, UNKNOWN
    trust_score: float
    matched_source_id: Optional[str] = None
    matched_actor_id: Optional[str] = None
    matched_source_name: Optional[str] = None
    matched_actor_name: Optional[str] = None

    class Config:
        from_attributes = True

class IngestRunOut(BaseModel):
    id: int
    job_name: str
    source_id: Optional[str] = None
    source_name: Optional[str] = None
    started_at: datetime.datetime
    finished_at: Optional[datetime.datetime] = None
    items_ingested: int
    items_rejected: int
    status: str
    error: Optional[str] = None

    class Config:
        from_attributes = True

class ActorProfileOut(BaseModel):
    id: str
    primary_handle: str
    risk_score: int
    category: str
    attribution_confidence: float = 75.0
    last_scan_date: datetime.datetime
    source_id: Optional[str] = None
    source_name: Optional[str] = None
    first_seen: datetime.datetime
    last_seen: datetime.datetime
    notes: str
    activity_timezone: str
    handles: List[Dict[str, Any]]
    wallets: List[Dict[str, Any]]
    pgp_keys: List[Dict[str, Any]]
    real_world_entities: List[Dict[str, Any]]
    trust_links_count: int
    stylometry_summary: Dict[str, Any]
    behavioural_profile: Optional[Dict[str, Any]] = None
    suggested_links: Optional[List[PersonaLinkOut]] = []
    attribution_breakdown: Optional[Dict[str, Any]] = None

class MergeActorRequest(BaseModel):
    source_actor_id: str
    target_actor_id: str
    reason: str

class SplitActorRequest(BaseModel):
    actor_id: str
    handle_id: str
    reason: str

class CaseCreate(BaseModel):
    title: str
    priority: str = "HIGH"
    summary: str
    tags: List[str] = []

class CaseEvidenceAdd(BaseModel):
    entity_type: str
    entity_id: str
    title: str
    details: Dict[str, Any] = {}

class AlertOut(BaseModel):
    id: int
    alert_type: str
    title: str
    description: str
    severity: str
    status: str
    entity_type: str
    entity_id: str
    timestamp: datetime.datetime
    metadata_json: Dict[str, Any]

    class Config:
        from_attributes = True

class SearchResultItem(BaseModel):
    category: str
    id: str
    title: str
    subtitle: str
    risk_score: Optional[int] = None
    url: str
