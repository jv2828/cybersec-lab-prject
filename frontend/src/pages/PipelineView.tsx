import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Play, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  RefreshCw, 
  Power,
  ShieldCheck,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { 
  fetchPipelineStatus, 
  toggleAutonomousMode, 
  triggerPipelineRunNow 
} from '../services/api';
import { PageHeader } from '../components/PageHeader';

export const PipelineView: React.FC = () => {
  const [pipeline, setPipeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRunningNow, setIsRunningNow] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadPipeline = async () => {
    try {
      const data = await fetchPipelineStatus();
      setPipeline(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to fetch ingestion pipeline telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPipeline();
    const interval = setInterval(loadPipeline, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleAutonomous = async () => {
    if (!pipeline) return;
    const targetState = !pipeline.autonomous_mode;
    try {
      const res = await toggleAutonomousMode(targetState);
      setPipeline({ ...pipeline, autonomous_mode: res.autonomous_mode });
      setRunMessage(`Autonomous mode switched ${res.autonomous_mode ? 'ON (Only reliable sources >=60 will be ingested)' : 'OFF'}.`);
      setTimeout(() => setRunMessage(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to toggle autonomous mode.');
    }
  };

  const handleRunNow = async () => {
    setIsRunningNow(true);
    setRunMessage(null);
    try {
      const res = await triggerPipelineRunNow();
      setRunMessage(`Pipeline run finished: ${res.items_ingested} items ingested, ${res.items_rejected} items rejected by reliability gate.`);
      await loadPipeline();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to run pipeline.');
    } finally {
      setIsRunningNow(false);
    }
  };

  if (loading && !pipeline) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
        Loading autonomous ingestion pipeline telemetry...
      </div>
    );
  }

  const sources = pipeline?.active_sources || [];
  const runs = pipeline?.recent_runs || [];

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader
        title="Autonomous Ingestion Pipeline & Reliability Gate"
        description="Continuous synthetic feeds ingestion engine, source quality gatekeeper, and automated origin correlation."
        helpText="The autonomous pipeline continuously reads passive darknet marketplace feeds from data/feeds. When autonomous mode is active, only sources with reliability >= 60 and trusted = true are ingested; all others are rejected by the gate."
        actions={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={handleRunNow}
              disabled={isRunningNow}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 16px',
                background: isRunningNow ? '#4c1d95' : '#7c3aed',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 700,
                cursor: isRunningNow ? 'not-allowed' : 'pointer'
              }}
            >
              <Play size={14} /> {isRunningNow ? 'Running Ingestion...' : 'Run Ingestion Now'}
            </button>
          </div>
        }
      />

      {/* Control Banner: Autonomous Toggle */}
      <div style={{
        background: '#141416',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 24,
        marginBottom: 28,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cpu size={22} color="#a78bfa" />
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#fff' }}>
              Autonomous Ingestion Mode
            </h2>
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: 4,
              background: pipeline?.autonomous_mode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)',
              color: pipeline?.autonomous_mode ? '#34d399' : '#94a3b8',
              border: pipeline?.autonomous_mode ? '1px solid #10b981' : '1px solid #64748b'
            }}>
              {pipeline?.autonomous_mode ? 'ACTIVE' : 'STANDBY'}
            </span>
          </div>

          <p style={{ margin: '8px 0 0 0', fontSize: 13, color: '#cbd5e1', maxWidth: 750, lineHeight: 1.5 }}>
            When toggled <strong>ON</strong>, the scheduler ingests feeds from disk (<code>data/feeds/</code>) every 5 minutes and strictly applies the <strong>Reliability Gate</strong>: any source with reliability &lt; 60 or trusted = false is blocked from corrupting threat intelligence.
          </p>
        </div>

        {/* Toggle Button */}
        <div>
          <button
            onClick={handleToggleAutonomous}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 22px',
              borderRadius: 8,
              background: pipeline?.autonomous_mode ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
              color: pipeline?.autonomous_mode ? '#000000' : '#ffffff',
              border: pipeline?.autonomous_mode ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Power size={16} />
            <span>{pipeline?.autonomous_mode ? 'AUTONOMOUS: ON' : 'AUTONOMOUS: OFF'}</span>
          </button>
        </div>
      </div>

      {runMessage && (
        <div style={{ padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: 8, color: '#34d399', fontSize: 13, marginBottom: 24 }}>
          {runMessage}
        </div>
      )}

      {errorMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: 8, color: '#f87171', fontSize: 13, marginBottom: 24 }}>
          {errorMsg}
        </div>
      )}

      {/* PER-SOURCE RELIABILITY TABLE */}
      <div style={{
        background: '#141416',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 10,
        padding: 24,
        marginBottom: 32
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px 0', color: '#fff' }}>
          Configured Intelligence Sources &amp; Reliability Gate Scores ({sources.length})
        </h3>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'rgba(255, 255, 255, 0.04)', textAlign: 'left' }}>
              <th style={{ padding: '10px 14px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Source Name</th>
              <th style={{ padding: '10px 14px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Type</th>
              <th style={{ padding: '10px 14px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Reliability Score</th>
              <th style={{ padding: '10px 14px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Trusted Flag</th>
              <th style={{ padding: '10px 14px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Autonomous Gate Status</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s: any) => (
              <tr key={s.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 600 }}>{s.name}</td>
                <td style={{ padding: '12px 14px', color: '#94a3b8', textTransform: 'capitalize' }}>{s.type}</td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: s.reliability_score >= 60 ? '#34d399' : '#f87171' }}>
                      {s.reliability_score}/100
                    </span>
                    <div style={{ width: 80, height: 6, background: '#0a0a0c', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        width: `${s.reliability_score}%`,
                        height: '100%',
                        background: s.reliability_score >= 60 ? '#10b981' : '#ef4444'
                      }} />
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  {s.trusted ? (
                    <span style={{ color: '#34d399', fontWeight: 700 }}>YES</span>
                  ) : (
                    <span style={{ color: '#f87171', fontWeight: 700 }}>NO</span>
                  )}
                </td>
                <td style={{ padding: '12px 14px' }}>
                  {s.is_eligible_for_autonomous ? (
                    <span style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid #10b981',
                      color: '#34d399',
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700
                    }}>
                      ELIGIBLE (AUTONOMOUS INGEST)
                    </span>
                  ) : (
                    <span style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid #ef4444',
                      color: '#f87171',
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700
                    }}>
                      BLOCKED BY RELIABILITY GATE
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* LAST 20 RUNS TABLE (From real IngestRun table) */}
      <div style={{
        background: '#141416',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 10,
        padding: 24
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: '#fff' }}>
            Real Ingestion Runs History (Last {runs.length} Runs)
          </h3>
          <span style={{ fontSize: 12, color: '#64748b' }}>Computed live from database</span>
        </div>

        {runs.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
            No ingestion jobs have run yet. Click "Run Ingestion Now" to trigger a cycle.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.04)', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Job Name</th>
                <th style={{ padding: '10px 14px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Source</th>
                <th style={{ padding: '10px 14px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Started</th>
                <th style={{ padding: '10px 14px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Ingested</th>
                <th style={{ padding: '10px 14px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Rejected</th>
                <th style={{ padding: '10px 14px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Status</th>
                <th style={{ padding: '10px 14px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Notes / Gate Reason</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r: any) => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '10px 14px', color: '#fff', fontWeight: 600 }}>{r.job_name}</td>
                  <td style={{ padding: '10px 14px', color: '#c084fc' }}>{r.source_id || 'system'}</td>
                  <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 12 }}>
                    {new Date(r.started_at).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#34d399', fontWeight: 600 }}>
                    {r.items_ingested}
                  </td>
                  <td style={{ padding: '10px 14px', color: r.items_rejected > 0 ? '#f87171' : '#94a3b8', fontWeight: 600 }}>
                    {r.items_rejected}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: r.status === 'SUCCESS' ? 'rgba(16, 185, 129, 0.2)' : r.status.includes('REJECTED') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: r.status === 'SUCCESS' ? '#34d399' : r.status.includes('REJECTED') ? '#f87171' : '#fbbf24',
                      border: r.status === 'SUCCESS' ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)'
                    }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 12 }}>
                    {r.error || 'Clean execution'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
