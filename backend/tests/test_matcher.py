import pytest
from backend.app.matcher.origin_matcher import origin_matcher
from backend.app.models.models import ClearnetHost

def test_origin_matcher_exact_cert_and_san():
    host = ClearnetHost(
        id="host_test_1",
        ip_address="198.51.100.44",
        hostname="origin-proxy01.example.org",
        cert_fingerprint="3f2a8901cb4d82ef",
        cert_san=["origin-proxy01.example.org"],
        favicon_hash="mmh3_-19283741",
        banner="Apache/2.4.52"
    )

    snapshot_data = {
        "cert": {
            "sha256_fingerprint": "3f2a8901cb4d82ef",
            "san": ["origin-proxy01.example.org"]
        },
        "favicon_hash": "mmh3_-19283741",
        "banners": "Apache/2.4.52",
        "leaked_ips": ["198.51.100.44"],
        "leaked_domains": ["origin-proxy01.example.org"]
    }

    candidates = origin_matcher.correlate(snapshot_data, [host])
    assert len(candidates) == 1
    top = candidates[0]
    assert top["clearnet_host_id"] == "host_test_1"
    assert top["confidence_score"] >= 90
    assert top["match_matrix"]["cert_fingerprint"]["match"] is True
    assert top["match_matrix"]["leaked_ip_exact"]["match"] is True
