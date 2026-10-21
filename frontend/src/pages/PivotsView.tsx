import React, { useState, useEffect } from 'react';
import { Layers, ShieldAlert, ArrowRight, ExternalLink, Globe, User, Landmark } from 'lucide-react';
import { fetchPivots } from '../services/api';

import { PageHeader } from '../components/PageHeader';

interface PivotsViewProps {
  onNavigate: (tab: string, targetId?: string) => void;
}

export const PivotsView: React.FC<PivotsViewProps> = ({ onNavigate }) => {
  const [pivots, setPivots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPivots() {
      try {
        const data = await fetchPivots();
        setPivots(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadPivots();
  }, []);

  const getIcon = (type: string) => {
    if (type === 'EXCHANGE_ACCOUNT') return <Landmark size={18} color="#f59e0b" />;
    if (type === 'INFRASTRUCTURE_OPERATOR') return <Globe size={18} color="#38bdf8" />;
    return <User size={18} color="#ef4444" />;
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader
        title="Real-World Identity Pivots"
        description="Corroboration linking darknet personas to suspect real-world individuals, cryptocurrency exchange accounts, and clearnet server operators."
        helpText="Review high-confidence identity attributions derived from KYC exchange records, PGP email registrations, and timezone cadence alignments."
      />

      {loading ? (
        <div style={{ padding: 40, color: '#94a3b8' }}>Loading identity pivots...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
          {pivots.map((p) => (
            <div key={p.id} className="glass-panel" style={{ padding: 24, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {getIcon(p.entity_type)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{p.name_or_alias}</h3>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      Linked Darknet Actor: <strong style={{ color: '#a78bfa' }}>{p.actor_handle}</strong>
                    </div>
                  </div>
                </div>

                <span className="badge badge-critical" style={{ fontSize: 11 }}>
                  {p.confidence_score}% CONFIDENCE
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16, fontSize: 12 }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8 }}>
                  <span style={{ color: '#94a3b8' }}>TYPE</span>
                  <div style={{ color: '#fff', fontWeight: 600, marginTop: 2 }}>{p.entity_type}</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8 }}>
                  <span style={{ color: '#94a3b8' }}>COUNTRY</span>
                  <div style={{ color: '#fff', fontWeight: 600, marginTop: 2 }}>{p.country || 'International'}</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 10, borderRadius: 8 }}>
                  <span style={{ color: '#94a3b8' }}>EXCHANGE EXP</span>
                  <div style={{ color: '#f59e0b', fontWeight: 600, marginTop: 2 }}>
                    ${p.total_crypto_exposure_usd.toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 12, color: '#38bdf8', marginBottom: 14, fontFamily: 'var(--font-mono)' }}>
                Platform Footprint: {p.platform}
              </div>

              {/* Evidence Chain */}
              <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px 14px', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', marginBottom: 6 }}>
                  EVIDENTIARY SIGNALS CHAIN:
                </div>
                {p.evidence_chain.map((ev: any, idx: number) => (
                  <div key={idx} style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 4 }}>
                    &bull; <strong style={{ color: '#fff' }}>{ev.signal}:</strong> {ev.detail}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  onClick={() => onNavigate('actors', p.actor_id)}
                  className="btn-pill btn-white"
                  style={{ fontSize: 12, padding: '6px 14px' }}
                >
                  View Actor Profile &rarr;
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
