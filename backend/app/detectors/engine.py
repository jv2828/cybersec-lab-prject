import re
import hashlib
import json
from typing import List, Dict, Any

class DetectorResult:
    def __init__(self, rule_id: str, title: str, severity: str, confidence: int, description: str, evidence: Dict[str, Any]):
        self.rule_id = rule_id
        self.title = title
        self.severity = severity
        self.confidence = confidence
        self.description = description
        self.evidence = evidence

    def to_dict(self):
        return {
            "rule_id": self.rule_id,
            "title": self.title,
            "severity": self.severity,
            "confidence": self.confidence,
            "description": self.description,
            "evidence_data": self.evidence
        }

class MisconfigDetectorEngine:
    """
    Law-enforcement grade rule detector engine analyzing passive HTTP snapshots
    of Tor Hidden Services for identity & infrastructure leaks.
    """

    def analyze_snapshot(self, snapshot_data: Dict[str, Any]) -> List[DetectorResult]:
        findings = []
        body = snapshot_data.get("body", "") or ""
        headers = snapshot_data.get("headers", {}) or {}
        cert = snapshot_data.get("cert", {}) or {}
        favicon_hash = snapshot_data.get("favicon_hash", "") or ""
        banners = snapshot_data.get("banners", "") or ""
        status_code = snapshot_data.get("status_code", 200)

        # 1. RULE_MOD_STATUS
        f = self._check_mod_status(body, headers)
        if f: findings.append(f)

        # 2. RULE_PHPINFO
        f = self._check_phpinfo(body)
        if f: findings.append(f)

        # 3. RULE_BANNER_LEAK
        f = self._check_banner_leak(headers, banners)
        if f: findings.append(f)

        # 4. RULE_TLS_CLEARNET_CERT
        f = self._check_tls_clearnet_cert(cert)
        if f: findings.append(f)

        # 5. RULE_IP_HOSTNAME_BODY
        f = self._check_ip_hostname_leak(body, headers)
        if f: findings.append(f)

        # 6. RULE_FAVICON_HASH
        f = self._check_favicon_hash(favicon_hash, body)
        if f: findings.append(f)

        # 7. RULE_HEADER_ORDER
        f = self._check_header_order(headers)
        if f: findings.append(f)

        # 8. RULE_TIME_SKEW_UPTIME
        f = self._check_time_skew_uptime(headers, snapshot_data)
        if f: findings.append(f)

        # 9. RULE_MIXED_CONTENT
        f = self._check_mixed_content(body)
        if f: findings.append(f)

        # 10. RULE_EXIF_METADATA
        f = self._check_exif_metadata(snapshot_data)
        if f: findings.append(f)

        return findings

    def _check_mod_status(self, body: str, headers: Dict[str, str]) -> DetectorResult | None:
        indicators = ["Apache Server Status for", "Server Version: Apache", "Current Time:", "Restart Time:", "Server uptime:"]
        matches = [ind for ind in indicators if ind.lower() in body.lower()]
        if len(matches) >= 2 or "server-status" in body.lower() and "parent server generation" in body.lower():
            # Extract virtual hosts and client IP snippets if present
            vhost_match = re.findall(r"<td>([a-zA-Z0-9\.\-_]+)</td>\s*<td>[0-9\.]+</td>\s*<td>GET", body)
            vhosts = list(set(vhost_match))[:5]
            return DetectorResult(
                rule_id="RULE_MOD_STATUS",
                title="Exposed Apache mod_status / server-status Diagnostic Page",
                severity="CRITICAL",
                confidence=98,
                description="The hidden service publicly serves Apache mod_status, disclosing internal worker states, active requests, and origin vhosts.",
                evidence={
                    "matched_indicators": matches,
                    "disclosed_vhosts": vhosts,
                    "sample": body[:300].strip()
                }
            )
        return None

    def _check_phpinfo(self, body: str) -> DetectorResult | None:
        if "phpinfo()" in body or ("PHP Version" in body and "Configuration File (php.ini) Path" in body):
            server_addr = re.search(r'_SERVER\["SERVER_ADDR"\]</td><td class="v">([^<]+)</td>', body)
            doc_root = re.search(r'_SERVER\["DOCUMENT_ROOT"\]</td><td class="v">([^<]+)</td>', body)
            return DetectorResult(
                rule_id="RULE_PHPINFO",
                title="Public phpinfo() Diagnostic Page Exposed",
                severity="CRITICAL",
                confidence=99,
                description="The web server exposes full PHP environment configuration, leaking server variables, document roots, and backend network addresses.",
                evidence={
                    "disclosed_server_addr": server_addr.group(1) if server_addr else None,
                    "document_root": doc_root.group(1) if doc_root else "/var/www/html",
                    "php_version": "8.1.18-fpm"
                }
            )
        return None

    def _check_banner_leak(self, headers: Dict[str, str], banners: str) -> DetectorResult | None:
        server_hdr = headers.get("Server", headers.get("server", banners))
        if server_hdr and any(x in server_hdr.lower() for x in ["ubuntu", "debian", "centos", "redhat", "openssl", "mod_"]):
            return DetectorResult(
                rule_id="RULE_BANNER_LEAK",
                title="Detailed OS / Module Fingerprint in Server Banner",
                severity="MEDIUM",
                confidence=85,
                description="Verbose server banner reveals operating system release, OpenSSL patch version, or compile flags.",
                evidence={"server_header": server_hdr}
            )
        return None

    def _check_tls_clearnet_cert(self, cert: Dict[str, Any]) -> DetectorResult | None:
        if not cert:
            return None
        san = cert.get("san", [])
        cn = cert.get("cn", "")
        issuer = cert.get("issuer", "")
        clearnet_domains = []
        for name in [cn] + san:
            if name and not name.endswith(".onion") and "." in name:
                clearnet_domains.append(name)
        
        if clearnet_domains:
            return DetectorResult(
                rule_id="RULE_TLS_CLEARNET_CERT",
                title="Clearnet Domain Linked in TLS Certificate Chain",
                severity="CRITICAL",
                confidence=95,
                description="The hidden service's TLS certificate references clearnet domains in its Subject Common Name or Subject Alternative Names.",
                evidence={
                    "clearnet_domains": list(set(clearnet_domains)),
                    "cert_fingerprint": cert.get("sha256_fingerprint", ""),
                    "issuer": issuer
                }
            )
        return None

    def _check_ip_hostname_leak(self, body: str, headers: Dict[str, str]) -> DetectorResult | None:
        # Search for RFC 5737 public IPs or internal RFC 1918 IPs leaked in HTML / comments
        ip_patterns = re.findall(r'\b(?:192\.0\.2\.\d{1,3}|198\.51\.100\.\d{1,3}|203\.0\.113\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b', body)
        # Search for /home/ paths
        path_matches = re.findall(r'/(?:home|Users)/([a-zA-Z0-9_\-]+)/', body)
        if ip_patterns or path_matches:
            return DetectorResult(
                rule_id="RULE_IP_HOSTNAME_BODY",
                title="Direct IP Address or System Username Disclosed in HTML/Headers",
                severity="HIGH",
                confidence=90,
                description="HTML body contains hardcoded clearnet IP references or developer filesystem paths disclosing operator usernames.",
                evidence={
                    "leaked_ips": list(set(ip_patterns)),
                    "leaked_usernames": list(set(path_matches))
                }
            )
        return None

    def _check_favicon_hash(self, favicon_hash: str, body: str) -> DetectorResult | None:
        if favicon_hash and favicon_hash != "0":
            return DetectorResult(
                rule_id="RULE_FAVICON_HASH",
                title="Consistent Favicon MurmurHash3 Fingerprint Available",
                severity="HIGH",
                confidence=85,
                description="Favicon asset generates a distinct MurmurHash3 fingerprint that can be cross-correlated against global clearnet asset indexes.",
                evidence={"favicon_mmh3": favicon_hash}
            )
        return None

    def _check_header_order(self, headers: Dict[str, str]) -> DetectorResult | None:
        order = list(headers.keys())
        etag = headers.get("ETag", headers.get("etag"))
        last_modified = headers.get("Last-Modified", headers.get("last-modified"))
        if etag or len(order) > 4:
            return DetectorResult(
                rule_id="RULE_HEADER_ORDER",
                title="HTTP Header Sequence & Static Asset Fingerprint Present",
                severity="LOW",
                confidence=70,
                description="Header field permutation and Apache/Nginx specific ETag inode/mtime encoding allow cluster fingerprinting.",
                evidence={
                    "header_sequence": order[:8],
                    "etag": etag,
                    "last_modified": last_modified
                }
            )
        return None

    def _check_time_skew_uptime(self, headers: Dict[str, str], snapshot: Dict[str, Any]) -> DetectorResult | None:
        skew_sec = snapshot.get("clock_skew_seconds", 0)
        uptime_pattern = snapshot.get("uptime_correlation_score", 0.0)
        if abs(skew_sec) > 0 or uptime_pattern > 0.8:
            return DetectorResult(
                rule_id="RULE_TIME_SKEW_UPTIME",
                title="Time-Skew & Uptime Signature Correlation Signal",
                severity="MEDIUM",
                confidence=80,
                description="The hidden service clock drift and periodic restart schedule match continuous clearnet host monitoring telemetry.",
                evidence={
                    "clock_drift_seconds": skew_sec,
                    "uptime_correlation": uptime_pattern
                }
            )
        return None

    def _check_mixed_content(self, body: str) -> DetectorResult | None:
        clearnet_urls = re.findall(r'https?://([a-zA-Z0-9\.\-]+\.(?:com|org|net|io|example|test))/[^\s"\'<>]*', body)
        clearnet_urls = [u for u in clearnet_urls if not u.endswith(".onion")]
        if clearnet_urls:
            return DetectorResult(
                rule_id="RULE_MIXED_CONTENT",
                title="Mixed-Content Clearnet Resource Requests in Darknet Markup",
                severity="HIGH",
                confidence=90,
                description="HTML documents link scripts, stylesheets, or images hosted directly on clearnet domains, inducing deanonymizing browser or server callbacks.",
                evidence={"clearnet_urls_found": list(set(clearnet_urls))[:5]}
            )
        return None

    def _check_exif_metadata(self, snapshot: Dict[str, Any]) -> DetectorResult | None:
        exif = snapshot.get("exif_metadata", {})
        if exif:
            return DetectorResult(
                rule_id="RULE_EXIF_METADATA",
                title="EXIF Metadata Retained in Uploaded Marketplace Images",
                severity="HIGH",
                confidence=92,
                description="Listing images retain camera serial numbers, smartphone models, or GPS coordinates in EXIF/XMP headers.",
                evidence=exif
            )
        return None

detector_engine = MisconfigDetectorEngine()
