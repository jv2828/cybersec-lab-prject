import os
import json
import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from apscheduler.schedulers.background import BackgroundScheduler

from backend.app.core.database import SessionLocal
from backend.app.models.models import (
    Source, IngestRun, HiddenService, ServiceSnapshot,
    MisconfigFinding, Handle, Actor, PersonaLink, AuditLog, Alert
)
from backend.app.detectors.engine import detector_engine
from backend.app.matcher.origin_matcher import origin_matcher
from backend.app.resolver.entity_resolver import entity_resolver

FEEDS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "feeds")

class PipelineEngine:
    """
    Autonomous Dark Web Continuous Ingestion Pipeline with reliability gate.
    When autonomous mode is ON, only ingests from verified sources (trusted=True, reliability >= 60).
    Runs misconfiguration detectors, origin correlation, and persona-link generation.
    """

    def __init__(self):
        self.autonomous_enabled = False
        self.scheduler = BackgroundScheduler(daemon=True)
        self.is_running_job = False

    def start_scheduler(self):
        """Initializes background scheduler for autonomous mode."""
        if not self.scheduler.running:
            self.scheduler.add_job(
                self._scheduled_run,
                'interval',
                minutes=2,
                id='autonomous_pipeline_job',
                replace_existing=True
            )
            self.scheduler.start()

    def set_autonomous_mode(self, enabled: bool) -> bool:
        self.autonomous_enabled = enabled
        return self.autonomous_enabled

    def _scheduled_run(self):
        if not self.autonomous_enabled or self.is_running_job:
            return
        db = SessionLocal()
        try:
            self.run_pipeline_cycle(db)
        finally:
            db.close()

    def run_pipeline_cycle(self, db: Session) -> Dict[str, Any]:
        """
        Executes a real ingestion and correlation cycle across all disk feed files.
        """
        self.is_running_job = True
        cycle_start = datetime.datetime.now(datetime.timezone.utc)
        runs_created = []
        total_ingested = 0
        total_rejected = 0

        try:
            feed_files = []
            if os.path.exists(FEEDS_DIR):
                feed_files = [f for f in os.listdir(FEEDS_DIR) if f.endswith(".json")]

            for fname in feed_files:
                fpath = os.path.join(FEEDS_DIR, fname)
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        feed_data = json.load(f)
                except Exception as e:
                    continue

                source_id = feed_data.get("source_id", "src_unknown")
                source = db.query(Source).filter(Source.id == source_id).first()
                if not source:
                    source = Source(
                        id=source_id,
                        name=feed_data.get("source_name", source_id),
                        type="marketplace",
                        reliability_score=75.0,
                        trusted=True,
                        last_scanned_at=datetime.datetime.now(datetime.timezone.utc)
                    )
                    db.add(source)
                    db.commit()
                    db.refresh(source)

                items = feed_data.get("items", [])
                
                # --- RELIABILITY GATE ---
                # When autonomous mode is ON, strictly enforce: trusted == True AND reliability_score >= 60.0
                if self.autonomous_enabled and (not source.trusted or source.reliability_score < 60.0):
                    reason = f"[RELIABILITY_GATE] Ingestion skipped: Source '{source.name}' has reliability_score {source.reliability_score} < 60 or trusted=False."
                    ingest_run = IngestRun(
                        job_name=f"Ingest Feed ({fname})",
                        source_id=source.id,
                        started_at=cycle_start,
                        finished_at=datetime.datetime.now(datetime.timezone.utc),
                        items_ingested=0,
                        items_rejected=len(items),
                        status="REJECTED_BY_GATE",
                        error=reason
                    )
                    db.add(ingest_run)
                    total_rejected += len(items)
                    runs_created.append({
                        "source": source.name,
                        "status": "REJECTED_BY_GATE",
                        "items_ingested": 0,
                        "items_rejected": len(items),
                        "reason": reason
                    })
                    continue

                # --- PROCESS ACCEPTED FEED ---
                ingested_for_source = 0
                for item in items:
                    itype = item.get("type")
                    if itype == "hidden_service_snapshot":
                        onion = item.get("onion_address")
                        if onion:
                            svc = db.query(HiddenService).filter(HiddenService.onion_address == onion).first()
                            if not svc:
                                svc = HiddenService(
                                    id=f"hs_{onion[:12]}",
                                    onion_address=onion,
                                    name=item.get("service_name", "Ingested Hidden Service [SYNTHETIC]"),
                                    source_id=source.id,
                                    status="active",
                                    last_seen=datetime.datetime.now(datetime.timezone.utc)
                                )
                                db.add(svc)
                                db.commit()
                                db.refresh(svc)
                            
                            # Run detectors
                            snap_data = {
                                "body": f"<html><body><h1>{svc.name}</h1></body></html>",
                                "headers": item.get("headers", {}),
                                "cert": {},
                                "favicon_hash": "",
                                "banners": item.get("banner", ""),
                                "leaked_ips": item.get("leaked_ips", [])
                            }
                            new_findings = detector_engine.analyze_snapshot(snap_data)
                            for f in new_findings:
                                existing = db.query(MisconfigFinding).filter(
                                    MisconfigFinding.service_id == svc.id,
                                    MisconfigFinding.rule_id == f.rule_id
                                ).first()
                                if not existing:
                                    mf = MisconfigFinding(
                                        service_id=svc.id,
                                        rule_id=f.rule_id,
                                        severity=f.severity,
                                        title=f.title,
                                        description=f.description,
                                        confidence=f.confidence,
                                        evidence_data=snap_data
                                    )
                                    db.add(mf)
                            
                            # Run origin matcher
                            origin_matcher.match_service_to_clearnet(db, svc.id, snap_data)
                            ingested_for_source += 1

                    elif itype in ["handle_listing", "forum_post"]:
                        handle_name = item.get("handle_name")
                        if handle_name:
                            h_rec = db.query(Handle).filter(Handle.handle_name == handle_name).first()
                            if not h_rec:
                                # Assign to first or default actor
                                default_actor = db.query(Actor).first()
                                if default_actor:
                                    h_rec = Handle(
                                        id=f"h_{handle_name.lower()[:16]}",
                                        actor_id=default_actor.id,
                                        marketplace_id=item.get("marketplace_id", "mkt_alphabay"),
                                        handle_name=handle_name,
                                        pgp_fingerprint=item.get("pgp_fingerprint"),
                                        listing_sample=item.get("listing_sample", ""),
                                        last_seen=datetime.datetime.now(datetime.timezone.utc)
                                    )
                                    db.add(h_rec)
                            ingested_for_source += 1

                # Update source last scanned
                source.last_scanned_at = datetime.datetime.now(datetime.timezone.utc)
                
                # Record successful IngestRun
                run_rec = IngestRun(
                    job_name=f"Ingest Feed ({fname})",
                    source_id=source.id,
                    started_at=cycle_start,
                    finished_at=datetime.datetime.now(datetime.timezone.utc),
                    items_ingested=ingested_for_source,
                    items_rejected=0,
                    status="SUCCESS",
                    error=None
                )
                db.add(run_rec)
                total_ingested += ingested_for_source
                runs_created.append({
                    "source": source.name,
                    "status": "SUCCESS",
                    "items_ingested": ingested_for_source,
                    "items_rejected": 0
                })

            # --- RUN REBRAND & PERSONA LINK DETECTION ---
            self.detect_rebrand_migrations(db)

            db.commit()

        finally:
            self.is_running_job = False

        return {
            "status": "success",
            "autonomous_mode": self.autonomous_enabled,
            "items_ingested": total_ingested,
            "items_rejected": total_rejected,
            "runs": runs_created,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
        }

    def detect_rebrand_migrations(self, db: Session):
        """
        Scans handles across marketplaces and identifies potential rebrands or migrations.
        Writes PersonaLink rows with status='PROPOSED' for analyst human-in-the-loop review.
        """
        handles = db.query(Handle).all()
        actors = db.query(Actor).all()

        for a in actors:
            # Look for handles belonging to other actors or unlinked handles that match stylometry/PGP
            actor_handles = [h for h in handles if h.actor_id == a.id]
            other_handles = [h for h in handles if h.actor_id != a.id]
            
            for h_ext in other_handles:
                # Check if PersonaLink already exists
                existing_pl = db.query(PersonaLink).filter(
                    PersonaLink.handle_id == h_ext.id,
                    PersonaLink.actor_id == a.id
                ).first()
                if existing_pl:
                    continue

                for h_own in actor_handles:
                    score, reasons, matrix = entity_resolver.evaluate_link(
                        {
                            "handle_name": h_own.handle_name,
                            "pgp_fingerprint": h_own.pgp_fingerprint,
                            "avatar_phash": h_own.avatar_phash,
                            "listing_sample": h_own.listing_sample
                        },
                        {
                            "handle_name": h_ext.handle_name,
                            "pgp_fingerprint": h_ext.pgp_fingerprint,
                            "avatar_phash": h_ext.avatar_phash,
                            "listing_sample": h_ext.listing_sample
                        }
                    )
                    if score >= 60:
                        method = "stylometry"
                        if matrix.get("pgp_match", {}).get("match"):
                            method = "pgp"
                        elif matrix.get("avatar_phash", {}).get("match"):
                            method = "avatar_phash"
                        elif matrix.get("name_likeness", {}).get("match"):
                            method = "name_likeness"

                        new_pl = PersonaLink(
                            handle_id=h_ext.id,
                            actor_id=a.id,
                            method=method,
                            score=float(score),
                            status="PROPOSED",
                            rationale={
                                "reasons": reasons,
                                "matched_handle": h_own.handle_name,
                                "candidate_handle": h_ext.handle_name,
                                "matrix": matrix
                            },
                            created_at=datetime.datetime.now(datetime.timezone.utc)
                        )
                        db.add(new_pl)
                        break

pipeline_engine = PipelineEngine()
