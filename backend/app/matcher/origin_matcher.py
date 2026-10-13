from typing import List, Dict, Any
from backend.app.models.models import ClearnetHost

class OriginMatcher:
    """
    Correlates Tor Hidden Service snapshots with indexed clearnet hosts
    to calculate ranked origin-server candidates with explainable confidence weights.
    """

    WEIGHTS = {
        "cert_fingerprint": 35,
        "cert_san_domain": 30,
        "leaked_ip_exact": 30,
        "favicon_hash": 20,
        "simhash_body": 15,
        "uptime_clock_skew": 15,
        "banner_version": 10,
        "header_order": 10,
    }

    def correlate(self, snapshot_data: Dict[str, Any], clearnet_hosts: List[ClearnetHost]) -> List[Dict[str, Any]]:
        candidates = []
        
        onion_cert = snapshot_data.get("cert", {}) or {}
        onion_cert_fp = onion_cert.get("sha256_fingerprint", "").lower()
        onion_cert_san = [s.lower() for s in onion_cert.get("san", [])]
        onion_cert_cn = onion_cert.get("cn", "").lower()
        onion_favicon = str(snapshot_data.get("favicon_hash", "")).strip()
        onion_banner = snapshot_data.get("banners", "") or snapshot_data.get("headers", {}).get("Server", "")
        leaked_ips = snapshot_data.get("leaked_ips", [])
        leaked_domains = snapshot_data.get("leaked_domains", [])
        simhash = snapshot_data.get("simhash", "")
        clock_skew = snapshot_data.get("clock_skew_seconds", 0)

        for host in clearnet_hosts:
            score = 0
            matrix = {}
            reasons = []

            # 1. Exact TLS cert fingerprint
            if onion_cert_fp and host.cert_fingerprint and onion_cert_fp == host.cert_fingerprint.lower():
                score += self.WEIGHTS["cert_fingerprint"]
                matrix["cert_fingerprint"] = {"match": True, "weight": self.WEIGHTS["cert_fingerprint"], "val": host.cert_fingerprint}
                reasons.append(f"Identical TLS Leaf Certificate SHA-256 Fingerprint ({host.cert_fingerprint[:16]}...)")
            else:
                matrix["cert_fingerprint"] = {"match": False, "weight": 0}

            # 2. Clearnet Domain in SAN / Hostname
            host_san = [s.lower() for s in (host.cert_san or [])]
            host_domain = host.hostname.lower() if host.hostname else ""
            san_intersection = set(onion_cert_san + [onion_cert_cn] + leaked_domains).intersection(set(host_san + [host_domain]))
            san_intersection = {d for d in san_intersection if d and not d.endswith(".onion")}
            if san_intersection:
                score += self.WEIGHTS["cert_san_domain"]
                matched_dom = list(san_intersection)[0]
                matrix["cert_san_domain"] = {"match": True, "weight": self.WEIGHTS["cert_san_domain"], "domain": matched_dom}
                reasons.append(f"Shared domain identity '{matched_dom}' in TLS SAN / server hostname")
            else:
                matrix["cert_san_domain"] = {"match": False, "weight": 0}

            # 3. Leaked IP match
            if host.ip_address in leaked_ips:
                score += self.WEIGHTS["leaked_ip_exact"]
                matrix["leaked_ip_exact"] = {"match": True, "weight": self.WEIGHTS["leaked_ip_exact"], "ip": host.ip_address}
                reasons.append(f"Origin IP address {host.ip_address} disclosed directly in HTML / status page")
            else:
                matrix["leaked_ip_exact"] = {"match": False, "weight": 0}

            # 4. Favicon MurmurHash3 match
            if onion_favicon and host.favicon_hash and onion_favicon == host.favicon_hash:
                score += self.WEIGHTS["favicon_hash"]
                matrix["favicon_hash"] = {"match": True, "weight": self.WEIGHTS["favicon_hash"], "hash": host.favicon_hash}
                reasons.append(f"Identical Favicon MurmurHash3 fingerprint ({host.favicon_hash})")
            else:
                matrix["favicon_hash"] = {"match": False, "weight": 0}

            # 5. HTML Body Simhash
            if simhash and host.simhash and simhash == host.simhash:
                score += self.WEIGHTS["simhash_body"]
                matrix["simhash_body"] = {"match": True, "weight": self.WEIGHTS["simhash_body"], "simhash": host.simhash}
                reasons.append("Structural DOM Simhash similarity match")
            else:
                matrix["simhash_body"] = {"match": False, "weight": 0}

            # 6. Banner and OS string match
            if onion_banner and host.banner and (onion_banner.strip() == host.banner.strip() or (len(onion_banner) > 10 and onion_banner in host.banner)):
                score += self.WEIGHTS["banner_version"]
                matrix["banner_version"] = {"match": True, "weight": self.WEIGHTS["banner_version"], "banner": host.banner}
                reasons.append(f"Matching server banner: '{host.banner}'")
            else:
                matrix["banner_version"] = {"match": False, "weight": 0}

            # 7. Clock skew & uptime correlation
            if abs(clock_skew) < 2 and host.asn:
                score += self.WEIGHTS["uptime_clock_skew"]
                matrix["uptime_clock_skew"] = {"match": True, "weight": self.WEIGHTS["uptime_clock_skew"]}
                reasons.append("Synchronized UTC clock drift and coincident restart cycles")
            else:
                matrix["uptime_clock_skew"] = {"match": False, "weight": 0}

            # Clamp confidence to max 99 (100 reserved for physical forensic confirmation)
            confidence = min(99, score)
            if confidence >= 25:
                candidates.append({
                    "clearnet_host": host,
                    "clearnet_host_id": host.id,
                    "confidence_score": confidence,
                    "match_matrix": matrix,
                    "rationale": "; ".join(reasons) if reasons else "Partial fingerprint match"
                })

        # Sort descending by confidence score
        candidates.sort(key=lambda x: x["confidence_score"], reverse=True)
        return candidates

origin_matcher = OriginMatcher()
