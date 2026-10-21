import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Globe2, 
  ArrowRight,
  Server,
  Layers,
  FileSearch,
  CheckCircle2
} from 'lucide-react';
import { fetchStats, DateFilter } from '../services/api';
import { PageHeader } from '../components/PageHeader';

interface DashboardProps {
  onNavigate: (tab: string, targetId?: string) => void;
  dateFilter: DateFilter;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, dateFilter }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const statsData = await fetchStats(dateFilter);
        setStats(statsData);
      } catch (err: any) {
        setError(err.message || 'Unable to connect to intelligence API server.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [dateFilter]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
        <div style={{ fontSize: 16, marginBottom: 8, color: '#c084fc' }}>● Fetching live intelligence metrics...</div>
        <p style={{ fontSize: 13, color: '#64748b' }}>Querying verified actor profiles and hidden services in database.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ padding: 20, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8 }}>
          <h3 style={{ color: '#ef4444', margin: '0 0 8px 0' }}>Failed to Load Intelligence Metrics</h3>
          <p style={{ color: '#fca5a5', fontSize: 13 }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 12, padding: '8px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const kpis = stats?.kpis || {
    monitored_services: 0,
    active_threat_actors: 0,
    matched_origins: 0,
    total_findings: 0
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader
        title="Start Here"
        description="Continuous dark web correlation, origin matching, and evidence deanonymization workspace."
        helpText="This platform links dark web footprints, Tor hidden service misconfigurations, and cryptocurrency traces to deanonymize threat actors. Choose an action card below to begin your analysis."
      />

      {/* THREE LARGE ACTION CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24,
        marginBottom: 32
      }}>
        {/* Card A: Verify Evidence */}
        <div 
          style={{
            background: 'linear-gradient(180deg, rgba(124, 58, 237, 0.15) 0%, rgba(20, 20, 22, 0.95) 100%)',
            border: '2px solid rgba(167, 139, 250, 0.4)',
            borderRadius: 12,
            padding: 28,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <ShieldCheck size={26} color="#fff" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#fff' }}>
                Verify a File or Text
              </h2>
              <span style={{ fontSize: 10, background: '#10b981', color: '#000', fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>
                HEADLINE
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#cbd5e1', marginTop: 10, lineHeight: 1.5 }}>
              Upload any report, document, text snippet or photo. The system traces it against all known sources, extracts EXIF/wallets/PGP, and returns an explainable verdict: <strong>Trusted Source</strong>, <strong>Threat Actor Linked</strong>, or <strong>Unknown</strong>.
            </p>
          </div>
          <button
            onClick={() => onNavigate('verify')}
            style={{
              marginTop: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 20px',
              background: '#7c3aed',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            <span>Verify Evidence Now</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Card B: Browse Threat Actors */}
        <div 
          style={{
            background: '#141416',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 12,
            padding: 28,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: 'rgba(167, 139, 250, 0.15)',
              border: '1px solid rgba(167, 139, 250, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <Users size={26} color="#c084fc" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#fff' }}>
              Browse Threat Actors
            </h2>
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 10, lineHeight: 1.5 }}>
              Explore consolidated actor profiles, cross-marketplace handle mappings, cryptocurrency wallets, 24-hour behavioural activity histograms, and human-in-the-loop persona migration links.
            </p>
          </div>
          <button
            onClick={() => onNavigate('actors')}
            style={{
              marginTop: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 20px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <span>Browse Threat Actors</span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Card C: Check Hidden Services */}
        <div 
          style={{
            background: '#141416',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 12,
            padding: 28,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 10,
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <Globe2 size={26} color="#38bdf8" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#fff' }}>
              Check Hidden Services
            </h2>
            <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 10, lineHeight: 1.5 }}>
              Scan Tor onion services for server misconfigurations (exposed server-status, SSL certs, favicon hashes) and match them to clearnet infrastructure to discover likely origin hosts.
            </p>
          </div>
          <button
            onClick={() => onNavigate('services')}
            style={{
              marginTop: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px 20px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <span>Check Hidden Services</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* ONE SHORT LINE EXPLAINING WHAT PLATFORM DOES */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 8,
        padding: '14px 20px',
        marginBottom: 32,
        fontSize: 14,
        color: '#e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <CheckCircle2 size={18} color="#10b981" />
        <span>
          <strong>Platform Mission:</strong> Sellix Trace continuously correlates passive dark web footprints, detects Tor infrastructure misconfigurations to unmask clearnet origin servers, and links rebranded threat actor personas using AI stylometry.
        </span>
      </div>

      {/* 4 SIMPLE KPIS FROM REAL DATA */}
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>
          Live Intelligence Database Metrics
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16
        }}>
          {/* KPI 1 */}
          <div 
            onClick={() => onNavigate('actors')}
            style={{
              background: '#141416',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              padding: 20,
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 800, color: '#c084fc', marginBottom: 4 }}>
              {kpis.active_threat_actors}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>
              Threat Actors Monitored
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Cross-marketplace tracked profiles
            </div>
          </div>

          {/* KPI 2 */}
          <div 
            onClick={() => onNavigate('services')}
            style={{
              background: '#141416',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              padding: 20,
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 800, color: '#38bdf8', marginBottom: 4 }}>
              {kpis.monitored_services}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>
              Hidden Services Profiled
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Tor onion services in index
            </div>
          </div>

          {/* KPI 3 */}
          <div 
            onClick={() => onNavigate('services')}
            style={{
              background: '#141416',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              padding: 20,
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 800, color: '#34d399', marginBottom: 4 }}>
              {kpis.matched_origins}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>
              Matched Clearnet Origins
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Probable real-world host servers
            </div>
          </div>

          {/* KPI 4 */}
          <div 
            onClick={() => onNavigate('verify')}
            style={{
              background: '#141416',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              padding: 20,
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b', marginBottom: 4 }}>
              {kpis.total_findings}
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#cbd5e1' }}>
              Detected Misconfigs & Leads
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
              Exposed banners, certs & status
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
