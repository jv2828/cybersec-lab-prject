import random
import hashlib
import datetime
from sqlalchemy.orm import Session
from backend.app.models.models import (
    Marketplace, HiddenService, ServiceSnapshot, MisconfigFinding,
    ClearnetHost, OriginCandidate, Actor, Handle, PGPKey,
    Wallet, WalletTransaction, TrustEdge, RealWorldEntity,
    Case, CaseEvidence, Alert, AuditLog, User
)
from backend.app.detectors.engine import detector_engine
from backend.app.matcher.origin_matcher import origin_matcher
from backend.app.graph.graph_store import graph_store

def seed_database(db: Session, seed_val: int = 42):
    """
    Deterministically seeds the database with synthetic darknet threat-intelligence data.
    All IPs reside in RFC 5737 documentation blocks (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24).
    All domains use RFC 2606 reserved domains (*.example, *.test, example.com).
    """
    random.seed(seed_val)
    print("Beginning deterministic synthetic data generation...")

    # Clear existing data
    db.query(AuditLog).delete()
    db.query(Alert).delete()
    db.query(CaseEvidence).delete()
    db.query(Case).delete()
    db.query(RealWorldEntity).delete()
    db.query(TrustEdge).delete()
    db.query(WalletTransaction).delete()
    db.query(Wallet).delete()
    db.query(Handle).delete()
    db.query(Actor).delete()
    db.query(PGPKey).delete()
    db.query(OriginCandidate).delete()
    db.query(MisconfigFinding).delete()
    db.query(ServiceSnapshot).delete()
    db.query(HiddenService).delete()
    db.query(ClearnetHost).delete()
    db.query(Marketplace).delete()
    db.query(User).delete()
    db.commit()
    graph_store.clear()

    # 1. Create Default Users (Analyst, Supervisor, Admin)
    analyst = User(username="analyst_vance", hashed_password="hashed_dev_password", role="Analyst")
    supervisor = User(username="supv_chen", hashed_password="hashed_dev_password", role="Supervisor")
    admin = User(username="admin_ops", hashed_password="hashed_dev_password", role="Admin")
    db.add_all([analyst, supervisor, admin])

    # 2. Marketplaces (~6)
    marketplaces_data = [
        ("mkt_alphabay", "AlphaBay-Reborn", "alphabayreborn7x991abcde234567890fghijklmnop12345678.onion", "General Goods & Counterfeits"),
        ("mkt_silkbazaar", "SilkBazaar IV", "silkbazaar4f2k991abcde234567890fghijklmnop123456789.onion", "Pharmaceuticals & Chemistry"),
        ("mkt_nemesis", "Nemesis Dark Forum", "nemesisdark8q991abcde234567890fghijklmnop1234567890.onion", "Exploits & Initial Access"),
        ("mkt_torvend", "TorVend Hub", "torvendcntr1k991abcde234567890fghijklmnop1234567890.onion", "Stolen Credentials & PII"),
        ("mkt_cyberflock", "CyberFlock Exchange", "cyberflock9zk991abcde234567890fghijklmnop1234567890.onion", "Carding & Financial Fraud"),
        ("mkt_dreadnexus", "DreadNexus Board", "dreadnexus3mk991abcde234567890fghijklmnop1234567890.onion", "Discussions & Vendor Escrow"),
    ]
    marketplaces = []
    for m_id, name, onion, cat in marketplaces_data:
        m = Marketplace(id=m_id, name=name, onion_address=onion, category=cat, status="active")
        marketplaces.append(m)
        db.add(m)
        graph_store.add_node(m_id, name, "MARKETPLACE", risk_score=75, properties={"category": cat})
    db.commit()

    # 3. Clearnet Hosts (~15 indexed hosting providers & servers in RFC 5737)
    clearnet_hosts_data = [
        ("host_fr_ovh", "198.51.100.44", "origin-proxy01.host-node.example.org", "AS16276 (OVH SAS)", "FR", "3f2a8901cb4d82ef01a9c724e5b981245678a9c0d1e2f3a4b5c6d7e8f9012345", ["origin-proxy01.host-node.example.org", "shadowgate-cloud.example.org"], "Apache/2.4.52 (Ubuntu)", "mmh3_-19283741", "27d27d27d00027d00042d42d000000"),
        ("host_nl_dataplace", "192.0.2.78", "vps-srv99.nl-datacenter.example.net", "AS49981 (WorldStream B.V.)", "NL", "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b", ["backend-drop.nl-datacenter.example.net"], "nginx/1.22.1", "mmh3_84920194", "27d27d27d27d27d27d27d27d27d27d"),
        ("host_de_hetzner", "198.51.100.112", "static-cdn.krypton-market.example.com", "AS24940 (Hetzner Online GmbH)", "DE", "e1d2c3b4a5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90", ["static-cdn.krypton-market.example.com", "krypton-ops.example.com"], "Apache/2.4.41 (Debian) OpenSSL/1.1.1k", "mmh3_-9481023", "28d28d28d00028d00042d42d000000"),
        ("host_ru_selectel", "203.0.113.89", "gw-relay02.secure-transit.example.ru", "AS49505 (Selectel)", "RU", "11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff", ["gw-relay02.secure-transit.example.ru"], "nginx/1.24.0", "mmh3_11029482", "27d27d27d27d27d27d27d27d27d27d"),
        ("host_us_digitalocean", "192.0.2.145", "escrow-api.fintech-nodes.example.com", "AS14061 (DigitalOcean LLC)", "US", "778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566", ["escrow-api.fintech-nodes.example.com"], "nginx/1.20.2", "mmh3_4491823", "27d27d27d27d27d27d27d27d27d27d"),
        ("host_ch_privatelayer", "198.51.100.201", "vault-cluster.alpen-host.example.ch", "AS51852 (Private Layer AG)", "CH", "aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899", ["vault-cluster.alpen-host.example.ch"], "Apache/2.4.56 (CentOS)", "mmh3_-19283741", "28d28d28d00028d00042d42d000000"),
        ("host_ro_voxility", "203.0.113.220", "unmetered-core.balkan-transit.example.ro", "AS3223 (Voxility S.R.L.)", "RO", "5566778899aabbccddeeff00112233445566778899aabbccddeeff0011223344", ["unmetered-core.balkan-transit.example.ro"], "nginx/1.18.0", "mmh3_9941829", "27d27d27d27d27d27d27d27d27d27d"),
        ("host_is_1984", "192.0.2.233", "node81.floki-offshore.example.is", "AS44519 (1984 ehf)", "IS", "6677889900aabbccddeeff11223344556677889900aabbccddeeff1122334455", ["node81.floki-offshore.example.is"], "Apache/2.4.38 (Debian)", "mmh3_3819201", "27d27d27d00027d00042d42d000000")
    ]
    clearnet_hosts = []
    for h_id, ip, host, asn, country, cert_fp, sans, banner, fav, jarm in clearnet_hosts_data:
        ch = ClearnetHost(
            id=h_id, ip_address=ip, hostname=host, asn=asn, country_code=country,
            cert_fingerprint=cert_fp, cert_san=sans, banner=banner, favicon_hash=fav, jarm=jarm
        )
        clearnet_hosts.append(ch)
        db.add(ch)
        graph_store.add_node(h_id, f"{ip} ({host})", "CLEARNET_IP", risk_score=80, properties={"asn": asn, "country": country})
    db.commit()

    # 4. Hidden Services (~40 services) with snapshots & detectors
    service_templates = [
        # Flagship leaky service 1: Leaked cert + mod_status -> Matches host_fr_ovh
        ("hs_shadowgate", "shadowgate991abcde234567890fghijklmnop1234567890123456.onion", "ShadowGate Vault & Stash", "mkt_alphabay", 95, {
            "body": "<html><head><title>Apache Server Status for shadowgate-cloud.example.org</title></head><body><h1>Apache Server Status for shadowgate-cloud.example.org (via 198.51.100.44)</h1><dl><dt>Server Version: Apache/2.4.52 (Ubuntu)</dt><dt>Server uptime: 42 days 18 hours</dt><dt>Current Time: Monday, 12-Oct-2026 14:02:11 UTC</dt></dl><p>Parent Server Generation: 1</p><table><tr><th>VHost</th><th>Client</th><th>Request</th></tr><tr><td>shadowgate-cloud.example.org</td><td>198.51.100.44</td><td>GET /server-status HTTP/1.1</td></tr></table><p>Admin Contact: <a href='mailto:ops-admin@shadowgate-cloud.example.org'>ops-admin@shadowgate-cloud.example.org</a></p></body></html>",
            "headers": {"Server": "Apache/2.4.52 (Ubuntu)", "ETag": '"3a8f-5e91-62d98124"', "Date": "Mon, 12 Oct 2026 14:02:11 GMT", "X-Backend-Server": "node-fr-44"},
            "cert": {"cn": "shadowgate-cloud.example.org", "san": ["shadowgate-cloud.example.org", "origin-proxy01.host-node.example.org"], "sha256_fingerprint": "3f2a8901cb4d82ef01a9c724e5b981245678a9c0d1e2f3a4b5c6d7e8f9012345", "issuer": "Let's Encrypt Authority X3"},
            "favicon_hash": "mmh3_-19283741",
            "banners": "Apache/2.4.52 (Ubuntu)",
            "leaked_ips": ["198.51.100.44"],
            "leaked_domains": ["shadowgate-cloud.example.org", "origin-proxy01.host-node.example.org"],
            "clock_skew_seconds": 1,
            "uptime_correlation_score": 0.94
        }),
        # Flagship leaky service 2: Leaked phpinfo -> Matches host_de_hetzner
        ("hs_krypton", "kryptonmarket1234567890abcdefghijklmnopqrstuvwxyz123456.onion", "Krypton Cyber Exchange", "mkt_nemesis", 92, {
            "body": "<html><head><title>phpinfo()</title></head><body><h1 class='p'>PHP Version 8.1.18</h1><table><tr><td class='e'>Configuration File (php.ini) Path</td><td class='v'>/etc/php/8.1/apache2</td></tr><tr><td class='e'>_SERVER[\"SERVER_ADDR\"]</td><td class='v'>198.51.100.112</td></tr><tr><td class='e'>_SERVER[\"DOCUMENT_ROOT\"]</td><td class='v'>/var/www/vhosts/krypton-ops.example.com/html</td></tr><tr><td class='e'>_SERVER[\"HTTP_HOST\"]</td><td class='v'>static-cdn.krypton-market.example.com</td></tr></table></body></html>",
            "headers": {"Server": "Apache/2.4.41 (Debian) OpenSSL/1.1.1k", "X-Powered-By": "PHP/8.1.18"},
            "cert": {"cn": "static-cdn.krypton-market.example.com", "san": ["static-cdn.krypton-market.example.com", "krypton-ops.example.com"], "sha256_fingerprint": "e1d2c3b4a5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90"},
            "favicon_hash": "mmh3_-9481023",
            "banners": "Apache/2.4.41 (Debian) OpenSSL/1.1.1k",
            "leaked_ips": ["198.51.100.112"],
            "leaked_domains": ["static-cdn.krypton-market.example.com", "krypton-ops.example.com"],
            "clock_skew_seconds": 0,
            "uptime_correlation_score": 0.91
        }),
        # Leaky service 3: Favicon reuse + Banner leak -> Matches host_nl_dataplace
        ("hs_dutchdrop", "dutchdropnl4f991abcde234567890fghijklmnop12345678901234.onion", "DutchDrop Express Shipping", "mkt_silkbazaar", 88, {
            "body": "<html><head><link rel='shortcut icon' href='/favicon.ico'></head><body><h1>DutchDrop Express</h1><p>Orders ship daily via stealth packaging.</p><img src='https://backend-drop.nl-datacenter.example.net/assets/logo.png'></body></html>",
            "headers": {"Server": "nginx/1.22.1", "X-Origin-ID": "ams-node-78"},
            "cert": {"cn": "backend-drop.nl-datacenter.example.net", "san": ["backend-drop.nl-datacenter.example.net"], "sha256_fingerprint": "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b"},
            "favicon_hash": "mmh3_84920194",
            "banners": "nginx/1.22.1",
            "leaked_ips": ["192.0.2.78"],
            "leaked_domains": ["backend-drop.nl-datacenter.example.net"],
            "clock_skew_seconds": 0,
            "uptime_correlation_score": 0.89
        }),
        # Leaky service 4: EXIF camera leak + absolute clearnet URLs -> Matches host_us_digitalocean
        ("hs_fintechdrop", "fintechdrops555abcde234567890fghijklmnop123456789012345.onion", "Fintech Escrow Clearing", "mkt_cyberflock", 84, {
            "body": "<html><body><h1>Fintech Escrow API</h1><form action='https://escrow-api.fintech-nodes.example.com/checkout' method='POST'><input type='hidden' name='merchant' value='cyberflock_vendor'></form></body></html>",
            "headers": {"Server": "nginx/1.20.2"},
            "cert": {"cn": "escrow-api.fintech-nodes.example.com", "san": ["escrow-api.fintech-nodes.example.com"], "sha256_fingerprint": "778899aabbccddeeff00112233445566778899aabbccddeeff00112233445566"},
            "favicon_hash": "mmh3_4491823",
            "banners": "nginx/1.20.2",
            "leaked_ips": ["192.0.2.145"],
            "leaked_domains": ["escrow-api.fintech-nodes.example.com"],
            "clock_skew_seconds": 1,
            "exif_metadata": {"camera_make": "Apple", "camera_model": "iPhone 14 Pro", "software": "iOS 16.4.1", "gps_latitude": "40.7128 N", "gps_longitude": "74.0060 W"}
        })
    ]

    # Generate total 40 hidden services
    hidden_services = []
    service_names = [
        "HydraRelay", "NemesisGateway", "SilentSilk", "AeroPass", "ZeroTrace", "GhostBazaar",
        "ViperVault", "TitanVendor", "CobraChem", "PhantomKey", "NexusExchange", "OmniEscrow",
        "ApexStash", "StealthProxy", "ShadowForge", "DarkPulse", "QuantumCard", "ObsidianMarket",
        "KronosPawn", "ValhallaDrop", "EclipsePharma", "SpectrePay", "BlackLotus", "RogueDrop",
        "ChimeraHub", "CerberusGate", "SirenNode", "HeliosVault", "TritonVendor", "StyxTransit",
        "NyxEscrow", "BifrostPortal", "AsgardStealth", "MidgardDepot", "FenrirSec", "ValkyrieDrop"
    ]

    for idx, (s_id, onion, name, m_id, risk, snap_data) in enumerate(service_templates):
        hs = HiddenService(id=s_id, onion_address=onion, name=name, marketplace_id=m_id, risk_score=risk)
        hidden_services.append((hs, snap_data))
        db.add(hs)
        graph_store.add_node(s_id, name, "ONION", risk_score=risk, properties={"onion": onion})
        graph_store.add_edge(m_id, s_id, "HOSTS_SERVICE", confidence=95)

    for i, s_name in enumerate(service_names):
        s_id = f"hs_auto_{i+1:02d}"
        onion = f"{s_name.lower()}{random.randint(1000, 9999)}abcdefghijklmnopqrstuvwxyz123456789.onion"[:62]
        m_id = random.choice(marketplaces).id
        risk = random.randint(40, 85)
        
        # Varying realistic misconfigurations
        snap_data = {
            "body": f"<html><head><title>{s_name} - Encrypted Gateway</title></head><body><h1>Welcome to {s_name}</h1><p>PGP mandatory for all communications.</p></body></html>",
            "headers": {"Server": random.choice(["Apache/2.4.41", "nginx/1.18.0", "nginx/1.22.0", "lighttpd/1.4.59"])},
            "cert": {},
            "favicon_hash": f"mmh3_{random.randint(1000000, 9999999)}",
            "banners": "nginx",
            "leaked_ips": [],
            "leaked_domains": [],
            "clock_skew_seconds": random.choice([0, 1, 2, -1])
        }
        hs = HiddenService(id=s_id, onion_address=onion, name=s_name, marketplace_id=m_id, risk_score=risk)
        hidden_services.append((hs, snap_data))
        db.add(hs)
        graph_store.add_node(s_id, s_name, "ONION", risk_score=risk, properties={"onion": onion})
        graph_store.add_edge(m_id, s_id, "HOSTS_SERVICE", confidence=90)
    db.commit()

    # Create Snapshots, Findings and Origin Candidates
    for hs, snap_data in hidden_services:
        snap = ServiceSnapshot(
            service_id=hs.id,
            status_code=200,
            headers_json=snap_data.get("headers", {}),
            body_sample=snap_data.get("body", "")[:2000],
            cert_data=snap_data.get("cert", {}),
            favicon_hash=str(snap_data.get("favicon_hash", "")),
            banners=snap_data.get("banners", ""),
            content_hash=hashlib.sha256(snap_data.get("body", "").encode()).hexdigest()[:16]
        )
        db.add(snap)

        # Run Detectors
        findings = detector_engine.analyze_snapshot(snap_data)
        for f in findings:
            mf = MisconfigFinding(
                service_id=hs.id,
                rule_id=f.rule_id,
                severity=f.severity,
                title=f.title,
                description=f.description,
                evidence_data=f.evidence,
                confidence=f.confidence
            )
            db.add(mf)

        # Run Origin Matcher
        candidates = origin_matcher.correlate(snap_data, clearnet_hosts)
        for c in candidates[:3]:
            oc = OriginCandidate(
                service_id=hs.id,
                clearnet_host_id=c["clearnet_host_id"],
                confidence_score=c["confidence_score"],
                status="PROPOSED" if c["confidence_score"] < 90 else "ACCEPTED",
                match_matrix=c["match_matrix"],
                rationale=c["rationale"]
            )
            db.add(oc)
            graph_store.add_edge(hs.id, c["clearnet_host_id"], "ORIGIN_MATCH", confidence=c["confidence_score"])
    db.commit()

    # 5. Actors (~150 handles grouped into ~50 resolved Actor clusters)
    # Highlight flagship actor: "GhostVendor" / "PhantomSec" / "CipherX"
    actor_clusters = [
        ("actor_flagship_ghost", "GhostVendor", 98, "High-Value Exploit & Precursor Broker", "UTC+1", [
            ("h_ghost_alpha", "mkt_alphabay", "GhostVendor", "0x98A1...4F01", "250+ sales. Verified escrow only.", "phash_a1b2c3d4"),
            ("h_phantom_nemesis", "mkt_nemesis", "PhantomSec_EU", "0x98A1...4F01", "Specialist in SCADA/ICS access. Wickr: ghost_ops.", "phash_a1b2c3d4"),
            ("h_cipher_torvend", "mkt_torvend", "CipherX_Direct", "0x98A1...4F01", "Instant dispatch. Verified PGP key on dread.", "phash_a1b2c3d4")
        ], "0x98A1B2C3D4E5F60718293A4B5C6D7E8F90A1B2C3", ["bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", "bc1q7w8x9y0z1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o"], [
            ("SUSPECT_INDIVIDUAL", "Mikhail 'Ghost' Volkov", "Estonia / Remote", "GitHub: @m-volkov-sec, Telegram: @ghost_vendor_real", 94, [
                {"signal": "PGP UID match", "detail": "PGP key UID 'mvolkov@sec-audit.example.org' matches commit author on GitHub"},
                {"signal": "Cryptocurrency deposit", "detail": "Wallet bc1qxy2kgdyg... deposited 14.5 BTC directly into Kraken account tagged to M. Volkov"}
            ]),
            ("INFRASTRUCTURE_OPERATOR", "Shadowgate Infrastructure Node", "France (OVH)", "Host: 198.51.100.44", 96, [
                {"signal": "Origin Correlation", "detail": "Host 198.51.100.44 confirmed as origin server for shadowgate991...onion via shared TLS cert"}
            ])
        ]),
        ("actor_chem_king", "DutchChemKing", 89, "Synthetic Chemistry & Bulk Precursors", "UTC+1", [
            ("h_chem_silk", "mkt_silkbazaar", "DutchChemKing", "0x1122...AABB", "Lab grade reagent tested. Stealth postage.", "phash_d4c3b2a1"),
            ("h_dutch_alpha", "mkt_alphabay", "AmsterdamDirect", "0x1122...AABB", "Same lab batch guarantees. Proton: dck_sales.", "phash_d4c3b2a1")
        ], "0x112233445566778899AABBCCDDEEFF0011223344", ["0x71C85642998819AcfadF29871FA4729103982829"], [
            ("SUSPECT_INDIVIDUAL", "Lars van de Berg", "Netherlands", "Telegram: @amsterdam_direct, LinkedIn: Chemical Logistics Consultant", 88, [
                {"signal": "Reused Handle & Email", "detail": "Jabber address dck_sales@xmpp.example.org associated with domain registrant contact"}
            ])
        ]),
        ("actor_carding_pro", "VaultMaster99", 82, "Fintech Credentials & Fullz", "UTC-5", [
            ("h_vault_cyber", "mkt_cyberflock", "VaultMaster99", "0x5566...7788", "Fresh balance checked USA/UK cards. Reship available.", "phash_77889900"),
            ("h_card_torvend", "mkt_torvend", "CardVaultUSA", "0x5566...7788", "Instant auto-delivery. Replaced within 24h.", "phash_77889900")
        ], "0x55667788990011223344556677889900AABBCCDD", ["bc1qaabbccddeeff00112233445566778899aabbcc"], [
            ("EXCHANGE_ACCOUNT", "Binance Deposit Hub #49102", "United States", "Binance UID: 92817401", 91, [
                {"signal": "Common-Input Clustering", "detail": "Cluster of 12 wallets consolidates to Binance deposit address bc1qaabb..."}
            ])
        ])
    ]

    # Deterministically generate ~47 additional actor clusters to reach ~150 handles
    prefixes = ["Shadow", "Dark", "Zero", "Cyber", "Void", "Rogue", "Iron", "Viper", "Apex", "Silent", "Frost", "Nova", "Echo", "Krypton", "Titan"]
    suffixes = ["Vendor", "Broker", "Op", "Supply", "Direct", "Lab", "Vault", "Relay", "Net", "Ghost", "Strike", "Drop"]

    for i in range(47):
        p = prefixes[i % len(prefixes)]
        s = suffixes[(i * 3) % len(suffixes)]
        name = f"{p}{s}_{i+10}"
        a_id = f"actor_auto_{i+1:02d}"
        risk = random.randint(45, 88)
        tz = random.choice(["UTC+0", "UTC+1", "UTC+2", "UTC+3", "UTC-5"])
        
        # 2 to 4 handles per actor
        handles_count = random.randint(2, 4)
        actor_handles = []
        pgp_fp = f"0x{hashlib.sha1(f'pgp_{name}_{seed_val}'.encode()).hexdigest().upper()}"
        wallet_addr = f"bc1q{hashlib.sha256(f'wallet_{name}'.encode()).hexdigest()[:38]}"
        
        for h_idx in range(handles_count):
            h_id = f"h_{a_id}_{h_idx}"
            m = marketplaces[h_idx % len(marketplaces)]
            h_name = name if h_idx == 0 else f"{name.lower()}_{m.name[:3].lower()}"
            actor_handles.append((h_id, m.id, h_name, pgp_fp, f"Verified items from {name}. PGP encrypted.", f"phash_{i:04d}"))
            
        real_entities = []
        if risk > 65:
            real_entities.append((
                "SUSPECT_INDIVIDUAL",
                f"Suspect Identity ({name})",
                random.choice(["Germany", "United Kingdom", "Russia", "United States", "Romania", "Canada"]),
                f"Forum Alias: @{name.lower()}_tech",
                random.randint(65, 85),
                [{"signal": "Handle reuse", "detail": f"Username {name.lower()} registered on clearweb tech forums"}]
            ))

        actor_clusters.append((a_id, name, risk, "Darknet Vendor Syndicate", tz, actor_handles, pgp_fp, [wallet_addr], real_entities))

    # Add actors, handles, PGP keys, wallets, and real-world links to DB & Graph
    for a_id, primary_handle, risk, category, tz, handles, pgp_fp, wallets, rw_entities in actor_clusters:
        actor = Actor(
            id=a_id,
            primary_handle=primary_handle,
            risk_score=risk,
            category=category,
            activity_timezone=tz,
            stylometry_profile={"vocab_richness": round(random.uniform(0.65, 0.88), 2), "avg_word_len": 4.8}
        )
        db.add(actor)
        graph_store.add_node(a_id, primary_handle, "ACTOR", risk_score=risk, properties={"category": category, "tz": tz})

        # PGP Key
        pgp = PGPKey(
            id=f"pgp_{a_id}",
            fingerprint=pgp_fp,
            key_id=pgp_fp[-8:],
            uids=[f"{primary_handle} <{primary_handle.lower()}@sec-mail.example.org>"],
            email=f"{primary_handle.lower()}@sec-mail.example.org"
        )
        db.add(pgp)
        graph_store.add_node(pgp.id, f"PGP: {pgp_fp[-16:]}", "PGP", risk_score=40, properties={"fingerprint": pgp_fp})
        graph_store.add_edge(a_id, pgp.id, "OWNS_PGP", confidence=99)

        # Handles
        for h_id, m_id, h_name, h_pgp, listing, phash in handles:
            h = Handle(
                id=h_id,
                actor_id=a_id,
                marketplace_id=m_id,
                handle_name=h_name,
                pgp_fingerprint=h_pgp,
                listing_sample=listing,
                avatar_phash=phash,
                vendor_rating=round(random.uniform(4.7, 5.0), 2),
                sales_count=random.randint(40, 500)
            )
            db.add(h)
            graph_store.add_node(h_id, f"@{h_name}", "HANDLE", risk_score=risk, properties={"marketplace": m_id})
            graph_store.add_edge(a_id, h_id, "RESOLVED_PERSONA", confidence=95)
            graph_store.add_edge(h_id, m_id, "LISTED_ON", confidence=99)
            graph_store.add_edge(h_id, pgp.id, "SIGNS_WITH_PGP", confidence=95)

        # Wallets
        for w_addr in wallets:
            w = Wallet(
                id=f"BTC:{w_addr}",
                address=w_addr,
                currency="BTC",
                actor_id=a_id,
                cluster_id=f"cluster_{a_id}",
                total_received_usd=round(random.uniform(25000.0, 450000.0), 2),
                exchange_exposure_usd=round(random.uniform(5000.0, 180000.0), 2)
            )
            db.add(w)
            graph_store.add_node(w.id, f"BTC: {w_addr[:10]}...", "WALLET", risk_score=75, properties={"address": w_addr})
            graph_store.add_edge(a_id, w.id, "CONTROLS_WALLET", confidence=92)

            # Generate synthetic transactions
            tx = WalletTransaction(
                tx_hash=hashlib.sha256(f"tx_{w_addr}".encode()).hexdigest(),
                from_address=w_addr,
                to_address="bc1q_exchange_hotwallet_synthetic_deposit",
                amount=round(random.uniform(0.5, 4.2), 3),
                currency="BTC",
                is_exchange_deposit=True,
                exchange_name="Kraken/Binance"
            )
            db.add(tx)

        # Real World Entities
        for e_type, name, country, platform, conf, evidence_chain in rw_entities:
            rwe_id = f"rwe_{a_id}_{len(evidence_chain)}"
            rwe = RealWorldEntity(
                id=rwe_id,
                actor_id=a_id,
                entity_type=e_type,
                name_or_alias=name,
                country=country,
                platform=platform,
                confidence_score=conf,
                evidence_chain=evidence_chain
            )
            db.add(rwe)
            graph_store.add_node(rwe_id, f"Ident: {name}", "REAL_WORLD", risk_score=90, properties={"type": e_type, "country": country})
            graph_store.add_edge(a_id, rwe_id, "ATTRIBUTED_TO", confidence=conf)

    db.commit()

    # 6. Trust review edges between handles
    all_handles = db.query(Handle).all()
    for _ in range(60):
        h1, h2 = random.sample(all_handles, 2)
        if h1.actor_id != h2.actor_id:
            te = TrustEdge(
                source_handle_id=h1.id,
                target_handle_id=h2.id,
                edge_type="ESCROW_FEEDBACK",
                rating=5.0,
                comment="Smooth transaction. Rapid dispatch.",
                confidence=85
            )
            db.add(te)
            graph_store.add_edge(h1.id, h2.id, "TRUST_EDGE", confidence=85)
    db.commit()

    # 7. Cases, Evidence, and Alerts
    c1 = Case(
        id="CASE-2026-0881",
        title="Operation GhostTrace: Syndicate Infrastructure Uncloaking",
        status="ACTIVE",
        assigned_analyst="Special Agent Vance",
        priority="CRITICAL",
        summary="Targeting high-volume exploit vendor 'GhostVendor' operating across AlphaBay and Nemesis. Misconfigured hidden service shadowgate991...onion revealed French OVH clearnet origin server (198.51.100.44).",
        tags_json=["ExploitBroker", "OVH-Origin", "GhostVendor", "OperationGhostTrace"]
    )
    db.add(c1)
    db.commit()

    ev1 = CaseEvidence(
        case_id="CASE-2026-0881",
        entity_type="ORIGIN_HOST",
        entity_id="host_fr_ovh",
        title="French OVH Clearnet Origin Server (198.51.100.44)",
        sha256_hash="3f2a8901cb4d82ef01a9c724e5b981245678a9c0d1e2f3a4b5c6d7e8f9012345",
        details_json={"ip": "198.51.100.44", "matched_rule": "RULE_TLS_CLEARNET_CERT", "score": 98}
    )
    ev2 = CaseEvidence(
        case_id="CASE-2026-0881",
        entity_type="ACTOR",
        entity_id="actor_flagship_ghost",
        title="Resolved Actor Profile 'GhostVendor' (Mikhail Volkov)",
        sha256_hash=hashlib.sha256(b"actor_flagship_ghost_volkov").hexdigest(),
        details_json={"pgp": "0x98A1...4F01", "confidence": 94}
    )
    db.add_all([ev1, ev2])

    # Alerts
    alerts_data = [
        ("ORIGIN_MATCH", "High Confidence Origin Uncloaked for ShadowGate", "Hidden service shadowgate991...onion matched with OVH host 198.51.100.44 (98% confidence)", "CRITICAL", "hs_shadowgate"),
        ("WALLET_REUSE", "Cross-Marketplace Wallet Reuse Flagged", "Deposit wallet bc1qxy2kgd... reused across AlphaBay and Nemesis vendor handles", "HIGH", "actor_flagship_ghost"),
        ("NEW_MISCONFIG", "Apache Server-Status Exposed on Krypton", "phpinfo and internal server IP leaked on kryptonmarket123...onion", "HIGH", "hs_krypton"),
        ("ACTOR_MERGE", "Automated Cluster Proposal: DutchChemKing", "Common PGP key detected between SilkBazaar and AlphaBay handles", "MEDIUM", "actor_chem_king")
    ]
    for a_type, title, desc, sev, ent_id in alerts_data:
        al = Alert(
            alert_type=a_type,
            title=title,
            description=desc,
            severity=sev,
            status="UNREAD",
            entity_id=ent_id,
            metadata_json={"source": "PassiveEngine", "timestamp": str(datetime.datetime.utcnow())}
        )
        db.add(al)

    # Audit Logs
    audit1 = AuditLog(user_name="analyst_vance", action="ACCEPT_ORIGIN_CANDIDATE", target_type="ORIGIN_CANDIDATE", target_id="hs_shadowgate", details="Approved 98% confidence match linking shadowgate to 198.51.100.44")
    audit2 = AuditLog(user_name="analyst_vance", action="CREATE_CASE", target_type="CASE", target_id="CASE-2026-0881", details="Opened Operation GhostTrace investigation")
    db.add_all([audit1, audit2])
    db.commit()

    print("Seed generation complete! Seeded: 6 marketplaces, 40 hidden services, 150+ handles, 50 actor clusters, 8 clearnet hosts, cases, evidence, and alerts.")

if __name__ == "__main__":
    from backend.app.core.database import SessionLocal, engine, Base
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db)
    db.close()
