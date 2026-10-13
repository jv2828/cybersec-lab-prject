import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Key, 
  Wallet, 
  ShieldAlert, 
  Clock, 
  FileText, 
  CheckCircle, 
  Layers, 
  ArrowRight,
  FolderPlus
} from 'lucide-react';
import { fetchActors, fetchActorProfile } from '../services/api';

interface ActorProfileViewProps {
  initialActorId?: string;
  onNavigate: (tab: string, targetId?: string) => void;
}

export const ActorProfileView: React.FC<ActorProfileViewProps> = ({ initialActorId, onNavigate }) => {
  const [actors, setActors] = useState<any[]>([]);
  const [selectedActorId, setSelectedActorId] = useState<string>(initialActorId || '');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadActors() {
      try {
        const data = await fetchActors();
        setActors(data);
        if (!selectedActorId && data.length > 0) {
          setSelectedActorId(data[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadActors();
  }, []);

  useEffect(() => {
    if (!selectedActorId) return;
    async function loadProfile() {
      try {
        const data = await fetchActorProfile(selectedActorId);
        setProfile(data);
      } catch (err) {
        console.error(err);
      }
    }
    loadProfile();
  }, [selectedActorId]);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 72px)', overflow: 'hidden' }}>
      {/* Left List */}
      <div style={{
        width: 340,
        background: '#0d0e10',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>RESOLVED ACTORS</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{actors.length} Consolidated Syndicates</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {loading && <div style={{ padding: 20, color: '#94a3b8' }}>Loading actor profiles...</div>}
          {!loading && actors.map((a) => {
            const isSelected = a.id === selectedActorId;
            return (
              <div
                key={a.id}
                onClick={() => setSelectedActorId(a.id)}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  marginBottom: 6,
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(167, 139, 250, 0.12)' : 'transparent',
                  border: isSelected ? '1px solid rgba(167, 139, 250, 0.35)' : '1px solid transparent'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#a78bfa' : '#fff' }}>
                    {a.primary_handle}
                  </span>
                  <span className={`badge ${a.risk_score >= 85 ? 'badge-critical' : 'badge-high'}`} style={{ fontSize: 10 }}>
                    RISK {a.risk_score}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                  {a.category} &bull; {a.handles.length} handles
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Profile Details */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px', background: '#080808' }}>
        {!profile ? (
          <div style={{ padding: 40, color: '#94a3b8' }}>Loading actor profile...</div>
        ) : (
          <div>
            {/* Header banner */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: 24,
              marginBottom: 32
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>{profile.primary_handle}</h1>
                  <span className={`badge ${profile.risk_score >= 85 ? 'badge-critical' : 'badge-high'}`}>
                    THREAT INDEX {profile.risk_score}/100
                  </span>
                  <span className="badge badge-medium">
                    {profile.category}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6, display: 'flex', gap: 16 }}>
                  <span>Activity Timezone: <strong style={{ color: '#fff' }}>{profile.activity_timezone}</strong></span>
                  <span>First Seen: <strong style={{ color: '#fff' }}>{profile.first_seen.slice(0, 10)}</strong></span>
                  <span>Trust Network: <strong style={{ color: '#fff' }}>{profile.trust_links_count} vouch edges</strong></span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => onNavigate('graph', profile.id)}
                  className="btn-pill btn-white"
                >
                  View in Relationship Graph
                </button>
                <button
                  onClick={() => onNavigate('cases')}
                  className="btn-pill btn-glass"
                >
                  <FolderPlus size={14} /> Attach to Case
                </button>
              </div>
            </div>

            {/* Attributed Real-World Identity Cards (Flagship) */}
            {profile.real_world_entities.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Layers size={18} color="#ef4444" />
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>
                    Attributed Real-World Identifiers ({profile.real_world_entities.length})
                  </h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  {profile.real_world_entities.map((rw: any) => (
                    <div key={rw.id} className="glass-panel" style={{ padding: 20, border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>{rw.name}</div>
                          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                            {rw.type} &bull; Jurisdiction: <strong style={{ color: '#cbd5e1' }}>{rw.country}</strong>
                          </div>
                        </div>
                        <span className="badge badge-critical">
                          {rw.confidence}% CONFIDENCE
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: '#38bdf8', marginBottom: 12, fontFamily: 'var(--font-mono)' }}>
                        {rw.platform}
                      </div>

                      {/* Evidence chain */}
                      <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px 12px', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', marginBottom: 4 }}>CORROBORATING EVIDENCE:</div>
                        {rw.evidence_chain.map((ev: any, idx: number) => (
                          <div key={idx} style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 3 }}>
                            &bull; <strong>{ev.signal}:</strong> {ev.detail}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Market Handles Inventory */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Users size={18} color="#38bdf8" />
                <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>
                  Consolidated Darknet Market Personas ({profile.handles.length})
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {profile.handles.map((h: any) => (
                  <div key={h.id} className="glass-panel" style={{ padding: 18 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>@{h.handle_name}</div>
                    <div style={{ fontSize: 12, color: '#a78bfa', marginTop: 2 }}>{h.marketplace_id}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginTop: 10 }}>
                      <span>Rating: <strong style={{ color: '#10b981' }}>{h.vendor_rating}&#9733;</strong></span>
                      <span>Sales: {h.sales_count}</span>
                    </div>
                    {h.listing_sample && (
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 8, fontStyle: 'italic' }}>
                        "{h.listing_sample}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Cryptographic Keys & Financial Wallets */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
              {/* PGP Keys */}
              <div className="glass-panel" style={{ padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Key size={16} color="#10b981" />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>PGP Public Keys ({profile.pgp_keys.length})</h3>
                </div>
                {profile.pgp_keys.map((p: any, idx: number) => (
                  <div key={idx} style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#34d399', wordBreak: 'break-all' }}>
                      {p.fingerprint}
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                      UID: {p.email || 'Anonymous'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Wallets & Exchange Flow */}
              <div className="glass-panel" style={{ padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Wallet size={16} color="#f59e0b" />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Cryptocurrency Wallets ({profile.wallets.length})</h3>
                </div>
                {profile.wallets.map((w: any) => (
                  <div key={w.id} style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#fbbf24', wordBreak: 'break-all' }}>
                      {w.address}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                      <span>Total: ${w.total_received_usd.toLocaleString()}</span>
                      <span style={{ color: '#ef4444' }}>Exchange Exposure: ${w.exchange_exposure_usd.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stylometry & Lexical Analysis */}
            <div className="glass-panel" style={{ padding: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <FileText size={16} color="#a78bfa" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Stylometric Writing Fingerprint</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, fontSize: 13, color: '#cbd5e1' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8 }}>
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>VOCABULARY RICHNESS</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#a78bfa', marginTop: 4 }}>
                    {profile.stylometry_summary?.vocab_richness || 0.78}
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8 }}>
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>AVG WORD LENGTH</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#a78bfa', marginTop: 4 }}>
                    {profile.stylometry_summary?.avg_word_len || 4.8} chars
                  </div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8 }}>
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>FUNCTION-WORD PROFILE</div>
                  <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>
                    Signature punctuation &amp; crypto delivery phrasing
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
