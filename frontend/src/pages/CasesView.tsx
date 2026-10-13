import React, { useState, useEffect } from 'react';
import { 
  FolderLock, 
  FileText, 
  ShieldCheck, 
  Plus, 
  Printer, 
  Hash, 
  Calendar, 
  UserCheck,
  CheckCircle2
} from 'lucide-react';
import { fetchCases, fetchCaseDetail, createCase, attachEvidence } from '../services/api';

export const CasesView: React.FC = () => {
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [caseDetail, setCaseDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newPriority, setNewPriority] = useState('HIGH');

  useEffect(() => {
    async function loadCases() {
      try {
        const data = await fetchCases();
        setCases(data);
        if (data.length > 0 && !selectedCaseId) {
          setSelectedCaseId(data[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadCases();
  }, []);

  useEffect(() => {
    if (!selectedCaseId) return;
    async function loadDetail() {
      try {
        const data = await fetchCaseDetail(selectedCaseId);
        setCaseDetail(data);
      } catch (err) {
        console.error(err);
      }
    }
    loadDetail();
  }, [selectedCaseId]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createCase({
        title: newTitle,
        priority: newPriority,
        summary: newSummary,
        tags: ['NewInvestigation']
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewSummary('');
      // Reload
      const updated = await fetchCases();
      setCases(updated);
      setSelectedCaseId(res.case_id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 72px)', overflow: 'hidden' }}>
      {/* Left Case List */}
      <div style={{
        width: 360,
        background: '#0d0e10',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>INVESTIGATION CASES</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{cases.length} Open Dossiers</div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-pill btn-white"
            style={{ padding: '6px 12px', fontSize: 12 }}
          >
            <Plus size={14} /> New Case
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {loading && <div style={{ padding: 20, color: '#94a3b8' }}>Loading dossiers...</div>}
          {!loading && cases.map((c) => {
            const isSelected = c.id === selectedCaseId;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCaseId(c.id)}
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
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#a78bfa' }}>{c.id}</span>
                  <span className={`badge ${c.priority === 'CRITICAL' ? 'badge-critical' : 'badge-high'}`} style={{ fontSize: 10 }}>
                    {c.priority}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 4 }}>{c.title}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                  {c.evidence_count} Sealed Evidence Items
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Case Detail & Chain of Custody */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', background: '#080808' }}>
        {!caseDetail ? (
          <div style={{ padding: 40, color: '#94a3b8' }}>Loading case dossier...</div>
        ) : (
          <div>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              paddingBottom: 24,
              marginBottom: 32
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                    {caseDetail.id}
                  </span>
                  <span className="badge badge-critical">{caseDetail.priority} PRIORITY</span>
                  <span className="badge badge-success">{caseDetail.status}</span>
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginTop: 6 }}>
                  {caseDetail.title}
                </h1>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>
                  Assigned: <strong style={{ color: '#fff' }}>{caseDetail.assigned_analyst}</strong> &bull; Created: {caseDetail.created_at.slice(0, 10)}
                </div>
              </div>

              {/* One-click HTML/PDF Report Link */}
              <a
                href={`/api/v1/cases/${caseDetail.id}/report`}
                target="_blank"
                rel="noreferrer"
                className="btn-pill btn-white"
                style={{ textDecoration: 'none' }}
              >
                <Printer size={15} /> Export Official Dossier
              </a>
            </div>

            {/* Case Summary */}
            <div className="glass-panel" style={{ padding: 22, marginBottom: 32 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 6 }}>
                EXECUTIVE INVESTIGATION SUMMARY
              </div>
              <div style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.6 }}>
                {caseDetail.summary}
              </div>
            </div>

            {/* Evidentiary Chain of Custody Table */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <ShieldCheck size={18} color="#10b981" />
                <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>
                  Cryptographically Sealed Evidence ({caseDetail.evidence.length})
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {caseDetail.evidence.map((ev: any) => (
                  <div key={ev.id} className="glass-panel" style={{ padding: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{ev.title}</span>
                          <span className="badge badge-medium" style={{ fontSize: 10 }}>{ev.entity_type}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                          Entity Identifier: <code>{ev.entity_id}</code> &bull; Sealed: {ev.added_at}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontSize: 12, fontWeight: 600 }}>
                        <CheckCircle2 size={15} />
                        VERIFIED SEAL
                      </div>
                    </div>

                    {/* SHA256 Hash Display */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: 'rgba(0,0,0,0.4)',
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)'
                    }}>
                      <Hash size={13} color="#a78bfa" />
                      <span style={{ color: '#94a3b8' }}>SHA-256 Digest:</span>
                      <span style={{ color: '#38bdf8', wordBreak: 'break-all' }}>{ev.sha256_hash}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Case Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div className="glass-panel" style={{ width: 500, padding: 32, background: '#141416' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 16 }}>
              Open New Investigation Dossier
            </h3>
            <form onSubmit={handleCreateCase}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Case Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Operation DarkRelay"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{ width: '100%', background: '#090a0c', border: '1px solid #333', borderRadius: 8, padding: 10, color: '#fff' }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Priority Level</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  style={{ width: '100%', background: '#090a0c', border: '1px solid #333', borderRadius: 8, padding: 10, color: '#fff' }}
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Executive Summary</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Target actors, primary onion services, and objective..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  style={{ width: '100%', background: '#090a0c', border: '1px solid #333', borderRadius: 8, padding: 10, color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-pill btn-glass"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-pill btn-white"
                >
                  Open Dossier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
