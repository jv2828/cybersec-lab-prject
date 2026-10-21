import random
import hashlib
import datetime
from sqlalchemy.orm import Session
from backend.app.models.models import (
    Source, Marketplace, HiddenService, ServiceSnapshot, MisconfigFinding,
    ClearnetHost, OriginCandidate, Actor, Handle, PGPKey,
    Wallet, WalletTransaction, TrustEdge, RealWorldEntity,
    Case, CaseEvidence, Alert, AuditLog, User,
    PersonaLink, EvidenceUpload, IngestRun
)
from backend.app.detectors.engine import detector_engine
from backend.app.matcher.origin_matcher import origin_matcher
from backend.app.graph.graph_store import graph_store
from backend.app.resolver.entity_resolver import entity_resolver

from backend.app.core.database import Base, engine

def seed_database(db: Session, seed_val: int = 42):
    """
    Deterministically seeds the database with compact, meaningful synthetic threat-intelligence data.
    Rule: 10 actors, 3 marketplaces, 10 hidden services, 6 clearnet hosts, 3 sources.
    Every record is used by at least one screen. Labeled 'SYNTHETIC'.
    All IPs reside in RFC 5737 documentation blocks (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24).
    All domains use RFC 2606 reserved domains (*.example, *.test, example.com).
    """
    random.seed(seed_val)
    print("Beginning deterministic synthetic data generation (compact benchmark)...")

    # Recreate all tables cleanly
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    graph_store.clear()

    now = datetime.datetime.now(datetime.timezone.utc)

    # 1. Default Users
    analyst = User(username="analyst_vance", hashed_password="hashed_dev_password", role="Analyst")
    supervisor = User(username="supv_chen", hashed_password="hashed_dev_password", role="Supervisor")
    admin = User(username="admin_ops", hashed_password="hashed_dev_password", role="Admin")
    db.add_all([analyst, supervisor, admin])

    # 2. 3 Sources (with reliability scores & trust status)
    sources_data = [
        ("src_alphabay", "AlphaBay Market Feed [SYNTHETIC]", "marketplace", 85.0, True, now - datetime.timedelta(minutes=15)),
        ("src_dread", "Dread Forum Intel [SYNTHETIC]", "forum", 75.0, True, now - datetime.timedelta(minutes=45)),
        ("src_shadowleaks", "ShadowLeaks Unverified Dump [SYNTHETIC]", "deepweb", 45.0, False, now - datetime.timedelta(hours=3)),
    ]
    sources = []
    for s_id, s_name, s_type, s_rel, s_trust, s_time in sources_data:
        s = Source(
            id=s_id,
            name=s_name,
            type=s_type,
            reliability_score=s_rel,
            trusted=s_trust,
            last_scanned_at=s_time
        )
        sources.append(s)
        db.add(s)
    db.commit()

    # 3. 3 Marketplaces
    marketplaces_data = [
        ("mkt_alphabay", "AlphaBay-Reborn [SYNTHETIC]", "alphabayreborn7x991abcde234567890fghijklmnop12345678.onion", "General Goods & Counterfeits"),
        ("mkt_silkbazaar", "SilkBazaar IV [SYNTHETIC]", "silkbazaar4f2k991abcde234567890fghijklmnop123456789.onion", "Pharmaceuticals & Chemistry"),
        ("mkt_nemesis", "Nemesis Dark Forum [SYNTHETIC]", "nemesisdark8q991abcde234567890fghijklmnop1234567890.onion", "Exploits & Initial Access"),
    ]
    for m_id, name, onion, cat in marketplaces_data:
        m = Marketplace(id=m_id, name=name, onion_address=onion, category=cat, status="active")
        db.add(m)
        graph_store.add_node(m_id, name, "MARKETPLACE", risk_score=75, properties={"category": cat})
    db.commit()

    # 4. 6 Clearnet Hosts (RFC 5737 and RFC 2606)
    clearnet_hosts_data = [
        ("host_fr_ovh", "198.51.100.44", "origin-proxy01.host-node.example.org", "AS16276 (OVH SAS)", "FR", "3f2a8901cb4d82ef01a9c724e5b981245678a9c0d1e2f3a4b5c6d7e8f9012345", ["shadowgate-cloud.example.org", "alphagate-node.example.org"], "Apache/2.4.52 (Ubuntu)", "mmh3_-19283741", "27d27d27d00027d00042d42d000000"),
        ("host_nl_dataplace", "192.0.2.78", "vps-srv99.nl-datacenter.example.net", "AS49981 (WorldStream B.V.)", "NL", "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b", ["backend-drop.nl-datacenter.example.net", "dread-nexus.example.net"], "nginx/1.22.1", "mmh3_84920194", "27d27d27d27d27d27d27d27d27d27d"),
        ("host_de_hetzner", "198.51.100.112", "static-cdn.krypton-market.example.com", "AS24940 (Hetzner Online GmbH)", "DE", "e1d2c3b4a5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90", ["static-cdn.krypton-market.example.com", "krypton-ops.example.com"], "Apache/2.4.41 (Debian) OpenSSL/1.1.1k", "mmh3_-9481023", "28d28d28d00028d00042d42d000000"),
        ("host_ru_selectel", "203.0.113.89", "gw-relay02.secure-transit.example.ru", "AS49505 (Selectel)", "RU", "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff", ["gw-relay02.secure-transit.example.ru", "nemesis-access.example.ru"], "nginx/1.24.0", "mmh3_11029482", "27d27d27d27d27d27d27d27d27d27d"),
        ("host_us_digitalocean", "192.0.2.145", "escrow-api.fintech-nodes.example.com", "AS14061 (DigitalOcean LLC)", "US", "778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566", ["escrow-api.fintech-nodes.example.com", "silk-relay.example.com"], "nginx/1.20.2", "mmh3_4491823", "27d27d27d27d27d27d27d27d27d27d"),
        ("host_ch_privatelayer", "198.51.100.201", "vault-cluster.alpen-host.example.ch", "AS51852 (Private Layer AG)", "CH", "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899", ["vault-cluster.alpen-host.example.ch"], "Apache/2.4.56 (CentOS)", "mmh3_-19283741", "28d28d28d00028d00042d42d000000"),
    ]
    for h_id, ip, host, asn, country, cert_fp, sans, banner, fav, jarm in clearnet_hosts_data:
        ch = ClearnetHost(
            id=h_id, ip_address=ip, hostname=host, asn=asn, country_code=country,
            cert_fingerprint=cert_fp, cert_san=sans, banner=banner, favicon_hash=fav, jarm=jarm
        )
        db.add(ch)
        graph_store.add_node(h_id, f"{ip} ({host})", "CLEARNET_IP", risk_score=80, properties={"asn": asn, "country": country})
    db.commit()

    # 5. 10 Hidden Services (each with rich snapshots, detector findings, and clearnet candidates)
    services_spec = [
        ("hs_shadowgate", "shadowgate991abcde234567890fghijklmnop1234567890123456.onion", "ShadowGate Vault [SYNTHETIC]", "mkt_alphabay", "src_alphabay", 95, {
            "body": "<html><head><title>Apache Server Status for shadowgate-cloud.example.org</title></head><body><h1>Apache Server Status for shadowgate-cloud.example.org (via 198.51.100.44)</h1><dl><dt>Server Version: Apache/2.4.52 (Ubuntu)</dt><dt>Server uptime: 42 days</dt></dl><p>VHost: shadowgate-cloud.example.org</p></body></html>",
            "headers": {"Server": "Apache/2.4.52 (Ubuntu)", "X-Backend": "node-fr-44"},
            "cert": {"cn": "shadowgate-cloud.example.org", "san": ["shadowgate-cloud.example.org", "origin-proxy01.host-node.example.org"]},
            "favicon_hash": "mmh3_-19283741",
            "banners": "Apache/2.4.52 (Ubuntu)",
            "leaked_ips": ["198.51.100.44"]
        }),
        ("hs_krypton", "kryptonpharma781abcde234567890fghijklmnop12345678901234.onion", "Krypton Labs [SYNTHETIC]", "mkt_silkbazaar", "src_silkbazaar", 90, {
            "body": "<html><head><title>Krypton Pharmaceutical Stash</title></head><body><h1>Krypton Catalog</h1><p>Contact Ops: ops@krypton-ops.example.com</p></body></html>",
            "headers": {"Server": "Apache/2.4.41 (Debian) OpenSSL/1.1.1k"},
            "cert": {"cn": "static-cdn.krypton-market.example.com", "san": ["static-cdn.krypton-market.example.com"]},
            "favicon_hash": "mmh3_-9481023",
            "banners": "Apache/2.4.41 (Debian)",
            "leaked_ips": ["198.51.100.112"]
        }),
        ("hs_dreadforum", "dreadnexus3mk991abcde234567890fghijklmnop1234567890.onion", "Dread Nexus Portal [SYNTHETIC]", "mkt_alphabay", "src_dread", 85, {
            "body": "<html><head><title>Dread Discussion Board</title></head><body><h1>Dread Board Nexus</h1></body></html>",
            "headers": {"Server": "nginx/1.22.1", "X-Powered-By": "PHP/8.1.18"},
            "cert": {"cn": "dread-nexus.example.net"},
            "favicon_hash": "mmh3_84920194",
            "banners": "nginx/1.22.1",
            "leaked_ips": ["192.0.2.78"]
        }),
        ("hs_nemesisbbs", "nemesisdark8q991abcde234567890fghijklmnop1234567890.onion", "Nemesis Dark Forum [SYNTHETIC]", "mkt_nemesis", "src_nemesis", 88, {
            "body": "<html><head><title>phpinfo()</title></head><body><h1>PHP Version 8.2.14</h1><table><tr><td>System</td><td>Linux gw-relay02.secure-transit.example.ru 203.0.113.89</td></tr></table></body></html>",
            "headers": {"Server": "nginx/1.24.0"},
            "cert": {"cn": "gw-relay02.secure-transit.example.ru"},
            "favicon_hash": "mmh3_11029482",
            "banners": "nginx/1.24.0",
            "leaked_ips": ["203.0.113.89"]
        }),
        ("hs_silkrelay", "silktransit4491abcde234567890fghijklmnop123456789012.onion", "Silk Transit Relay [SYNTHETIC]", "mkt_silkbazaar", "src_silkbazaar", 78, {
            "body": "<html><body><h1>Escrow API Relay Node</h1><p>Relay endpoint: escrow-api.fintech-nodes.example.com</p></body></html>",
            "headers": {"Server": "nginx/1.20.2"},
            "cert": {"cn": "silk-relay.example.com"},
            "favicon_hash": "mmh3_4491823",
            "banners": "nginx/1.20.2",
            "leaked_ips": ["192.0.2.145"]
        }),
        ("hs_alpenvault", "alpenvault201abcde234567890fghijklmnop12345678901234.onion", "Alpen Cold Vault [SYNTHETIC]", "mkt_nemesis", "src_nemesis", 82, {
            "body": "<html><body><h1>Alpen Bulletproof Vault</h1></body></html>",
            "headers": {"Server": "Apache/2.4.56 (CentOS)"},
            "cert": {"cn": "vault-cluster.alpen-host.example.ch"},
            "favicon_hash": "mmh3_-19283741",
            "banners": "Apache/2.4.56 (CentOS)",
            "leaked_ips": ["198.51.100.201"]
        }),
        ("hs_alphagate", "alphagate4499abcde234567890fghijklmnop12345678901234.onion", "AlphaGate Escrow Core [SYNTHETIC]", "mkt_alphabay", "src_alphabay", 75, {
            "body": "<html><body><h1>AlphaBay High-Speed Routing Gateway</h1></body></html>",
            "headers": {"Server": "Apache/2.4.52 (Ubuntu)"},
            "cert": {"cn": "alphagate-node.example.org"},
            "favicon_hash": "mmh3_-19283741",
            "banners": "Apache/2.4.52 (Ubuntu)",
            "leaked_ips": ["198.51.100.44"]
        }),
        ("hs_ghostnode", "ghostbridge781abcde234567890fghijklmnop123456789012.onion", "GhostBridge Proxy [SYNTHETIC]", "mkt_alphabay", "src_alphabay", 72, {
            "body": "<html><body><h1>GhostBridge Gateway Proxy</h1></body></html>",
            "headers": {"Server": "nginx/1.22.1"},
            "cert": {"cn": "backend-drop.nl-datacenter.example.net"},
            "favicon_hash": "mmh3_84920194",
            "banners": "nginx/1.22.1",
            "leaked_ips": ["192.0.2.78"]
        }),
        ("hs_hydragate", "hydragate1451abcde234567890fghijklmnop123456789012.onion", "Hydra Cash Stash [SYNTHETIC]", "mkt_alphabay", "src_alphabay", 80, {
            "body": "<html><body><h1>Fintech Settlement Gateway</h1></body></html>",
            "headers": {"Server": "nginx/1.20.2"},
            "cert": {"cn": "escrow-api.fintech-nodes.example.com"},
            "favicon_hash": "mmh3_4491823",
            "banners": "nginx/1.20.2",
            "leaked_ips": ["192.0.2.145"]
        }),
        ("hs_zerolink", "zerolink8911abcde234567890fghijklmnop12345678901234.onion", "ZeroAccess Dropzone [SYNTHETIC]", "mkt_nemesis", "src_nemesis", 70, {
            "body": "<html><body><h1>ZeroDay Payload Ingestion Pipeline</h1></body></html>",
            "headers": {"Server": "nginx/1.24.0"},
            "cert": {"cn": "nemesis-access.example.ru"},
            "favicon_hash": "mmh3_11029482",
            "banners": "nginx/1.24.0",
            "leaked_ips": ["203.0.113.89"]
        }),
    ]

    for s_id, onion, name, m_id, src_id, risk, snap_data in services_spec:
        hs = HiddenService(
            id=s_id,
            onion_address=onion,
            name=name,
            marketplace_id=m_id,
            source_id=src_id,
            status="active",
            risk_score=risk,
            first_seen=now - datetime.timedelta(days=random.randint(15, 60)),
            last_seen=now - datetime.timedelta(hours=random.randint(1, 12))
        )
        db.add(hs)
        graph_store.add_node(s_id, name, "ONION", risk_score=risk, properties={"onion": onion})
        graph_store.add_edge(s_id, m_id, "HOSTED_ON", confidence=95)

        # Create Snapshot
        snap = ServiceSnapshot(
            service_id=s_id,
            status_code=200,
            response_time_ms=random.randint(320, 680),
            headers_json=snap_data["headers"],
            body_sample=snap_data["body"][:1000],
            cert_data=snap_data["cert"],
            favicon_hash=snap_data["favicon_hash"],
            banners=snap_data["banners"],
            captured_at=now - datetime.timedelta(hours=2),
            content_hash=hashlib.sha256(snap_data["body"].encode()).hexdigest()[:16]
        )
        db.add(snap)

        # Run Detectors
        findings = detector_engine.analyze_snapshot(snap_data)
        for f in findings:
            mf = MisconfigFinding(
                service_id=s_id,
                rule_id=f.rule_id,
                severity=f.severity,
                title=f.title,
                description=f.description,
                confidence=f.confidence,
                evidence_data=snap_data,
                detected_at=now - datetime.timedelta(hours=2)
            )
            db.add(mf)

    db.commit()

    # Run origin matcher on each service
    for s_id, _, _, _, _, _, snap_data in services_spec:
        origin_matcher.match_service_to_clearnet(db, s_id, snap_data)

    # 6. 10 Threat Actors (with primary handles, handles across marketplaces, PGP, wallets, and persona links)
    actors_spec = [
        ("actor_shadow_broker", "ShadowBroker [SYNTHETIC]", "Exploit Broker", 94, "src_nemesis", [
            ("h_shadow_broker_nem", "ShadowBroker", "mkt_nemesis", "0x3F2A8901CB4D82EF01A9C724E5B981245678A9C0", "phash_a1b2c3d4", "Zero-day weaponized exploits. PGP verified escrow dispatch."),
            ("h_shadow_drop_alpha", "ShadowB_EU", "mkt_alphabay", "0x3F2A8901CB4D82EF01A9C724E5B981245678A9C0", "phash_a1b2c3d4", "Enterprise vulnerability payloads. Escrow order tracking automated.")
        ], [("BTC", "bc1qshadowbroker44918234812348912345678", 450000.0)], "Dmitry S. (Suspect Operator)"),

        ("actor_krypton_pharma", "KryptonPharma [SYNTHETIC]", "Vendor", 89, "src_silkbazaar", [
            ("h_krypton_silk", "KryptonPharma", "mkt_silkbazaar", "0x9A8B7C6D5E4F3A2B1C0D9E8F7A6B5C4D3E2F1A0B", "phash_e5f60718", "Pharmaceutical chemical reagents. Express stealth dispatch worldwide."),
            ("h_krypton_alpha", "KryptonLabs", "mkt_alphabay", "0x9A8B7C6D5E4F3A2B1C0D9E8F7A6B5C4D3E2F1A0B", "phash_e5f60718", "Pure research reagents. Full reship warranty with signed PGP.")
        ], [("BTC", "bc1qkryptonpharma84920194812348912345678", 280000.0)], "Klaus M. (Chemical Logistics)"),

        ("actor_cipher_ghost", "CipherGhost [SYNTHETIC]", "Carding & PII", 85, "src_alphabay", [
            ("h_cipher_alpha", "CipherGhost", "mkt_alphabay", "0xE1D2C3B4A5F60718293A4B5C6D7E8F90A1B2C3D4", "phash_293a4b5c", "High-balance financial dumps and fullz. Instant digital dispatch."),
        ], [("ETH", "0x71C8366420A800CBbe492CE931b777a83d72F8b1", 175000.0)], "Alexandre G. (FinTech Fraud)"),

        ("actor_zero_day_rex", "ZeroDayRex [SYNTHETIC]", "Malware Dev", 91, "src_nemesis", [
            ("h_rex_nemesis", "ZeroDayRex", "mkt_nemesis", "0x11223344556677889900AABBCCDDEEFF11223344", "phash_6d7e8f90", "FUD crypters, polymorphic loaders and UEFI bootkits. Signed delivery.")
        ], [("XMR", "44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otRfh3XUjB2126fJyYFz64v617asZX5qLDUvPMPEUzETm9Q84CHot", 320000.0)], "Sergei V. (Reverse Engineer)"),

        ("actor_hydra_cash", "HydraCashier [SYNTHETIC]", "Money Laundering", 82, "src_alphabay", [
            ("h_hydra_alpha", "HydraCashier", "mkt_alphabay", "0x778899AABBCCDDEEFF00112233445566778899AA", "phash_aabbccdd", "Crypto tumbler and fiat cashout services. Low fee verified escrow.")
        ], [("BTC", "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", 890000.0)], "Igor P. (Cashout Facilitator)"),

        ("actor_dark_mod", "DarkMod_Vance [SYNTHETIC]", "Market Admin", 86, "src_dread", [
            ("h_mod_dread", "DarkMod_Vance", "mkt_dreadnexus", "0xAABBCCDDEEFF00112233445566778899AABBCCDD", "phash_11223344", "Official dispute moderator. All vendor complaints handled via PGP.")
        ], [("BTC", "bc1qdarkmodvance88492019241924128491823", 110000.0)], "Luc V. (Forum Staff)"),

        ("actor_red_specter", "RedSpecter [SYNTHETIC]", "Ransomware Affiliate", 87, "src_nemesis", [
            ("h_specter_nem", "RedSpecter", "mkt_nemesis", "0x5566778899AABBCCDDEEFF001122334455667788", "phash_55667788", "Network corporate access and ransomware affiliate locker partner.")
        ], [("BTC", "bc1qredspecter994182948123489123456789", 410000.0)], "Mikhail K. (Initial Broker)"),

        ("actor_neon_bullet", "NeonBullet [SYNTHETIC]", "Weapons & Armor", 79, "src_alphabay", [
            ("h_neon_alpha", "NeonBullet", "mkt_alphabay", "0x6677889900AABBCCDDEEFF112233445566778899", "phash_99aabbcc", "Deactivated collectibles and kinetic surplus. Sealed container shipping.")
        ], [("BTC", "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy", 95000.0)], "Marco B. (Logistics Forwarder)"),

        ("actor_docu_mint", "DocuMint [SYNTHETIC]", "Forged Identity", 80, "src_dread", [
            ("h_docu_dread", "DocuMint", "mkt_dreadnexus", "0x44556677889900AABBCCDDEEFF11223344556677", "phash_ddeeff00", "Biometric passports, national IDs, and proof of residence documents.")
        ], [("BTC", "bc1qdocumintpassports8819201948123489123", 145000.0)], "Stefan R. (Document Engraver)"),

        ("actor_proxy_king", "ProxyKing [SYNTHETIC]", "Bulletproof Hosting", 84, "src_nemesis", [
            ("h_proxy_nem", "ProxyKing", "mkt_nemesis", "0x223344556677889900AABBCCDDEEFF1122334455", "phash_12345678", "Bulletproof Alpine VPS, DMCA-ignored transit, fast-flux Tor relays.")
        ], [("BTC", "bc1qproxykinghosting99192019481234891234", 230000.0)], "Hanspeter Z. (Infra Admin)")
    ]

    seen_pgp = set()
    for a_id, handle, cat, risk, s_id, handles_info, wallets_info, rw_name in actors_spec:
        actor = Actor(
            id=a_id,
            primary_handle=handle,
            risk_score=risk,
            category=cat,
            source_id=s_id,
            attribution_confidence=round(float(risk) * 0.95, 1),
            last_scan_date=now - datetime.timedelta(hours=random.randint(2, 24)),
            first_seen=now - datetime.timedelta(days=random.randint(60, 180)),
            last_seen=now - datetime.timedelta(hours=random.randint(1, 10)),
            notes=f"Tracked high-profile entity operating across syndicated hidden services. Suspected real-world connection to {rw_name}.",
            activity_timezone="UTC+1 (Central Europe / UK)" if "EU" in handle or "Labs" in handle else "UTC+3 (Eastern Europe / Moscow)",
            stylometry_profile={"avg_word_len": 5.4, "vocab_richness": 0.68, "primary_language": "English (Slavic Syntax)"}
        )
        db.add(actor)
        graph_store.add_node(a_id, handle, "ACTOR", risk_score=risk, properties={"category": cat})

        # Add handles
        for h_id, h_name, m_id, pgp, phash, sample in handles_info:
            h = Handle(
                id=h_id,
                actor_id=a_id,
                marketplace_id=m_id,
                handle_name=h_name,
                vendor_rating=4.95,
                sales_count=random.randint(150, 850),
                first_seen=now - datetime.timedelta(days=random.randint(30, 90)),
                last_seen=now - datetime.timedelta(hours=random.randint(1, 12)),
                pgp_fingerprint=pgp,
                avatar_phash=phash,
                listing_sample=sample
            )
            db.add(h)
            graph_store.add_node(h_id, f"@{h_name}", "HANDLE", risk_score=risk)
            graph_store.add_edge(a_id, h_id, "OWNS_HANDLE", confidence=95)
            graph_store.add_edge(h_id, m_id, "LISTED_ON", confidence=90)

            # Add PGP Key record
            if pgp and pgp not in seen_pgp:
                seen_pgp.add(pgp)
                pk = PGPKey(
                    id=f"pgp_{pgp[-8:].lower()}",
                    fingerprint=pgp,
                    key_id=pgp[-16:],
                    email=f"{h_name.lower()}@sec-mail.example.org",
                    uids=[f"{h_name} <{h_name.lower()}@sec-mail.example.org>"],
                    bits=4096
                )
                db.add(pk)
                graph_store.add_node(pk.id, f"PGP {pk.key_id}", "PGP", risk_score=50)
                graph_store.add_edge(h_id, pk.id, "USES_KEY", confidence=99)
            elif pgp and pgp in seen_pgp:
                graph_store.add_edge(h_id, f"pgp_{pgp[-8:].lower()}", "USES_KEY", confidence=99)

        # Add wallets
        for curr, addr, received in wallets_info:
            w = Wallet(
                id=f"{curr}:{addr}",
                address=addr,
                currency=curr,
                actor_id=a_id,
                total_received_usd=received,
                exchange_exposure_usd=received * 0.45,
                first_seen=now - datetime.timedelta(days=90),
                last_seen=now - datetime.timedelta(days=2)
            )
            db.add(w)
            graph_store.add_node(w.id, f"{curr}: {addr[:10]}...", "WALLET", risk_score=75)
            graph_store.add_edge(a_id, w.id, "CONTROLS_WALLET", confidence=90)

        # Add RealWorldEntity
        rw = RealWorldEntity(
            id=f"rw_{a_id}",
            actor_id=a_id,
            entity_type="SUSPECT_INDIVIDUAL",
            name_or_alias=rw_name,
            country="FR" if "OVH" in rw_name or "Alexandre" in rw_name else ("DE" if "Klaus" in rw_name else "RU"),
            platform="Telegram & ClearWeb Developer Forums",
            confidence_score=82,
            evidence_chain=["PGP Key email match", "KYC Exchange withdrawal", "Timezone activity alignment"]
        )
        db.add(rw)
        graph_store.add_node(rw.id, rw_name, "REAL_WORLD", risk_score=85)
        graph_store.add_edge(a_id, rw.id, "PIVOT_LINK", confidence=82)

    db.commit()

    # 7. Seed PersonaLinks (both PROPOSED and ACCEPTED)
    persona_links_spec = [
        ("h_shadow_drop_alpha", "actor_shadow_broker", "pgp", 95.0, "ACCEPTED", {
            "reasons": ["Identical 40-character PGP Fingerprint match across AlphaBay and Nemesis"],
            "matched_handle": "ShadowBroker",
            "candidate_handle": "ShadowB_EU"
        }),
        ("h_krypton_alpha", "actor_krypton_pharma", "avatar_phash", 88.0, "ACCEPTED", {
            "reasons": ["Perceptual hash collision on listing product catalog image"],
            "matched_handle": "KryptonPharma",
            "candidate_handle": "KryptonLabs"
        }),
        # PROPOSED link: Candidate handle that analyst can ACCEPT or REJECT in the UI!
        ("h_specter_nem", "actor_shadow_broker", "stylometry", 74.0, "PROPOSED", {
            "reasons": ["Character n-gram TF-IDF cosine similarity of 0.74 on exploit listing notes"],
            "matched_handle": "ShadowBroker",
            "candidate_handle": "RedSpecter"
        }),
        ("h_neon_alpha", "actor_cipher_ghost", "stylometry", 68.0, "PROPOSED", {
            "reasons": ["Similar escrow payment handling instructions and common Russian function-word cadence"],
            "matched_handle": "CipherGhost",
            "candidate_handle": "NeonBullet"
        }),
    ]
    for h_id, a_id, method, score, status, rationale in persona_links_spec:
        pl = PersonaLink(
            handle_id=h_id,
            actor_id=a_id,
            method=method,
            score=score,
            status=status,
            rationale=rationale,
            created_at=now - datetime.timedelta(days=2),
            reviewed_by="Analyst Vance" if status == "ACCEPTED" else None
        )
        db.add(pl)
    db.commit()

    # 8. Seed EvidenceUploads (Covering TRUSTED_SOURCE, THREAT_ACTOR_LINKED, and UNKNOWN)
    evidence_spec = [
        ("threat_actor_leak_payload.txt", "txt", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", 1450, "THREAT_ACTOR_LINKED", 95.0, "src_nemesis", "actor_shadow_broker", [
            {"name": "Cryptographic 4096-bit PGP Fingerprint Match", "weight": 95, "matched_value": "0x3F2A8901CB4D82EF01A9C724E5B981245678A9C0", "reason": "PGP key matches verified signature of ShadowBroker"},
            {"name": "Identified Cryptocurrency Deposit Wallet", "weight": 90, "matched_value": "BTC: bc1qshadowbroker44918234812348912345678", "reason": "Wallet address actively indexed to threat actor ShadowBroker"}
        ]),
        ("alphabay_official_market_bulletin.pdf", "pdf", "a4b5c6d7e8f9012345678a9c0d1e2f3a4b5c6d7e8f901234567890abcdef1234", 4200, "TRUSTED_SOURCE", 85.0, "src_alphabay", None, [
            {"name": "Source Verification Check", "weight": 85, "matched_value": "AlphaBay Market Feed [SYNTHETIC]", "reason": "Content provenance validated against verified marketplace feed registry"}
        ]),
        ("unrelated_public_document.txt", "txt", "778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566", 890, "UNKNOWN", 15.0, None, None, [
            {"name": "Baseline Cryptographic & OSINT Scan", "weight": 15, "matched_value": "No darknet signatures found", "reason": "File does not contain known PGP keys, threat wallets, actor avatars, or trusted source stamps."}
        ])
    ]
    for fname, ftype, sha, sz, verdict, tscore, src_id, act_id, sigs in evidence_spec:
        eu = EvidenceUpload(
            filename=fname,
            file_type=ftype,
            sha256=sha,
            size=sz,
            uploaded_at=now - datetime.timedelta(hours=random.randint(3, 24)),
            extracted_json={"char_length": sz, "indicators": {"pgp": [], "btc": []}, "preview": "Synthetic forensic sample preview"},
            signals_json=sigs,
            verdict=verdict,
            trust_score=tscore,
            matched_source_id=src_id,
            matched_actor_id=act_id
        )
        db.add(eu)
    db.commit()

    # 9. Seed IngestRuns (Pipeline telemetry)
    ingest_runs_spec = [
        ("Ingest Feed (feed_alphabay.json)", "src_alphabay", now - datetime.timedelta(minutes=30), now - datetime.timedelta(minutes=29), 2, 0, "SUCCESS", None),
        ("Ingest Feed (feed_dread.json)", "src_dread", now - datetime.timedelta(minutes=15), now - datetime.timedelta(minutes=14), 2, 0, "SUCCESS", None),
        ("Ingest Feed (feed_shadowleaks.json)", "src_shadowleaks", now - datetime.timedelta(minutes=5), now - datetime.timedelta(minutes=5), 0, 2, "REJECTED_BY_GATE", "[RELIABILITY_GATE] Ingestion skipped: Source has reliability_score 45.0 < 60 or trusted=False.")
    ]
    for jname, s_id, start_t, fin_t, ing_cnt, rej_cnt, status, err in ingest_runs_spec:
        ir = IngestRun(
            job_name=jname,
            source_id=s_id,
            started_at=start_t,
            finished_at=fin_t,
            items_ingested=ing_cnt,
            items_rejected=rej_cnt,
            status=status,
            error=err
        )
        db.add(ir)
    db.commit()

    # 10. Cases and Alerts
    c = Case(
        id="CASE-2026-0881",
        title="Operation ShadowNet De-anonymization [SYNTHETIC]",
        status="ACTIVE",
        assigned_analyst="Analyst Vance",
        priority="CRITICAL",
        summary="Targeted deanonymization of exploit brokers leveraging clearnet infrastructure leaks and reused deposit wallets.",
        tags_json=["EXPLOIT_BROKER", "CLEARNET_ORIGIN", "OVH_LEAK"],
        created_at=now - datetime.timedelta(days=7),
        updated_at=now - datetime.timedelta(hours=1)
    )
    db.add(c)
    db.commit()

    ce = CaseEvidence(
        case_id=c.id,
        entity_type="ACTOR",
        entity_id="actor_shadow_broker",
        title="ShadowBroker Actor Profile & Confirmed BTC Wallet",
        sha256_hash="3f2a8901cb4d82ef01a9c724e5b981245678a9c0d1e2f3a4b5c6d7e8f9012345",
        details_json={"attribution_confidence": 94, "primary_handle": "ShadowBroker"},
        added_at=now - datetime.timedelta(days=3)
    )
    db.add(ce)

    al = Alert(
        alert_type="ORIGIN_MATCH",
        title="Critical Origin Match: ShadowGate Vault -> OVH SAS (FR)",
        description="Matched via Apache /server-status and clearnet TLS certificate to 198.51.100.44 with 95% confidence.",
        severity="CRITICAL",
        status="UNREAD",
        entity_type="HIDDEN_SERVICE",
        entity_id="hs_shadowgate",
        timestamp=now - datetime.timedelta(minutes=12),
        metadata_json={"confidence": 95, "ip": "198.51.100.44"}
    )
    db.add(al)

    audit = AuditLog(
        user_name="Analyst Vance",
        action="SEED_DATA_INITIALIZED",
        target_type="SYSTEM",
        target_id="DATABASE",
        details="Deterministic synthetic threat intelligence benchmark database initialized.",
        timestamp=now
    )
    db.add(audit)
    db.commit()

    print("Deterministic synthetic seed complete! Seeded: 3 sources, 3 marketplaces, 6 clearnet hosts, 10 hidden services, 10 actors, 4 persona links, 3 evidence verifications, 3 ingest runs.")

if __name__ == "__main__":
    from backend.app.core.database import SessionLocal
    db_session = SessionLocal()
    seed_database(db_session)
    db_session.close()
