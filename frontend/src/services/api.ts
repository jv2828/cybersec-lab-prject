const API_BASE = '/api/v1';

export async function fetchStats() {
  const res = await fetch(`${API_BASE}/stats`);
  return res.json();
}

export async function fetchServices(filters?: { marketplace_id?: string; min_risk?: number; has_origin_match?: boolean }) {
  const params = new URLSearchParams();
  if (filters?.marketplace_id) params.append('marketplace_id', filters.marketplace_id);
  if (filters?.min_risk) params.append('min_risk', String(filters.min_risk));
  if (filters?.has_origin_match) params.append('has_origin_match', 'true');
  const res = await fetch(`${API_BASE}/services?${params.toString()}`);
  return res.json();
}

export async function fetchServiceDetail(id: string) {
  const res = await fetch(`${API_BASE}/services/${id}`);
  return res.json();
}

export async function reviewOriginCandidate(serviceId: string, candidateId: number, action: 'ACCEPT' | 'REJECT', notes: string = '') {
  const res = await fetch(`${API_BASE}/services/${serviceId}/candidates/${candidateId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, notes })
  });
  return res.json();
}

export async function fetchGraph(nodeType?: string, minConfidence?: number, maxNodes: number = 300) {
  const params = new URLSearchParams();
  if (nodeType) params.append('node_type', nodeType);
  if (minConfidence) params.append('min_confidence', String(minConfidence));
  params.append('max_nodes', String(maxNodes));
  const res = await fetch(`${API_BASE}/graph?${params.toString()}`);
  return res.json();
}

export async function fetchEgoGraph(nodeId: string, hops: number = 2) {
  const res = await fetch(`${API_BASE}/graph/ego/${nodeId}?hops=${hops}`);
  return res.json();
}

export async function findPath(sourceId: string, targetId: string) {
  const res = await fetch(`${API_BASE}/graph/path?source_id=${encodeURIComponent(sourceId)}&target_id=${encodeURIComponent(targetId)}`);
  return res.json();
}

export async function fetchActors() {
  const res = await fetch(`${API_BASE}/actors`);
  return res.json();
}

export async function fetchActorProfile(actorId: string) {
  const res = await fetch(`${API_BASE}/actors/${actorId}`);
  return res.json();
}

export async function fetchPivots() {
  const res = await fetch(`${API_BASE}/pivots`);
  return res.json();
}

export async function fetchCases() {
  const res = await fetch(`${API_BASE}/cases`);
  return res.json();
}

export async function fetchCaseDetail(caseId: string) {
  const res = await fetch(`${API_BASE}/cases/${caseId}`);
  return res.json();
}

export async function createCase(payload: { title: string; priority: string; summary: string; tags: string[] }) {
  const res = await fetch(`${API_BASE}/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function attachEvidence(caseId: string, payload: { entity_type: string; entity_id: string; title: string; details: any }) {
  const res = await fetch(`${API_BASE}/cases/${caseId}/evidence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function fetchAlerts() {
  const res = await fetch(`${API_BASE}/alerts`);
  return res.json();
}

export async function acknowledgeAlert(alertId: number) {
  const res = await fetch(`${API_BASE}/alerts/${alertId}/acknowledge`, { method: 'POST' });
  return res.json();
}

export async function searchEntities(query: string) {
  const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
  return res.json();
}

export async function fetchPipelineStatus() {
  const res = await fetch(`${API_BASE}/pipeline/status`);
  return res.json();
}

export async function triggerSimulatedCrawl() {
  const res = await fetch(`${API_BASE}/pipeline/trigger-simulated-crawl`, { method: 'POST' });
  return res.json();
}
