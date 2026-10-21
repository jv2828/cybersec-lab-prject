import React, { useState, useEffect } from 'react';
import { 
  Globe2, 
  Server, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Eye, 
  ArrowRight,
  Filter,
  Check,
  X,
  Download,
  RotateCcw,
  AlertTriangle,
  Lock,
  Layers
} from 'lucide-react';
import { 
  fetchServices, 
  fetchServiceDetail, 
  reviewOriginCandidate, 
  getExportUrl, 
  DateFilter 
} from '../services/api';
import { PageHeader } from '../components/PageHeader';

interface ServicesViewProps {
  initialServiceId?: string;
  onNavigate: (tab: string, targetId?: string) => void;
  dateFilter: DateFilter;
}

export const ServicesView: React.FC<ServicesViewProps> = ({ 
  initialServiceId, 
  onNavigate, 
  dateFilter 
}) => {
  const [services, setServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(initialServiceId || '');
  const [serviceDetail, setServiceDetail] = useState<any>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filterMarket, setFilterMarket] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reviewMessage, setReviewMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadList() {
      setLoadingList(true);
      setErrorMsg(null);
      try {
        const data = await fetchServices({ 
          marketplace_id: filterMarket || undefined,
          date_from: dateFilter.date_from,
          date_to: dateFilter.date_to
        });
        setServices(data);
        if (!selectedServiceId && data.length > 0) {
          setSelectedServiceId(data[0].id);
        } else if (selectedServiceId && !data.some((s: any) => s.id === selectedServiceId) && data.length > 0) {
          setSelectedServiceId(data[0].id);
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to fetch hidden services from database.');
      } finally {
        setLoadingList(false);
      }
    }
    loadList();
  }, [filterMarket, dateFilter]);

  useEffect(() => {
    if (!selectedServiceId) return;
    async function loadDetail() {
      setLoadingDetail(true);
      try {
        const data = await fetchServiceDetail(selectedServiceId);
        setServiceDetail(data);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoadingDetail(false);
      }
    }
    loadDetail();
  }, [selectedServiceId]);

  const handleReview = async (candidateId: number, action: 'ACCEPT' | 'REJECT') => {
    try {
      const res = await reviewOriginCandidate(selectedServiceId, candidateId, action, 'Analyst verified against CT logs');
      setReviewMessage(res.message);
      const updated = await fetchServiceDetail(selectedServiceId);
      setServiceDetail(updated);
      setTimeout(() => setReviewMessage(''), 4000);
    } catch (err: any) {
      setReviewMessage(`Review failed: ${err.message || 'Server error'}`);
    }
  };

  const filteredServices = services.filter((s) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchOnion = s.onion_address.toLowerCase().includes(q);
      if (!matchName && !matchOnion) return false;
    }
    return true;
  });

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1500, margin: '0 auto' }}>
      <PageHeader
        title="Hidden Services & Origin Matching"
        description="Tor hidden service misconfiguration scanner, exposed server-status correlation, and clearnet origin matching."
        helpText="Inspect Tor hidden services for SSL certificate leaks, exposed server-status banners, and favicon hashes. Accept or reject matched clearnet origin server candidates."
        breadcrumbs={[
          { label: 'Hidden Services', onClick: () => setSelectedServiceId(services[0]?.id || '') },
          ...(serviceDetail ? [{ label: serviceDetail.name }] : [])
        ]}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <a
              href={getExportUrl('services', 'csv', dateFilter)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#e2e8f0',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <Download size={13} /> Export Services CSV
            </a>
            <a
              href={getExportUrl('services', 'json', dateFilter)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#e2e8f0',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <Download size={13} /> Export JSON
            </a>
          </div>
        }
      />

      <div style={{ display: 'flex', gap: 24, height: 'calc(100vh - 240px)', minHeight: 650 }}>
        {/* LEFT SIDEBAR: Service List & Search */}
        <div style={{
          width: 380,
          background: '#141416',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 10,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Filter Bar */}
          <div style={{ padding: 14, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: '#101012' }}>
            <div style={{ marginBottom: 10 }}>
              <input
                type="text"
                placeholder="Search onion, service name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  background: '#0a0a0c',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 6,
                  color: '#e2e8f0',
                  fontSize: 12,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <select
              value={filterMarket}
              onChange={(e) => setFilterMarket(e.target.value)}
              style={{
                width: '100%',
                background: '#0a0a0c',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 6,
                color: '#cbd5e1',
                padding: '6px 10px',
                fontSize: 12
              }}
            >
              <option value="">All Marketplaces & Forums</option>
              <option value="mkt_alphabay">AlphaBay Market</option>
              <option value="mkt_dreadnexus">Dread Nexus Forum</option>
              <option value="mkt_silkbazaar">SilkBazaar IV</option>
              <option value="mkt_nemesis">Nemesis Dark Forum</option>
            </select>
          </div>

          {/* Service items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {loadingList && (
              <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                Scanning hidden services repository...
              </div>
            )}

            {errorMsg && (
              <div style={{ padding: 14, background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', fontSize: 12, borderRadius: 6, margin: 8 }}>
                {errorMsg}
              </div>
            )}

            {!loadingList && filteredServices.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                <div>No hidden services found for this criteria.</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>Clear your search query or reset date timeline.</div>
              </div>
            )}

            {!loadingList && filteredServices.map((s) => {
              const isSelected = s.id === selectedServiceId;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedServiceId(s.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 8,
                    marginBottom: 6,
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(167, 139, 250, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                    border: isSelected ? '1px solid #7c3aed' : '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#c084fc' : '#ffffff' }}>
                      {s.name}
                    </span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: s.risk_score >= 80 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: s.risk_score >= 80 ? '#f87171' : '#fbbf24',
                      border: s.risk_score >= 80 ? '1px solid #ef4444' : '1px solid #f59e0b'
                    }}>
                      RISK {s.risk_score}
                    </span>
                  </div>

                  <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', wordBreak: 'break-all' }}>
                    {s.onion_address}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: 11, color: '#64748b' }}>
                    <span>{s.findings_count} misconfigs</span>
                    {s.top_origin_candidate ? (
                      <span style={{ color: '#34d399', fontWeight: 600 }}>
                        Origin: {s.top_origin_candidate.ip} ({s.top_origin_candidate.confidence}%)
                      </span>
                    ) : (
                      <span style={{ color: '#64748b' }}>Unmatched origin</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT DETAIL PANEL */}
        <div style={{
          flex: 1,
          background: '#141416',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 10,
          overflowY: 'auto',
          padding: 28
        }}>
          {loadingDetail ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
              Loading hidden service telemetry...
            </div>
          ) : !serviceDetail ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              Select a hidden service from the left to inspect misconfigurations and origin candidates.
            </div>
          ) : (
            <div>
              {/* Header Info */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                paddingBottom: 20,
                marginBottom: 24,
                flexWrap: 'wrap',
                gap: 16
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', margin: 0 }}>
                      {serviceDetail.name}
                    </h1>
                    <span style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid #ef4444',
                      color: '#f87171',
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700
                    }}>
                      THREAT SCORE {serviceDetail.risk_score}/100
                    </span>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 13, fontFamily: 'monospace', color: '#a78bfa' }}>
                    {serviceDetail.onion_address}
                  </div>

                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, display: 'flex', gap: 16 }}>
                    <span>Marketplace: <strong style={{ color: '#e2e8f0' }}>{serviceDetail.marketplace_id}</strong></span>
                    <span>Source: <strong style={{ color: '#34d399' }}>{serviceDetail.source_id || 'AlphaBay'}</strong></span>
                    <span>Last Scan: <strong style={{ color: '#e2e8f0' }}>{new Date(serviceDetail.last_seen).toLocaleDateString()}</strong></span>
                  </div>
                </div>

                {/* Quick Pivot action */}
                <div>
                  <button
                    onClick={() => onNavigate('verify')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      background: '#7c3aed',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Verify Evidence From This Service
                  </button>
                </div>
              </div>

              {reviewMessage && (
                <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: 6, color: '#34d399', fontSize: 12, marginBottom: 20 }}>
                  {reviewMessage}
                </div>
              )}

              {/* ORIGIN CANDIDATES SECTION (Flagship) */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 10,
                padding: 20,
                marginBottom: 28
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px 0', color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Server size={16} color="#34d399" /> Matched Clearnet Origin Candidates ({serviceDetail.origin_candidates?.length || 0})
                </h3>

                {serviceDetail.origin_candidates && serviceDetail.origin_candidates.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {serviceDetail.origin_candidates.map((cand: any) => (
                      <div
                        key={cand.id}
                        style={{
                          background: '#141416',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: 8,
                          padding: 16
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div>
                            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color: '#34d399' }}>
                              {cand.clearnet_ip}
                            </span>
                            <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 10 }}>
                              Host: {cand.clearnet_hostname || 'Unresolved'} &bull; ASN: {cand.clearnet_asn || 'OVH-SAS'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#34d399' }}>
                              {cand.confidence_score}% CONFIDENCE
                            </span>
                            {cand.status === 'ACCEPTED' ? (
                              <span style={{ background: '#10b981', color: '#000', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>
                                ACCEPTED
                              </span>
                            ) : cand.status === 'REJECTED' ? (
                              <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>
                                REJECTED
                              </span>
                            ) : (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  onClick={() => handleReview(cand.id, 'ACCEPT')}
                                  style={{
                                    padding: '4px 10px',
                                    background: '#10b981',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Accept Origin
                                </button>
                                <button
                                  onClick={() => handleReview(cand.id, 'REJECT')}
                                  style={{
                                    padding: '4px 10px',
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid #ef4444',
                                    color: '#f87171',
                                    borderRadius: 4,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Evidence signals */}
                        <div style={{ background: '#0a0a0c', padding: 10, borderRadius: 6, fontSize: 12 }}>
                          <div style={{ fontWeight: 700, color: '#a78bfa', marginBottom: 4 }}>CORROBORATING SIGNALS:</div>
                          {cand.evidence_signals && cand.evidence_signals.map((sig: any, idx: number) => (
                            <div key={idx} style={{ color: '#cbd5e1', marginBottom: 2 }}>
                              &bull; <strong>{sig.type}:</strong> {sig.reason || sig.detail} (weight: +{sig.weight || 20})
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>
                    No clearnet origin server has been definitively linked to this hidden service yet.
                  </div>
                )}
              </div>

              {/* MISCONFIGURATION FINDINGS */}
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px 0', color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldAlert size={16} color="#f59e0b" /> Detected Vulnerability Findings ({serviceDetail.findings?.length || 0})
                </h3>

                {serviceDetail.findings && serviceDetail.findings.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {serviceDetail.findings.map((f: any) => (
                      <div
                        key={f.id}
                        style={{
                          background: '#0a0a0c',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 8,
                          padding: 14
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>
                            {f.title || f.rule_id}
                          </span>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: 4,
                            background: f.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: f.severity === 'CRITICAL' ? '#f87171' : '#fbbf24',
                            border: f.severity === 'CRITICAL' ? '1px solid #ef4444' : '1px solid #f59e0b'
                          }}>
                            {f.severity}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>
                          {f.description}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: '#94a3b8' }}>
                    No active misconfigurations detected on this snapshot.
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
