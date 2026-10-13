import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_api_stats():
    response = client.get("/api/v1/stats")
    assert response.status_code == 200
    data = response.json()
    assert "kpis" in data
    assert data["kpis"]["services_monitored"] > 0
    assert data["kpis"]["actors_resolved"] > 0

def test_api_list_services():
    response = client.get("/api/v1/services")
    assert response.status_code == 200
    services = response.json()
    assert len(services) > 0
    assert "onion_address" in services[0]

def test_api_service_detail():
    response = client.get("/api/v1/services/hs_shadowgate")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "hs_shadowgate"
    assert len(data["findings"]) > 0
    assert len(data["candidates"]) > 0

def test_api_graph():
    response = client.get("/api/v1/graph?max_nodes=50")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) > 0

def test_api_cases():
    response = client.get("/api/v1/cases")
    assert response.status_code == 200
    cases = response.json()
    assert len(cases) > 0
    assert "CASE-2026-0881" in [c["id"] for c in cases]
