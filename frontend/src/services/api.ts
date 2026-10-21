const API_BASE = '/api/v1';

export interface DateFilter {
  date_from?: string;
  date_to?: string;
}

export async function fetchStats(filters?: DateFilter) {
  const params = new URLSearchParams();
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);
  const res = await fetch(`${API_BASE}/stats?${params.toString()}`);
  return res.json();
}

export async function fetchServices(filters?: { 
  marketplace_id?: string; 
  min_risk?: number; 
  has_origin_match?: boolean;
  date_from?: string;
  date_to?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.marketplace_id) params.append('marketplace_id', filters.marketplace_id);
  if (filters?.min_risk) params.append('min_risk', String(filters.min_risk));
  if (filters?.has_origin_match) params.append('has_origin_match', 'true');
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);
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

export async function fetchGraph(nodeType?: string, minConfidence?: number, maxNodes: number = 300, filters?: DateFilter) {
  const params = new URLSearchParams();
  if (nodeType) params.append('node_type', nodeType);
  if (minConfidence) params.append('min_confidence', String(minConfidence));
  params.append('max_nodes', String(maxNodes));
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);
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

export async function fetchActors(filters?: DateFilter) {
  const params = new URLSearchParams();
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);
  const res = await fetch(`${API_BASE}/actors?${params.toString()}`);
  return res.json();
}

export async function fetchActorProfile(actorId: string) {
  const res = await fetch(`${API_BASE}/actors/${actorId}`);
  return res.json();
}

export async function reviewPersonaLink(linkId: number, action: 'ACCEPT' | 'REJECT', notes: string = '') {
  const res = await fetch(`${API_BASE}/actors/persona-links/${linkId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, notes })
  });
  return res.json();
}

export async function verifyEvidence(formData: FormData) {
  const res = await fetch(`${API_BASE}/evidence/verify`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Verification failed' }));
    throw new Error(err.detail || 'Verification failed');
  }
  return res.json();
}

export async function fetchEvidenceHistory(filters?: DateFilter) {
  const params = new URLSearchParams();
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);
  const res = await fetch(`${API_BASE}/evidence?${params.toString()}`);
  return res.json();
}

export async function fetchEvidenceDetail(id: number) {
  const res = await fetch(`${API_BASE}/evidence/${id}`);
  return res.json();
}

export async function fetchSources() {
  const res = await fetch(`${API_BASE}/sources`);
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

export async function toggleAutonomousMode(enabled: boolean) {
  const res = await fetch(`${API_BASE}/pipeline/autonomous`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled })
  });
  return res.json();
}

export async function triggerPipelineRunNow() {
  const res = await fetch(`${API_BASE}/pipeline/run-now`, {
    method: 'POST'
  });
  return res.json();
}

export function getExportUrl(dataset: 'actors' | 'services' | 'findings' | 'evidence', format: 'csv' | 'json', filters?: DateFilter) {
  const params = new URLSearchParams();
  params.append('format', format);
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);
  return `${API_BASE}/export/${dataset}?${params.toString()}`;
}

export function getReportUrl(filters?: DateFilter) {
  const params = new URLSearchParams();
  if (filters?.date_from) params.append('date_from', filters.date_from);
  if (filters?.date_to) params.append('date_to', filters.date_to);
  return `${API_BASE}/export/report?${params.toString()}`;
}
