import datetime
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    hashed_password = Column(String(128), nullable=False)
    role = Column(String(32), default="Analyst")  # Analyst, Supervisor, Admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Source(Base):
    __tablename__ = "sources"
    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    type = Column(String(32), default="marketplace")  # marketplace, forum, deepweb, internal
    reliability_score = Column(Float, default=80.0)  # 0-100
    trusted = Column(Boolean, default=True)
    last_scanned_at = Column(DateTime, default=datetime.datetime.utcnow)

    actors = relationship("Actor", back_populates="source")
    services = relationship("HiddenService", back_populates="source")
    ingest_runs = relationship("IngestRun", back_populates="source")

class Marketplace(Base):
    __tablename__ = "marketplaces"
    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    onion_address = Column(String(128), nullable=False)
    category = Column(String(64), default="general")
    status = Column(String(32), default="active")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    services = relationship("HiddenService", back_populates="marketplace")
    handles = relationship("Handle", back_populates="marketplace")

class HiddenService(Base):
    __tablename__ = "hidden_services"
    id = Column(String(64), primary_key=True)  # onion prefix or identifier
    onion_address = Column(String(128), unique=True, index=True, nullable=False)
    name = Column(String(128), nullable=False)
    marketplace_id = Column(String(64), ForeignKey("marketplaces.id"), nullable=True)
    source_id = Column(String(64), ForeignKey("sources.id"), nullable=True)
    status = Column(String(32), default="active")  # active, offline, relocated
    first_seen = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    risk_score = Column(Integer, default=50)

    marketplace = relationship("Marketplace", back_populates="services")
    source = relationship("Source", back_populates="services")
    snapshots = relationship("ServiceSnapshot", back_populates="service", cascade="all, delete-orphan")
    findings = relationship("MisconfigFinding", back_populates="service", cascade="all, delete-orphan")
    candidates = relationship("OriginCandidate", back_populates="service", cascade="all, delete-orphan")

class ServiceSnapshot(Base):
    __tablename__ = "service_snapshots"
    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(String(64), ForeignKey("hidden_services.id"), nullable=False)
    status_code = Column(Integer, default=200)
    response_time_ms = Column(Integer, default=450)
    headers_json = Column(JSON, default=dict)
    body_sample = Column(Text, default="")
    cert_data = Column(JSON, default=dict)
    favicon_hash = Column(String(64), default="")
    banners = Column(String(256), default="")
    captured_at = Column(DateTime, default=datetime.datetime.utcnow)
    content_hash = Column(String(64), default="")

    service = relationship("HiddenService", back_populates="snapshots")

class MisconfigFinding(Base):
    __tablename__ = "misconfig_findings"
    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(String(64), ForeignKey("hidden_services.id"), nullable=False)
    rule_id = Column(String(64), index=True, nullable=False)
    severity = Column(String(32), default="MEDIUM")  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    title = Column(String(256), nullable=False)
    description = Column(Text, default="")
    evidence_data = Column(JSON, default=dict)
    confidence = Column(Integer, default=80)  # 0-100
    detected_at = Column(DateTime, default=datetime.datetime.utcnow)

    service = relationship("HiddenService", back_populates="findings")

class ClearnetHost(Base):
    __tablename__ = "clearnet_hosts"
    id = Column(String(64), primary_key=True)
    ip_address = Column(String(64), index=True, nullable=False)
    hostname = Column(String(256), default="")
    asn = Column(String(64), default="")
    asn_org = Column(String(256), default="")
    country_code = Column(String(8), default="US")
    cert_fingerprint = Column(String(128), default="")
    cert_san = Column(JSON, default=list)
    cert_subject = Column(String(256), default="")
    banner = Column(String(256), default="")
    favicon_hash = Column(String(64), default="")
    jarm = Column(String(128), default="")
    headers_fingerprint = Column(String(128), default="")
    simhash = Column(String(64), default="")
    first_seen = Column(DateTime, default=datetime.datetime.utcnow)

class OriginCandidate(Base):
    __tablename__ = "origin_candidates"
    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(String(64), ForeignKey("hidden_services.id"), nullable=False)
    clearnet_host_id = Column(String(64), ForeignKey("clearnet_hosts.id"), nullable=False)
    confidence_score = Column(Integer, default=0)  # 0-100
    status = Column(String(32), default="PROPOSED")  # PROPOSED, ACCEPTED, REJECTED
    match_matrix = Column(JSON, default=dict)  # per-signal breakdown
    rationale = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    reviewer = Column(String(64), nullable=True)

    service = relationship("HiddenService", back_populates="candidates")
    clearnet_host = relationship("ClearnetHost")

# Capability 2 & 3: Actor Graph and Real-World Linking

class Actor(Base):
    __tablename__ = "actors"
    id = Column(String(64), primary_key=True)
    primary_handle = Column(String(128), index=True, nullable=False)
    risk_score = Column(Integer, default=70)
    category = Column(String(64), default="Vendor")
    attribution_confidence = Column(Float, default=75.0)  # 0-100, computed
    last_scan_date = Column(DateTime, default=datetime.datetime.utcnow)
    source_id = Column(String(64), ForeignKey("sources.id"), nullable=True)
    first_seen = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, default=datetime.datetime.utcnow)
    notes = Column(Text, default="")
    manual_override = Column(Boolean, default=False)
    stylometry_profile = Column(JSON, default=dict)
    activity_timezone = Column(String(32), default="UTC+1")

    source = relationship("Source", back_populates="actors")
    handles = relationship("Handle", back_populates="actor")
    wallets = relationship("Wallet", back_populates="actor")
    real_world_entities = relationship("RealWorldEntity", back_populates="actor")
    persona_links = relationship("PersonaLink", back_populates="actor", cascade="all, delete-orphan")

class Handle(Base):
    __tablename__ = "handles"
    id = Column(String(64), primary_key=True)
    actor_id = Column(String(64), ForeignKey("actors.id"), nullable=False)
    marketplace_id = Column(String(64), ForeignKey("marketplaces.id"), nullable=False)
    handle_name = Column(String(128), index=True, nullable=False)
    vendor_rating = Column(Float, default=4.9)
    sales_count = Column(Integer, default=120)
    first_seen = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    pgp_fingerprint = Column(String(64), nullable=True)
    listing_sample = Column(Text, default="")
    avatar_phash = Column(String(64), default="")

    actor = relationship("Actor", back_populates="handles")
    marketplace = relationship("Marketplace", back_populates="handles")
    persona_links = relationship("PersonaLink", back_populates="handle", cascade="all, delete-orphan")

class PGPKey(Base):
    __tablename__ = "pgp_keys"
    id = Column(String(64), primary_key=True)
    fingerprint = Column(String(64), unique=True, index=True, nullable=False)
    key_id = Column(String(32), default="")
    uids = Column(JSON, default=list)
    email = Column(String(128), default="")
    armor = Column(Text, default="")
    bits = Column(Integer, default=4096)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Wallet(Base):
    __tablename__ = "wallets"
    id = Column(String(128), primary_key=True)  # currency:address
    address = Column(String(128), index=True, nullable=False)
    currency = Column(String(16), default="BTC")  # BTC, ETH, XMR
    actor_id = Column(String(64), ForeignKey("actors.id"), nullable=True)
    cluster_id = Column(String(64), default="")
    total_received_usd = Column(Float, default=0.0)
    exchange_exposure_usd = Column(Float, default=0.0)
    first_seen = Column(DateTime, default=datetime.datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)

    actor = relationship("Actor", back_populates="wallets")

class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"
    id = Column(Integer, primary_key=True, index=True)
    tx_hash = Column(String(128), index=True, nullable=False)
    from_address = Column(String(128), index=True, nullable=False)
    to_address = Column(String(128), index=True, nullable=False)
    amount = Column(Float, default=0.0)
    currency = Column(String(16), default="BTC")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    cluster_group = Column(String(64), default="")
    is_exchange_deposit = Column(Boolean, default=False)
    exchange_name = Column(String(64), default="")

class TrustEdge(Base):
    __tablename__ = "trust_edges"
    id = Column(Integer, primary_key=True, index=True)
    source_handle_id = Column(String(64), nullable=False)
    target_handle_id = Column(String(64), nullable=False)
    edge_type = Column(String(32), default="REVIEW")  # REVIEW, VOUCH, ESCROW
    confidence = Column(Integer, default=90)
    rating = Column(Float, default=5.0)
    comment = Column(Text, default="")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class RealWorldEntity(Base):
    __tablename__ = "real_world_entities"
    id = Column(String(64), primary_key=True)
    actor_id = Column(String(64), ForeignKey("actors.id"), nullable=False)
    entity_type = Column(String(64), default="SUSPECT_INDIVIDUAL")  # SUSPECT_INDIVIDUAL, EXCHANGE_ACCOUNT, INFRA_OPERATOR
    name_or_alias = Column(String(256), nullable=False)
    country = Column(String(64), default="")
    platform = Column(String(64), default="")  # GitHub, Telegram, ClearWeb Forum, Binance, Kraken
    identifiers_json = Column(JSON, default=dict)
    confidence_score = Column(Integer, default=75)
    evidence_chain = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    actor = relationship("Actor", back_populates="real_world_entities")

# Cases, Alerts, and Audit

class Case(Base):
    __tablename__ = "cases"
    id = Column(String(64), primary_key=True)
    title = Column(String(256), nullable=False)
    status = Column(String(32), default="ACTIVE")  # ACTIVE, REVIEW, ARCHIVED
    assigned_analyst = Column(String(64), default="Special Agent Vance")
    priority = Column(String(16), default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW
    summary = Column(Text, default="")
    tags_json = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

    evidence = relationship("CaseEvidence", back_populates="case", cascade="all, delete-orphan")

class CaseEvidence(Base):
    __tablename__ = "case_evidence"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(String(64), ForeignKey("cases.id"), nullable=False)
    entity_type = Column(String(64), nullable=False)  # HIDDEN_SERVICE, ORIGIN_HOST, ACTOR, WALLET, REAL_WORLD
    entity_id = Column(String(128), nullable=False)
    title = Column(String(256), nullable=False)
    sha256_hash = Column(String(64), nullable=False)
    details_json = Column(JSON, default=dict)
    added_at = Column(DateTime, default=datetime.datetime.utcnow)

    case = relationship("Case", back_populates="evidence")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    alert_type = Column(String(64), nullable=False)  # ORIGIN_MATCH, WALLET_REUSE, ACTOR_MERGE, NEW_MISCONFIG
    title = Column(String(256), nullable=False)
    description = Column(Text, default="")
    severity = Column(String(32), default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW
    status = Column(String(32), default="UNREAD")  # UNREAD, ACKNOWLEDGED, DISMISSED
    entity_type = Column(String(64), default="")
    entity_id = Column(String(128), default="")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    metadata_json = Column(JSON, default=dict)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String(64), default="Analyst")
    action = Column(String(64), nullable=False)
    target_type = Column(String(64), nullable=False)
    target_id = Column(String(128), nullable=False)
    details = Column(Text, default="")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class PersonaLink(Base):
    __tablename__ = "persona_links"
    id = Column(Integer, primary_key=True, index=True)
    handle_id = Column(String(64), ForeignKey("handles.id"), nullable=False)
    actor_id = Column(String(64), ForeignKey("actors.id"), nullable=False)
    method = Column(String(32), default="stylometry")  # stylometry, pgp, wallet, behaviour, name
    score = Column(Float, default=85.0)  # 0-100
    status = Column(String(32), default="PROPOSED")  # PROPOSED, ACCEPTED, REJECTED
    rationale = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    reviewed_by = Column(String(64), nullable=True)

    handle = relationship("Handle", back_populates="persona_links")
    actor = relationship("Actor", back_populates="persona_links")

class EvidenceUpload(Base):
    __tablename__ = "evidence_uploads"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(256), nullable=False)
    file_type = Column(String(32), default="txt")
    sha256 = Column(String(64), index=True, nullable=False)
    size = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    extracted_json = Column(JSON, default=dict)  # EXIF, text, identifiers
    signals_json = Column(JSON, default=list)
    verdict = Column(String(32), default="UNKNOWN")  # TRUSTED_SOURCE, THREAT_ACTOR_LINKED, UNKNOWN
    trust_score = Column(Float, default=0.0)  # 0-100
    matched_source_id = Column(String(64), ForeignKey("sources.id"), nullable=True)
    matched_actor_id = Column(String(64), ForeignKey("actors.id"), nullable=True)

    source = relationship("Source")
    actor = relationship("Actor")

class IngestRun(Base):
    __tablename__ = "ingest_runs"
    id = Column(Integer, primary_key=True, index=True)
    job_name = Column(String(128), nullable=False)
    source_id = Column(String(64), ForeignKey("sources.id"), nullable=True)
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
    items_ingested = Column(Integer, default=0)
    items_rejected = Column(Integer, default=0)
    status = Column(String(32), default="SUCCESS")  # SUCCESS, FAILED, RUNNING
    error = Column(Text, nullable=True)

    source = relationship("Source", back_populates="ingest_runs")

