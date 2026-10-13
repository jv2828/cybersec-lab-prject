import pytest
from backend.app.resolver.entity_resolver import entity_resolver

def test_resolver_pgp_match():
    handle_a = {
        "handle_name": "GhostVendor",
        "pgp_fingerprint": "0x98A1B2C3D4E5F60718293A4B5C6D7E8F90A1B2C3",
        "wallets": ["bc1q_test_1"],
        "listing_sample": "Trusted vendor escrow orders dispatch"
    }
    handle_b = {
        "handle_name": "PhantomSec_EU",
        "pgp_fingerprint": "0x98A1B2C3D4E5F60718293A4B5C6D7E8F90A1B2C3",
        "wallets": ["bc1q_test_2"],
        "listing_sample": "Trusted vendor escrow orders dispatch"
    }

    score, reasons, matrix = entity_resolver.evaluate_link(handle_a, handle_b)
    assert score >= 90
    assert matrix["pgp_match"]["match"] is True

def test_resolver_wallet_reuse():
    handle_a = {
        "handle_name": "ShadowVendor",
        "pgp_fingerprint": None,
        "wallets": ["bc1q_shared_wallet_address"],
        "listing_sample": "Fast delivery guaranteed."
    }
    handle_b = {
        "handle_name": "ShadowDrop",
        "pgp_fingerprint": None,
        "wallets": ["bc1q_shared_wallet_address"],
        "listing_sample": "Fast delivery guaranteed."
    }

    score, reasons, matrix = entity_resolver.evaluate_link(handle_a, handle_b)
    assert score >= 80
    assert matrix["wallet_reuse"]["match"] is True
