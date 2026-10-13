import pytest
from backend.app.detectors.engine import detector_engine

def test_mod_status_detector():
    snapshot = {
        "body": "<html><body><h1>Apache Server Status for shadowgate-cloud.example.org</h1><dl><dt>Server Version: Apache/2.4.52</dt><dt>Server uptime: 10 days</dt></dl><p>Parent Server Generation: 1</p></body></html>",
        "headers": {"Server": "Apache/2.4.52"}
    }
    findings = detector_engine.analyze_snapshot(snapshot)
    rule_ids = [f.rule_id for f in findings]
    assert "RULE_MOD_STATUS" in rule_ids

def test_phpinfo_detector():
    snapshot = {
        "body": "<html><body><h1>phpinfo()</h1><td class='e'>Configuration File (php.ini) Path</td><td class='v'>/etc/php</td></body></html>",
        "headers": {}
    }
    findings = detector_engine.analyze_snapshot(snapshot)
    rule_ids = [f.rule_id for f in findings]
    assert "RULE_PHPINFO" in rule_ids

def test_tls_clearnet_cert_detector():
    snapshot = {
        "body": "<html><body>Darknet Portal</body></html>",
        "cert": {
            "cn": "origin-prod.example.org",
            "san": ["origin-prod.example.org", "vault.example.com"],
            "sha256_fingerprint": "3f2a8901cb4d82ef..."
        }
    }
    findings = detector_engine.analyze_snapshot(snapshot)
    rule_ids = [f.rule_id for f in findings]
    assert "RULE_TLS_CLEARNET_CERT" in rule_ids

def test_ip_leak_detector():
    snapshot = {
        "body": "<!-- Debug info: Connected to proxy 198.51.100.44 by user /home/deployer/ -->",
        "headers": {}
    }
    findings = detector_engine.analyze_snapshot(snapshot)
    rule_ids = [f.rule_id for f in findings]
    assert "RULE_IP_HOSTNAME_BODY" in rule_ids

def test_mixed_content_detector():
    snapshot = {
        "body": "<html><head><link rel='stylesheet' href='https://cdn.assets-global.example.com/style.css'></head><body>Content</body></html>",
        "headers": {}
    }
    findings = detector_engine.analyze_snapshot(snapshot)
    rule_ids = [f.rule_id for f in findings]
    assert "RULE_MIXED_CONTENT" in rule_ids
