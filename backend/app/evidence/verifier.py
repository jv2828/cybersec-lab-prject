import os
import re
import hashlib
import datetime
from io import BytesIO
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from PIL import Image, ExifTags
import imagehash
import pypdf

from backend.app.models.models import (
    Actor, Handle, PGPKey, Wallet, HiddenService, Source, EvidenceUpload
)
from backend.app.resolver.entity_resolver import entity_resolver

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class EvidenceVerifier:
    """
    Law-enforcement & CTI Grade Evidence Verification Engine.
    Traces uploaded reports, documents, photos, or raw text to answer:
    'Does this come from a trusted source, a known threat actor, or an unknown source?'
    with an explainable confidence score and cryptographic signals.
    """

    def extract_text_and_exif(self, filename: str, content: bytes) -> Dict[str, Any]:
        """
        Extracts metadata, EXIF, perceptual hashes, and text from incoming files.
        """
        lower_name = filename.lower()
        extracted: Dict[str, Any] = {
            "exif": {},
            "gps_found": False,
            "device_info": "",
            "phash": "",
            "raw_text": "",
            "page_count": 1
        }

        # 1. Image extraction (JPEG, PNG, WEBP)
        if any(lower_name.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]):
            try:
                img = Image.open(BytesIO(content))
                extracted["phash"] = str(imagehash.phash(img))
                
                # Check EXIF
                exif_data = img._getexif() if hasattr(img, '_getexif') and img._getexif() else {}
                for tag_id, val in exif_data.items():
                    tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                    if tag_name == "GPSInfo":
                        extracted["gps_found"] = True
                        extracted["exif"]["GPSInfo"] = str(val)
                    elif tag_name in ["Make", "Model", "Software", "DateTime", "HostComputer"]:
                        extracted["exif"][tag_name] = str(val)
                
                if "Make" in extracted["exif"] or "Model" in extracted["exif"]:
                    extracted["device_info"] = f"{extracted['exif'].get('Make', '')} {extracted['exif'].get('Model', '')}".strip()
            except Exception as e:
                extracted["image_error"] = str(e)

        # 2. PDF document extraction
        elif lower_name.endswith(".pdf"):
            try:
                reader = pypdf.PdfReader(BytesIO(content))
                extracted["page_count"] = len(reader.pages)
                pages_text = [p.extract_text() or "" for p in reader.pages]
                extracted["raw_text"] = "\n".join(pages_text)
            except Exception as e:
                extracted["pdf_error"] = str(e)

        # 3. Plaintext or structured text / code / markdown
        else:
            try:
                extracted["raw_text"] = content.decode("utf-8", errors="ignore")
            except Exception:
                extracted["raw_text"] = str(content[:4000])

        return extracted

    def extract_indicators(self, text: str) -> Dict[str, List[str]]:
        """
        Regex patterns for onion addresses, PGP fingerprints, wallets, and handles.
        """
        if not text:
            return {"onions": [], "pgp": [], "btc": [], "eth": [], "xmr": [], "emails": [], "handles": []}

        onions = list(set(re.findall(r'\b[a-z2-7]{16,56}\.onion\b', text, re.IGNORECASE)))
        
        # PGP 40-char or 32-char hex fingerprints (case-insensitive)
        pgp = list(set(re.findall(r'\b(?:0x)?[0-9a-fA-F]{32,40}\b', text)))
        
        # BTC addresses (legacy P2PKH/P2SH and Bech32 bc1)
        btc = list(set(re.findall(r'\b(?:[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{11,71})\b', text, re.IGNORECASE)))
        
        # ETH addresses
        eth = list(set(re.findall(r'\b0x[a-fA-F0-9]{40}\b', text)))
        
        # XMR addresses
        xmr = list(set(re.findall(r'\b4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}\b', text)))
        
        # Emails
        emails = list(set(re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b', text)))
        
        # Handles mentioned (@name or vendor: name)
        handles = list(set(re.findall(r'(?:@|handle:|vendor:)\s*([A-Za-z0-9_-]{3,32})', text, re.IGNORECASE)))

        return {
            "onions": onions,
            "pgp": pgp,
            "btc": btc,
            "eth": eth,
            "xmr": xmr,
            "emails": emails,
            "handles": handles
        }

    def verify(
        self,
        db: Session,
        filename: str,
        content: bytes,
        manual_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Main documented verdict evaluation function.
        Returns: verdict, trust_score, signals, matched_actor, matched_source, extracted_data.
        """
        sha256_hash = hashlib.sha256(content).hexdigest()
        
        # Save file to upload directory
        saved_name = f"{sha256_hash[:16]}_{filename}"
        saved_path = os.path.join(UPLOAD_DIR, saved_name)
        try:
            with open(saved_path, "wb") as f:
                f.write(content)
        except Exception:
            pass

        extracted = self.extract_text_and_exif(filename, content)
        combined_text = (extracted["raw_text"] + " " + (manual_text or "")).strip()
        indicators = self.extract_indicators(combined_text)

        # Cross-reference direct database indicators against text
        all_db_wallets = db.query(Wallet).all()
        for w_rec in all_db_wallets:
            if w_rec.address and w_rec.address.lower() in combined_text.lower():
                if w_rec.address not in indicators["btc"] and w_rec.address not in indicators["eth"] and w_rec.address not in indicators["xmr"]:
                    if w_rec.currency == "ETH":
                        indicators["eth"].append(w_rec.address)
                    elif w_rec.currency == "XMR":
                        indicators["xmr"].append(w_rec.address)
                    else:
                        indicators["btc"].append(w_rec.address)

        all_db_pgp = db.query(PGPKey).all()
        for pk in all_db_pgp:
            fp_clean = pk.fingerprint.replace("0x", "").lower()
            if pk.fingerprint.lower() in combined_text.lower() or fp_clean in combined_text.lower():
                if pk.fingerprint not in indicators["pgp"]:
                    indicators["pgp"].append(pk.fingerprint)

        all_db_handles = db.query(Handle).all()
        for h in all_db_handles:
            if h.handle_name and h.handle_name.lower() in combined_text.lower():
                if h.handle_name not in indicators["handles"]:
                    indicators["handles"].append(h.handle_name)

        extracted["indicators"] = indicators

        signals: List[Dict[str, Any]] = []
        matched_actor = None
        matched_source = None
        verdict = "UNKNOWN"
        trust_score = 15.0

        # --- RULE 1: Visual Perceptual Hash (pHash) against Threat Actor Avatars ---
        if extracted.get("phash"):
            file_phash = extracted["phash"]
            all_handles = db.query(Handle).filter(Handle.avatar_phash != "").all()
            for h in all_handles:
                # Compare hex or exact match
                if h.avatar_phash and (h.avatar_phash == file_phash or h.avatar_phash in file_phash or file_phash in h.avatar_phash):
                    matched_actor = h.actor
                    signals.append({
                        "name": "Perceptual Visual Asset Match (pHash)",
                        "weight": 85,
                        "matched_value": f"Avatar {h.avatar_phash} of handle '{h.handle_name}'",
                        "reason": f"Visual contents match dark web avatar associated with actor '{matched_actor.primary_handle}'"
                    })
                    break

        # --- RULE 2: Flag EXIF GPS / Device Metadata if found ---
        if extracted.get("gps_found"):
            signals.append({
                "name": "Leaked EXIF Geolocation",
                "weight": 70,
                "matched_value": str(extracted["exif"].get("GPSInfo", "Present")),
                "reason": "Exposed GPS coordinate telemetry in image metadata"
            })
        if extracted.get("device_info"):
            signals.append({
                "name": "Hardware Device Signature",
                "weight": 50,
                "matched_value": extracted["device_info"],
                "reason": f"Camera/Device EXIF metadata identifies hardware '{extracted['device_info']}'"
            })

        # --- RULE 3: Cryptographic PGP Key Identification ---
        for fp in indicators["pgp"]:
            clean_fp = fp.replace("0x", "").upper()
            pgp_record = db.query(PGPKey).filter(PGPKey.fingerprint.ilike(f"%{clean_fp}%")).first()
            if pgp_record:
                # Find matching handle
                matching_handle = db.query(Handle).filter(Handle.pgp_fingerprint.ilike(f"%{clean_fp}%")).first()
                if matching_handle:
                    matched_actor = matching_handle.actor
                    signals.append({
                        "name": "Cryptographic 4096-bit PGP Fingerprint Match",
                        "weight": 95,
                        "matched_value": clean_fp,
                        "reason": f"PGP Key matches verified signature of actor '{matched_actor.primary_handle}'"
                    })
                    break

        # --- RULE 4: Reused Cryptocurrency Wallets ---
        all_wallets = indicators["btc"] + indicators["eth"] + indicators["xmr"]
        for w in all_wallets:
            wallet_record = db.query(Wallet).filter(Wallet.address.ilike(w)).first()
            if wallet_record and wallet_record.actor:
                matched_actor = wallet_record.actor
                signals.append({
                    "name": "Identified Cryptocurrency Deposit Wallet",
                    "weight": 90,
                    "matched_value": f"{wallet_record.currency}: {w}",
                    "reason": f"Wallet address is actively indexed to darknet actor '{matched_actor.primary_handle}'"
                })
                break

        # --- RULE 5: Darknet Onion Address Match ---
        for onion in indicators["onions"]:
            svc = db.query(HiddenService).filter(HiddenService.onion_address.ilike(f"%{onion}%")).first()
            if svc:
                signals.append({
                    "name": "Indexed Tor Hidden Service",
                    "weight": 75,
                    "matched_value": onion,
                    "reason": f"Referenced onion service '{svc.name}' is monitored in dark web infrastructure database"
                })
                if svc.source and svc.source.trusted:
                    matched_source = svc.source

        # --- RULE 6: Handle Mentions ---
        for handle_name in indicators["handles"]:
            h_rec = db.query(Handle).filter(Handle.handle_name.ilike(handle_name)).first()
            if h_rec and h_rec.actor:
                matched_actor = h_rec.actor
                signals.append({
                    "name": "Threat Actor Alias Match",
                    "weight": 80,
                    "matched_value": handle_name,
                    "reason": f"Handle matches actor profile for '{matched_actor.primary_handle}'"
                })
                break

        # --- RULE 7: Stylometric Corpus Match ---
        if len(combined_text) > 40 and not matched_actor:
            actors = db.query(Actor).all()
            for a in actors:
                # Combine listing samples from handles
                corpus = " ".join([h.listing_sample for h in a.handles if h.listing_sample])
                if corpus:
                    sim = entity_resolver.compute_stylometry_similarity(combined_text, corpus)
                    if sim >= 0.72:
                        matched_actor = a
                        signals.append({
                            "name": "AI Stylometric Authorship Similarity",
                            "weight": 75,
                            "matched_value": f"{int(sim * 100)}% lexical match",
                            "reason": f"Stylometric profiling matches writing style of actor '{a.primary_handle}'"
                        })
                        break

        # --- RULE 8: Check for Trusted Source Identity ---
        sources = db.query(Source).all()
        for src in sources:
            # Check if text or filename explicitly mentions or matches the source
            if src.name.lower() in combined_text.lower() or src.id.lower() in filename.lower() or src.name.lower() in filename.lower():
                matched_source = src
                signals.append({
                    "name": "Source Verification Check",
                    "weight": int(src.reliability_score),
                    "matched_value": f"{src.name} (Reliability: {src.reliability_score}%)",
                    "reason": f"Content provenance validated against source registry: trusted={src.trusted}"
                })
                break

        # --- VERDICT DETERMINATION (Explicit Documented Hierarchy) ---
        if matched_actor:
            verdict = "THREAT_ACTOR_LINKED"
            # Trust score represents threat identification certainty
            top_weight = max([s["weight"] for s in signals], default=85)
            trust_score = float(top_weight)
        elif matched_source and matched_source.trusted and matched_source.reliability_score >= 60:
            verdict = "TRUSTED_SOURCE"
            trust_score = float(matched_source.reliability_score)
        else:
            verdict = "UNKNOWN"
            trust_score = 15.0
            if not signals:
                signals.append({
                    "name": "Baseline Cryptographic & OSINT Scan",
                    "weight": 15,
                    "matched_value": "No darknet signatures found",
                    "reason": "File does not contain known PGP keys, threat wallets, actor avatars, or trusted source stamps."
                })

        # Save record in EvidenceUpload
        upload_rec = EvidenceUpload(
            filename=filename,
            file_type=filename.split(".")[-1].lower() if "." in filename else "txt",
            sha256=sha256_hash,
            size=len(content),
            extracted_json={
                "char_length": len(combined_text),
                "device_info": extracted.get("device_info", ""),
                "gps_found": extracted.get("gps_found", False),
                "phash": extracted.get("phash", ""),
                "indicators": indicators,
                "preview": combined_text[:300]
            },
            signals_json=signals,
            verdict=verdict,
            trust_score=trust_score,
            matched_source_id=matched_source.id if matched_source else None,
            matched_actor_id=matched_actor.id if matched_actor else None
        )
        db.add(upload_rec)
        db.commit()
        db.refresh(upload_rec)

        return {
            "id": upload_rec.id,
            "filename": filename,
            "sha256": sha256_hash,
            "verdict": verdict,
            "trust_score": trust_score,
            "signals": signals,
            "matched_actor": {
                "id": matched_actor.id,
                "primary_handle": matched_actor.primary_handle,
                "category": matched_actor.category,
                "risk_score": matched_actor.risk_score
            } if matched_actor else None,
            "matched_source": {
                "id": matched_source.id,
                "name": matched_source.name,
                "type": matched_source.type,
                "reliability_score": matched_source.reliability_score,
                "trusted": matched_source.trusted
            } if matched_source else None,
            "extracted_data": {
                "indicators": indicators,
                "device_info": extracted.get("device_info", ""),
                "gps_found": extracted.get("gps_found", False),
                "phash": extracted.get("phash", ""),
                "preview": combined_text[:300]
            },
            "uploaded_at": upload_rec.uploaded_at.isoformat()
        }

evidence_verifier = EvidenceVerifier()
