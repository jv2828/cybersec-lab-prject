import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Users, 
  ShieldCheck, 
  AlertTriangle, 
  Server, 
  ArrowUpRight, 
  Radio, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { fetchStats, fetchAlerts } from '../services/api';

interface DashboardProps {
  onNavigate: (tab: string, targetId?: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsData, alertsData] = await Promise.all([fetchStats(), fetchAlerts()]);
        setStats(statsData);
        setAlerts(alertsData.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !stats) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
        Loading intelligence metrics...
      </div>
    );
  }

  const kpis = stats.kpis;
  const severities = stats.severity_breakdown;

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Top Banner / Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 32
      }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5, color: '#fff' }}>
            Threat Intelligence Command
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>
            Continuous dark web correlation across 6 darknet markets &bull; RFC 5737 synthetic dataset
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 16px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 9999
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px #10b981'
          }}></span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#34d399' }}>
            Passive Feeds Synchronized (100% Non-Intrusive)
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 20,
        marginBottom: 32
      }}>
        <div 
          className="glass-panel" 
          style={{ padding: 24, cursor: 'pointer' }}
          onClick={() => onNavigate('services')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>SERVICES MONITORED</div>
            <Globe size={18} color="#a78bfa" />
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#fff', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
            {kpis.services_monitored}
          </div>
          <div style={{ fontSize: 12, color: '#34d399', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>40 Snapshots Ingested</span>
            <ArrowUpRight size={13} />
          </div>
        </div>

        <div 
          className="glass-panel" 
          style={{ padding: 24, cursor: 'pointer' }}
          onClick={() => onNavigate('actors')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>RESOLVED ACTORS</div>
            <Users size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#fff', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
            {kpis.actors_resolved}
          </div>
          <div style={{ fontSize: 12, color: '#38bdf8', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>150+ Handles Consolidated</span>
            <ArrowUpRight size={13} />
          </div>
        </div>

        <div 
          className="glass-panel" 
          style={{ padding: 24, cursor: 'pointer' }}
          onClick={() => onNavigate('services')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>ORIGIN ATTRIBUTIONS</div>
            <Server size={18} color="#10b981" />
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#fff', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
            {kpis.high_confidence_origins}
          </div>
          <div style={{ fontSize: 12, color: '#10b981', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>&ge; 80% Confidence Links</span>
            <ArrowUpRight size={13} />
          </div>
        </div>

        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>IDENTIFIED MISCONFIGS</div>
            <AlertTriangle size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: '#fff', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
            {kpis.total_findings}
          </div>
          <div style={{ fontSize: 12, color: '#f87171', marginTop: 6 }}>
            {severities.CRITICAL} Critical Leaks Identified
          </div>
        </div>
      </div>

      {/* Middle Row: Severity Matrix & Hosting Infrastructure */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24,
        marginBottom: 32
      }}>
        {/* Misconfiguration Severity Breakdown */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>
            Detector Rule Severities
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: '#f87171', fontWeight: 600 }}>CRITICAL (mod_status, phpinfo, TLS cert CN leak)</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>{severities.CRITICAL}</span>
              </div>
              <div style={{ height: 8, background: '#27272a', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(severities.CRITICAL / (kpis.total_findings || 1)) * 100}%`, height: '100%', background: '#ef4444' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: '#fbbf24', fontWeight: 600 }}>HIGH (IP leak, Favicon mmh3 match, Mixed Content)</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>{severities.HIGH}</span>
              </div>
              <div style={{ height: 8, background: '#27272a', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(severities.HIGH / (kpis.total_findings || 1)) * 100}%`, height: '100%', background: '#f59e0b' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>MEDIUM (Server Banner, Uptime Skew)</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>{severities.MEDIUM}</span>
              </div>
              <div style={{ height: 8, background: '#27272a', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(severities.MEDIUM / (kpis.total_findings || 1)) * 100}%`, height: '100%', background: '#38bdf8' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: '#94a3b8', fontWeight: 600 }}>LOW / INFO (Header Sequence, ETag)</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>{severities.LOW}</span>
              </div>
              <div style={{ height: 8, background: '#27272a', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${(severities.LOW / (kpis.total_findings || 1)) * 100}%`, height: '100%', background: '#64748b' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Origin Infrastructure ASNs */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 16 }}>
            Origin Hosting ASNs &amp; Jurisdictions
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {Object.entries(stats.asn_distribution).map(([asn, count]: any) => (
              <div key={asn} style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa' }}>{asn}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{count} Indexed Server Nodes</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Top Risky Threat Actors & Live Alerts */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: 24
      }}>
        {/* Top Risky Actors */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
              Highest Risk Threat Actors
            </h2>
            <button 
              onClick={() => onNavigate('actors')} 
              className="btn-pill btn-glass"
              style={{ padding: '4px 12px', fontSize: 12 }}
            >
              View All 50 &rarr;
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.top_risky_actors.map((actor: any) => (
              <div
                key={actor.id}
                onClick={() => onNavigate('actors', actor.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)')}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{actor.handle}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>
                    {actor.category} &bull; {actor.handles_count} Handles &bull; {actor.wallets_count} Wallets
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="badge badge-critical" style={{ fontSize: 11 }}>
                    RISK {actor.risk_score}
                  </span>
                  <ChevronRight size={16} color="#64748b" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Alerts Feed */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>
              Intelligence Stream Alerts
            </h2>
            <button 
              onClick={() => onNavigate('pipeline')} 
              className="btn-pill btn-glass"
              style={{ padding: '4px 12px', fontSize: 12 }}
            >
              Monitor &rarr;
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.map((al: any) => (
              <div
                key={al.id}
                style={{
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: 10
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa' }}>{al.title}</span>
                  <span className={`badge badge-${al.severity.toLowerCase()}`} style={{ fontSize: 10 }}>
                    {al.severity}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.4 }}>{al.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
