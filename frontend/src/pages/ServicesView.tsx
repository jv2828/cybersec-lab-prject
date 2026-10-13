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
  X
} from 'lucide-react';
import { fetchServices, fetchServiceDetail, reviewOriginCandidate } from '../services/api';

interface ServicesViewProps {
  initialServiceId?: string;
  onNavigate: (tab: string, targetId?: string) => void;
}

export const ServicesView: React.FC<ServicesViewProps> = ({ initialServiceId, onNavigate }) => {
  const [services, setServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(initialServiceId || '');
  const [serviceDetail, setServiceDetail] = useState<any>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filterMarket, setFilterMarket] = useState<string>('');
  const [reviewMessage, setReviewMessage] = useState<string>('');

  useEffect(() => {
    async function loadList() {
      try {
        const data = await fetchServices({ marketplace_id: filterMarket || undefined });
        setServices(data);
        if (!selectedServiceId && data.length > 0) {
          setSelectedServiceId(data[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingList(false);
      }
    }
    loadList();
  }, [filterMarket]);

  useEffect(() => {
    if (!selectedServiceId) return;
    async function loadDetail() {
      setLoadingDetail(true);
      try {
        const data = await fetchServiceDetail(selectedServiceId);
        setServiceDetail(data);
      } catch (err) {
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
      // Reload detail
      const updated = await fetchServiceDetail(selectedServiceId);
      setServiceDetail(updated);
      setTimeout(() => setReviewMessage(''), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 72px)', overflow: 'hidden' }}>
      {/* Left Sidebar: Service List */}
      <div style={{
        width: 380,
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        background: '#0d0e10',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>HIDDEN SERVICES</span>
            <span style={{ fontSize: 12, color: '#a78bfa', fontFamily: 'var(--font-mono)' }}>{services.length} Monitored</span>
          </div>

          {/* Filter selector */}
          <select
            value={filterMarket}
            onChange={(e) => setFilterMarket(e.target.value)}
            style={{
              width: '100%',
              background: '#18191c',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              color: '#cbd5e1',
              padding: '6px 10px',
              fontSize: 12,
              outline: 'none'
            }}
          >
            <option value="">All Marketplaces</option>
            <option value="mkt_alphabay">AlphaBay-Reborn</option>
            <option value="mkt_nemesis">Nemesis Dark Forum</option>
            <option value="mkt_silkbazaar">SilkBazaar IV</option>
            <option value="mkt_cyberflock">CyberFlock Exchange</option>
          </select>
        </div>

        {/* List items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {loadingList && <div style={{ padding: 20, color: '#94a3b8', fontSize: 13 }}>Loading services...</div>}
          {!loadingList && services.map((s) => {
            const isSelected = s.id === selectedServiceId;
            return (
              <div
                key={s.id}
                onClick={() => setSelectedServiceId(s.id)}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  marginBottom: 6,
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(167, 139, 250, 0.12)' : 'transparent',
                  border: isSelected ? '1px solid rgba(167, 139, 250, 0.35)' : '1px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#a78bfa' : '#fff' }}>{s.name}</span>
                  <span className={`badge ${s.risk_score >= 80 ? 'badge-critical' : 'badge-high'}`} style={{ fontSize: 10 }}>
                    RISK {s.risk_score}
                  </span>
                </div>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#64748b', wordBreak: 'break-all' }}>
                  {s.onion_address.slice(0, 24)}...onion
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 11 }}>
                  <span style={{ color: '#94a3b8' }}>{s.findings_count} Leaks</span>
                  {s.top_origin_confidence > 0 ? (
                    <span style={{ color: '#10b981', fontWeight: 600 }}>
                      Match: {s.top_origin_confidence}%
                    </span>
                  ) : (
                    <span style={{ color: '#64748b' }}>No origin match</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Content: Service Detail, Evidence, & Origin Matcher */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px', background: '#080808' }}>
        {loadingDetail || !serviceDetail ? (
          <div style={{ padding: 40, color: '#94a3b8' }}>Loading service inspection...</div>
        ) : (
          <div>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 24,
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: 20
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>{serviceDetail.name}</h1>
                  <span className={`badge ${serviceDetail.risk_score >= 80 ? 'badge-critical' : 'badge-high'}`}>
                    THREAT SCORE {serviceDetail.risk_score}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: '#38bdf8', marginTop: 6 }}>
                  {serviceDetail.onion_address}
                </div>
              </div>

              <button
                onClick={() => onNavigate('graph', serviceDetail.id)}
                className="btn-pill btn-glass"
              >
                Inspect in Actor Graph &rarr;
              </button>
            </div>

            {/* Notification message */}
            {reviewMessage && (
              <div style={{
                padding: '12px 18px',
                borderRadius: 10,
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#34d399',
                fontSize: 13,
                marginBottom: 20
              }}>
                {reviewMessage}
              </div>
            )}

            {/* Section 1: Clearnet Origin Server Candidates (Capability 1 flagship) */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Server size={18} color="#10b981" />
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
                  Likely Origin Server Attributions (Multi-Signal Correlation)
                </h2>
              </div>

              {serviceDetail.candidates.length === 0 ? (
                <div className="glass-panel" style={{ padding: 24, color: '#94a3b8', fontSize: 13 }}>
                  No clearnet hosts met the &ge; 25% confidence threshold for this hidden service.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {serviceDetail.candidates.map((cand: any) => {
                    const host = cand.clearnet_host || {};
                    return (
                      <div key={cand.id} className="glass-panel" style={{ padding: 24, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                                {host.ip_address}
                              </span>
                              <span className="badge badge-success">
                                {cand.confidence_score}% CONFIDENCE
                              </span>
                              <span className={`badge ${cand.status === 'ACCEPTED' ? 'badge-success' : 'badge-medium'}`}>
                                STATUS: {cand.status}
                              </span>
                            </div>
                            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                              Hostname: <strong style={{ color: '#cbd5e1' }}>{host.hostname || 'N/A'}</strong> &bull; ASN: {host.asn} ({host.country_code})
                            </div>
                          </div>

                          {/* Human in the loop review buttons */}
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => handleReview(cand.id, 'ACCEPT')}
                              className="btn-pill btn-white"
                              style={{ padding: '6px 14px', fontSize: 12 }}
                            >
                              <Check size={14} color="#10b981" /> Accept Origin
                            </button>
                            <button
                              onClick={() => handleReview(cand.id, 'REJECT')}
                              className="btn-pill btn-glass"
                              style={{ padding: '6px 14px', fontSize: 12 }}
                            >
                              <X size={14} color="#ef4444" /> Reject
                            </button>
                          </div>
                        </div>

                        {/* Rationale and breakdown */}
                        <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 16, background: 'rgba(0,0,0,0.4)', padding: '10px 14px', borderRadius: 8 }}>
                          <strong>Investigative Rationale:</strong> {cand.rationale}
                        </div>

                        {/* Signal Match Matrix */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                          {Object.entries(cand.match_matrix).map(([sigKey, sigVal]: any) => (
                            <div key={sigKey} style={{
                              padding: '10px 12px',
                              background: sigVal.match ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                              border: sigVal.match ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(255, 255, 255, 0.05)',
                              borderRadius: 8
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: sigVal.match ? '#34d399' : '#64748b' }}>
                                  {sigKey.toUpperCase()}
                                </span>
                                {sigVal.match ? <CheckCircle2 size={13} color="#10b981" /> : <XCircle size={13} color="#64748b" />}
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                                Weight: +{sigVal.weight || 0}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Misconfiguration Findings */}
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <ShieldAlert size={18} color="#f59e0b" />
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
                  Detected Misconfigurations ({serviceDetail.findings.length})
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {serviceDetail.findings.map((f: any) => (
                  <div key={f.id} className="glass-panel" style={{ padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{f.title}</span>
                          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#a78bfa' }}>
                            [{f.rule_id}]
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{f.description}</div>
                      </div>
                      <span className={`badge badge-${f.severity.toLowerCase()}`}>
                        {f.severity} ({f.confidence}%)
                      </span>
                    </div>

                    {/* Evidence Snippet */}
                    <pre style={{
                      margin: 0,
                      marginTop: 8,
                      padding: 12,
                      background: '#090a0c',
                      borderRadius: 8,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: '#cbd5e1',
                      overflowX: 'auto',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      {JSON.stringify(f.evidence_data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 3: Raw Snapshot Viewer */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Eye size={18} color="#38bdf8" />
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
                  Raw Passive Snapshot Data
                </h2>
              </div>

              {serviceDetail.snapshots.map((snap: any) => (
                <div key={snap.id} className="glass-panel" style={{ padding: 20 }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>
                    Captured: {snap.captured_at} &bull; SHA256: <code>{snap.content_hash}</code> &bull; Favicon MMH3: <code>{snap.favicon_hash || 'None'}</code>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', marginBottom: 6 }}>HTTP HEADERS</div>
                      <pre style={{
                        padding: 12,
                        background: '#090a0c',
                        borderRadius: 8,
                        fontSize: 11,
                        color: '#cbd5e1',
                        fontFamily: 'var(--font-mono)',
                        maxHeight: 180,
                        overflowY: 'auto'
                      }}>
                        {JSON.stringify(snap.headers, null, 2)}
                      </pre>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', marginBottom: 6 }}>BODY SAMPLE (SANDBOXED)</div>
                      <pre style={{
                        padding: 12,
                        background: '#090a0c',
                        borderRadius: 8,
                        fontSize: 11,
                        color: '#cbd5e1',
                        fontFamily: 'var(--font-mono)',
                        maxHeight: 180,
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {snap.body_sample.slice(0, 500)}...
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
