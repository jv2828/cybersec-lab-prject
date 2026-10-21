import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  CheckCircle, 
  AlertTriangle, 
  HelpCircle, 
  Download, 
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Clock,
  ArrowRight
} from 'lucide-react';
import { 
  verifyEvidence, 
  fetchEvidenceHistory, 
  fetchEvidenceDetail,
  getReportUrl,
  DateFilter 
} from '../services/api';
import { PageHeader } from '../components/PageHeader';

interface VerifyEvidenceViewProps {
  onNavigate: (tab: string, targetId?: string) => void;
  dateFilter: DateFilter;
}

export const VerifyEvidenceView: React.FC<VerifyEvidenceViewProps> = ({ onNavigate, dateFilter }) => {
  const [file, setFile] = useState<File | null>(null);
  const [pasteText, setPasteText] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [currentResult, setCurrentResult] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(true);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await fetchEvidenceHistory(dateFilter);
      setHistory(data);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [dateFilter]);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleVerify = async () => {
    if (!file && !pasteText.trim()) {
      setUploadError('Please select a file to upload or enter text in the box below.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setProgressMsg('Computing SHA-256 hash and analyzing file signatures...');

    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    } else {
      // Create a text file from the pasted string
      const blob = new Blob([pasteText], { type: 'text/plain' });
      formData.append('file', blob, 'pasted_evidence.txt');
    }

    try {
      setTimeout(() => setProgressMsg('Running AI stylometry and cross-referencing PGP / crypto wallets...'), 400);
      const result = await verifyEvidence(formData);
      setCurrentResult(result);
      setFile(null);
      setPasteText('');
      loadHistory();
    } catch (err: any) {
      setUploadError(err.message || 'Verification process encountered an unexpected error.');
    } finally {
      setIsUploading(false);
      setProgressMsg('');
    }
  };

  const viewHistoricalRecord = async (id: number) => {
    try {
      const record = await fetchEvidenceDetail(id);
      setCurrentResult({
        id: record.id,
        filename: record.filename,
        sha256: record.sha256,
        verdict: record.verdict,
        trust_score: record.trust_score,
        signals: record.signals_json,
        matched_actor_id: record.matched_actor_id,
        matched_source_id: record.matched_source_id,
        extracted: record.extracted_json
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
    }
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'TRUSTED_SOURCE':
        return (
          <span style={{
            background: 'rgba(16, 185, 129, 0.2)',
            color: '#34d399',
            border: '1px solid #10b981',
            padding: '6px 14px',
            borderRadius: 6,
            fontWeight: 800,
            fontSize: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}>
            <ShieldCheck size={16} /> TRUSTED SOURCE
          </span>
        );
      case 'THREAT_ACTOR_LINKED':
        return (
          <span style={{
            background: 'rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            border: '1px solid #ef4444',
            padding: '6px 14px',
            borderRadius: 6,
            fontWeight: 800,
            fontSize: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}>
            <ShieldAlert size={16} /> THREAT ACTOR LINKED
          </span>
        );
      default:
        return (
          <span style={{
            background: 'rgba(148, 163, 184, 0.2)',
            color: '#cbd5e1',
            border: '1px solid #64748b',
            padding: '6px 14px',
            borderRadius: 6,
            fontWeight: 800,
            fontSize: 14,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}>
            <HelpCircle size={16} /> UNKNOWN SOURCE
          </span>
        );
    }
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader
        title="Verify Evidence"
        description="Headline trace engine: determine if suspicious files originate from a trusted source, a known threat actor, or an unknown entity."
        helpText="Upload any document, raw text, or image. The verifier inspects EXIF metadata, crypto wallet addresses, PGP keys, onion links, and AI n-gram stylometry to output an explainable attribution verdict."
        actions={
          <a
            href={getReportUrl(dateFilter)}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              background: '#7c3aed',
              color: '#ffffff',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600
            }}
          >
            <Download size={14} /> Download Intelligence Report
          </a>
        }
      />

      {/* UPLOAD & VERIFY FORM */}
      <div style={{
        background: '#141416',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 24,
        marginBottom: 32
      }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px 0', color: '#fff' }}>
          Upload File or Paste Investigative Text
        </h2>

        {/* Drag and Drop Box */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: isDragOver ? '2px dashed #a78bfa' : '2px dashed rgba(255, 255, 255, 0.15)',
            borderRadius: 8,
            padding: 32,
            textAlign: 'center',
            background: isDragOver ? 'rgba(167, 139, 250, 0.08)' : 'rgba(255, 255, 255, 0.02)',
            cursor: 'pointer',
            marginBottom: 16,
            transition: 'all 0.2s'
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                setFile(e.target.files[0]);
              }
            }}
            accept=".png,.jpg,.jpeg,.pdf,.txt,.docx"
            style={{ display: 'none' }}
          />

          <UploadCloud size={36} color={isDragOver ? '#a78bfa' : '#64748b'} style={{ margin: '0 auto 12px auto' }} />

          {file ? (
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#34d399' }}>
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                Click or drag another file to replace
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#cbd5e1' }}>
                Click to browse or drag and drop investigative files here
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                Supports Images (.jpg, .png), Documents (.pdf, .docx), and Raw Text (.txt)
              </div>
            </div>
          )}
        </div>

        {/* Alternative: Paste raw text */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#94a3b8', marginBottom: 6 }}>
            OR PASTE RAW TEXT / CHAT LOGS / EXPLOIT LISTINGS:
          </label>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste raw vendor messages, forum posts, wallet addresses, PGP signed blocks, or onion links to verify..."
            rows={4}
            style={{
              width: '100%',
              background: '#0a0a0c',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 6,
              padding: 12,
              color: '#e2e8f0',
              fontSize: 13,
              fontFamily: 'monospace',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Plain English Error Message */}
        {uploadError && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 6,
            color: '#f87171',
            fontSize: 13,
            marginBottom: 16
          }}>
            {uploadError}
          </div>
        )}

        {/* Progress State */}
        {isUploading && (
          <div style={{
            padding: '14px 18px',
            background: 'rgba(124, 58, 237, 0.1)',
            border: '1px solid rgba(167, 139, 250, 0.3)',
            borderRadius: 6,
            color: '#c084fc',
            fontSize: 13,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <RefreshCw size={16} className="spin-animation" />
            <span>{progressMsg}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleVerify}
          disabled={isUploading}
          style={{
            padding: '12px 28px',
            background: isUploading ? '#4c1d95' : '#7c3aed',
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 700,
            cursor: isUploading ? 'not-allowed' : 'pointer'
          }}
        >
          {isUploading ? 'Verifying Evidence...' : 'Trace & Deanonymize Evidence'}
        </button>
      </div>

      {/* VERIFICATION RESULT CARD */}
      {currentResult && (
        <div style={{
          background: '#141416',
          border: '2px solid rgba(167, 139, 250, 0.5)',
          borderRadius: 12,
          padding: 24,
          marginBottom: 32,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>
                Verification Analysis Verdict
              </div>
              <div style={{ marginTop: 8 }}>
                {getVerdictBadge(currentResult.verdict)}
              </div>
            </div>

            {/* Trust Score Gauge */}
            <div style={{
              background: '#0a0a0c',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 8,
              padding: '10px 20px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: currentResult.trust_score > 60 ? '#10b981' : currentResult.trust_score > 30 ? '#f59e0b' : '#94a3b8' }}>
                {Math.round(currentResult.trust_score)}/100
              </div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>ATTRIBUTION CONFIDENCE</div>
            </div>
          </div>

          {/* Target Metadata & Matched Link */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 6,
            padding: 12,
            marginBottom: 20,
            fontSize: 13,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 20
          }}>
            <div>
              <span style={{ color: '#64748b' }}>File: </span>
              <strong style={{ color: '#e2e8f0' }}>{currentResult.filename}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>SHA-256: </span>
              <code style={{ color: '#a78bfa' }}>{currentResult.sha256}</code>
            </div>

            {/* Matched Actor Link */}
            {currentResult.matched_actor_id && (
              <div>
                <span style={{ color: '#64748b' }}>Linked Threat Actor: </span>
                <button
                  onClick={() => onNavigate('actors', currentResult.matched_actor_id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f87171',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {currentResult.matched_actor_id} (Inspect Actor Profile →)
                </button>
              </div>
            )}

            {/* Matched Source Link */}
            {currentResult.matched_source_id && (
              <div>
                <span style={{ color: '#64748b' }}>Source: </span>
                <span style={{ color: '#34d399', fontWeight: 700 }}>
                  {currentResult.matched_source_id}
                </span>
              </div>
            )}
          </div>

          {/* SIGNALS TABLE */}
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#cbd5e1', marginBottom: 12 }}>
            Extracted Attribution Signals & Indicators ({currentResult.signals?.length || 0})
          </h3>

          {currentResult.signals && currentResult.signals.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.05)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>Signal Type</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>Weight</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>Matched Record</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}>Reason</th>
                </tr>
              </thead>
              <tbody>
                {currentResult.signals.map((sig: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '10px 12px', color: '#c084fc', fontWeight: 600 }}>{sig.type}</td>
                    <td style={{ padding: '10px 12px', color: '#e2e8f0' }}>+{sig.weight}</td>
                    <td style={{ padding: '10px 12px', color: '#cbd5e1', fontFamily: 'monospace' }}>
                      {typeof sig.matched_record === 'object' ? JSON.stringify(sig.matched_record) : String(sig.matched_record)}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{sig.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              No corroborating signals found. The submitted evidence cannot be linked to any known threat actor or verified source.
            </div>
          )}

          {/* Action Row */}
          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <a
              href={getReportUrl(dateFilter)}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                background: '#7c3aed',
                color: '#fff',
                borderRadius: 6,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: 600
              }}
            >
              <Download size={14} /> Download Official Dossier Report
            </a>
          </div>
        </div>
      )}

      {/* PAST VERIFICATION HISTORY TABLE */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#fff' }}>
            Past Verification History ({history.length})
          </h2>
          <button
            onClick={loadHistory}
            style={{
              background: 'none',
              border: 'none',
              color: '#a78bfa',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12
            }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {historyLoading ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
            Loading upload history...
          </div>
        ) : history.length === 0 ? (
          <div style={{
            background: '#141416',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            padding: 32,
            textAlign: 'center',
            color: '#64748b'
          }}>
            <Clock size={28} style={{ margin: '0 auto 8px auto' }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1' }}>No evidence has been verified yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Upload a document or paste text above to execute your first trace.
            </div>
          </div>
        ) : (
          <div style={{
            background: '#141416',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 8,
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.04)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Filename</th>
                  <th style={{ padding: '10px 14px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Type</th>
                  <th style={{ padding: '10px 14px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>SHA-256</th>
                  <th style={{ padding: '10px 14px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Verdict</th>
                  <th style={{ padding: '10px 14px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Confidence</th>
                  <th style={{ padding: '10px 14px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Date</th>
                  <th style={{ padding: '10px 14px', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '10px 14px', color: '#fff', fontWeight: 600 }}>{item.filename}</td>
                    <td style={{ padding: '10px 14px', color: '#94a3b8', textTransform: 'uppercase', fontSize: 11 }}>{item.file_type}</td>
                    <td style={{ padding: '10px 14px', color: '#a78bfa', fontFamily: 'monospace', fontSize: 12 }}>
                      {item.sha256.slice(0, 16)}...
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {getVerdictBadge(item.verdict)}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#e2e8f0', fontWeight: 600 }}>
                      {Math.round(item.trust_score)}%
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>
                      {new Date(item.uploaded_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <button
                        onClick={() => viewHistoricalRecord(item.id)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#cbd5e1',
                          padding: '4px 10px',
                          borderRadius: 4,
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
