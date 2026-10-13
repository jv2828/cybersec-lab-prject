import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ShieldCheck, 
  RefreshCw, 
  Bell, 
  CheckCircle2, 
  FileCheck,
  AlertTriangle,
  Lock
} from 'lucide-react';
import { fetchPipelineStatus, triggerSimulatedCrawl, fetchAlerts, acknowledgeAlert } from '../services/api';

export const PipelineView: React.FC = () => {
  const [pipeline, setPipeline] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [pipeData, alertsData] = await Promise.all([fetchPipelineStatus(), fetchAlerts()]);
        setPipeline(pipeData);
        setAlerts(alertsData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      const res = await triggerSimulatedCrawl();
      setTriggerMessage(res.message);
      // Reload alerts
      const updatedAlerts = await fetchAlerts();
      setAlerts(updatedAlerts);
      setTimeout(() => setTriggerMessage(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setTriggering(false);
    }
  };

  const handleAck = async (id: number) => {
    try {
      await acknowledgeAlert(id);
      setAlerts(alerts.map(a => a.id === id ? { ...a, status: 'ACKNOWLEDGED' } : a));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !pipeline) {
    return <div style={{ padding: 40, color: '#94a3b8' }}>Loading pipeline telemetry...</div>;
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>
            Continuous Ingestion Pipeline &amp; Guardrails
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>
            Job schedulers, passive Tor-SOCKS ingestion stream controls, and immutable analyst audit logs.
          </p>
        </div>

        <button
          onClick={handleTrigger}
          disabled={triggering}
          className="btn-pill btn-white"
        >
          <RefreshCw size={14} className={triggering ? 'spin' : ''} />
          {triggering ? 'Processing Feeds...' : 'Trigger Passive Snapshot Cycle'}
        </button>
      </div>

      {triggerMessage && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 10,
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          color: '#34d399',
          fontSize: 13,
          marginBottom: 24
        }}>
          {triggerMessage}
        </div>
      )}

      {/* Operational Guardrails Banner */}
      <div className="glass-panel" style={{ padding: 22, border: '1px solid rgba(56, 189, 248, 0.3)', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Lock size={18} color="#38bdf8" />
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
            Operational Security &amp; Legal Guardrails Enforcement
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, fontSize: 12 }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8 }}>
            <span style={{ color: '#94a3b8' }}>TOR CRAWLER ADAPTER</span>
            <div style={{ color: '#f59e0b', fontWeight: 700, marginTop: 4 }}>
              {pipeline.guardrails.tor_socks_crawler_enabled ? 'ENABLED' : 'DISABLED (PASSIVE ONLY)'}
            </div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8 }}>
            <span style={{ color: '#94a3b8' }}>AUTHORIZATION GATE</span>
            <div style={{ color: '#10b981', fontWeight: 700, marginTop: 4 }}>
              LEGAL WARRANT VERIFIED
            </div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8 }}>
            <span style={{ color: '#94a3b8' }}>RATE LIMITING</span>
            <div style={{ color: '#38bdf8', fontWeight: 700, marginTop: 4 }}>
              {pipeline.guardrails.rate_limit}
            </div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8 }}>
            <span style={{ color: '#94a3b8' }}>ACTIVE PROBING</span>
            <div style={{ color: '#10b981', fontWeight: 700, marginTop: 4 }}>
              BLOCKED BY ENGINE
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Workers & Live Jobs */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 14 }}>
          Scheduled Continuous Jobs
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {pipeline.active_jobs.map((job: any) => (
            <div key={job.id} className="glass-panel" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{job.name}</span>
                <span className="badge badge-success">{job.status}</span>
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                Cadence: {job.interval} &bull; Last run: {job.last_run}
              </div>
              <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#a78bfa' }}>
                Processed Items: {job.items_processed}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notification Alerts Queue */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Bell size={18} color="#a78bfa" />
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
            Intelligence Notification Queue ({alerts.length})
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.map((al: any) => (
            <div key={al.id} className="glass-panel" style={{ padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{al.title}</span>
                  <span className={`badge badge-${al.severity.toLowerCase()}`}>{al.severity}</span>
                  <span className={`badge ${al.status === 'UNREAD' ? 'badge-high' : 'badge-medium'}`}>{al.status}</span>
                </div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                  {al.description}
                </div>
              </div>

              {al.status === 'UNREAD' && (
                <button
                  onClick={() => handleAck(al.id)}
                  className="btn-pill btn-glass"
                  style={{ fontSize: 12, padding: '6px 14px' }}
                >
                  <CheckCircle2 size={14} color="#10b981" /> Acknowledge
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
