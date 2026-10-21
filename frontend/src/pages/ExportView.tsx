import React from 'react';
import { 
  DownloadCloud, 
  FileSpreadsheet, 
  FileCode, 
  Printer, 
  Calendar, 
  ShieldCheck, 
  Globe2, 
  Users, 
  AlertTriangle,
  FileCheck
} from 'lucide-react';
import { getExportUrl, getReportUrl, DateFilter } from '../services/api';
import { PageHeader } from '../components/PageHeader';

interface ExportViewProps {
  dateFilter: DateFilter & { preset: string };
}

export const ExportView: React.FC<ExportViewProps> = ({ dateFilter }) => {
  const getTimelineLabel = () => {
    if (dateFilter.preset === 'all' || (!dateFilter.date_from && !dateFilter.date_to)) {
      return 'All Recorded History (No Date Restrictions)';
    }
    if (dateFilter.date_from && dateFilter.date_to) {
      return `${dateFilter.date_from} through ${dateFilter.date_to}`;
    }
    if (dateFilter.date_from) {
      return `From ${dateFilter.date_from} onwards`;
    }
    return `Up until ${dateFilter.date_to}`;
  };

  const datasets = [
    {
      id: 'actors' as const,
      name: 'Threat Actors & Syndicates',
      icon: Users,
      color: '#c084fc',
      description: 'Consolidated profiles, handles across darknet markets, PGP keys, cryptocurrency wallets, attributed real-world identities, and attribution confidence.',
      fields: ['actor_id', 'primary_handle', 'category', 'risk_score', 'handles', 'pgp_fingerprints', 'wallets', 'real_world_entities', 'attribution_confidence', 'source_id', 'last_scan_date']
    },
    {
      id: 'services' as const,
      name: 'Hidden Services & Origins',
      icon: Globe2,
      color: '#38bdf8',
      description: 'Tor onion services, server banners, SSL certificates, favicon perceptual hashes, and matched clearnet origin host candidates with confidence scores.',
      fields: ['service_id', 'onion_address', 'service_name', 'marketplace_id', 'source_id', 'risk_score', 'findings_count', 'top_origin_ip', 'origin_confidence', 'last_seen']
    },
    {
      id: 'evidence' as const,
      name: 'Evidence Verifications',
      icon: FileCheck,
      color: '#34d399',
      description: 'Audit history of all uploaded investigative files, SHA-256 digests, forensic verdicts (Trusted / Threat Actor / Unknown), confidence scores, and signals.',
      fields: ['id', 'filename', 'file_type', 'sha256', 'verdict', 'trust_score', 'matched_actor_id', 'matched_source_id', 'signals_count', 'uploaded_at']
    },
    {
      id: 'findings' as const,
      name: 'Misconfiguration Findings',
      icon: AlertTriangle,
      color: '#f59e0b',
      description: 'Granular technical vulnerability findings (Apache server-status leaks, TLS certificate host leaks, default banners, descriptor timing anomalies).',
      fields: ['finding_id', 'service_id', 'rule_id', 'severity', 'title', 'confidence', 'description', 'detected_at']
    }
  ];

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
      <PageHeader
        title="Export & Intelligence Reports"
        description="Extract standardized forensic result sets in CSV or JSON formats, or generate a printable Dossier report."
        helpText="Export data filtered by the global timeline. The printable report includes high-level executive KPIs, verified actor profiles, and deanonymization leads ready for law enforcement submission."
      />

      {/* Active Date Range Note */}
      <div style={{
        background: 'rgba(124, 58, 237, 0.1)',
        border: '1px solid rgba(167, 139, 250, 0.3)',
        borderRadius: 8,
        padding: '14px 20px',
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Calendar size={18} color="#a78bfa" />
          <span style={{ fontSize: 13, color: '#e2e8f0' }}>
            Active Query Timeline: <strong style={{ color: '#c084fc' }}>{getTimelineLabel()}</strong>
          </span>
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          All exports below strictly filter on this timeline.
        </div>
      </div>

      {/* Flagship Printable Dossier Report Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(20, 20, 22, 0.95) 100%)',
        border: '2px solid rgba(167, 139, 250, 0.5)',
        borderRadius: 12,
        padding: 24,
        marginBottom: 32,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 20
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Printer size={20} color="#a78bfa" />
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#fff' }}>
              Printable Threat Intelligence Dossier
            </h2>
            <span style={{ background: '#7c3aed', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>
              PDF READY
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#cbd5e1', maxWidth: 700 }}>
            Generates a clean, print-formatted multi-page dossier covering threat actors, hidden service misconfigurations, matched clearnet origin servers, and recent evidence traces. Includes a dedicated "Print / Save as PDF" button.
          </p>
        </div>

        <a
          href={getReportUrl(dateFilter)}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            background: '#7c3aed',
            color: '#fff',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)'
          }}
        >
          <Printer size={16} /> Open Dossier Report
        </a>
      </div>

      {/* DATASET CARDS GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 24
      }}>
        {datasets.map((ds) => {
          const Icon = ds.icon;
          return (
            <div
              key={ds.id}
              style={{
                background: '#141416',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 10,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Icon size={18} color={ds.color} />
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#fff' }}>
                    {ds.name}
                  </h3>
                </div>

                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5, marginBottom: 16 }}>
                  {ds.description}
                </p>

                {/* Schema preview */}
                <div style={{ background: '#0a0a0c', padding: '10px 12px', borderRadius: 6, marginBottom: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                    EXPORT SCHEMA FIELDS:
                  </div>
                  <div style={{ fontSize: 11, color: '#cbd5e1', fontFamily: 'monospace', lineHeight: 1.4 }}>
                    {ds.fields.join(', ')}
                  </div>
                </div>
              </div>

              {/* Action format buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <a
                  href={getExportUrl(ds.id, 'csv', dateFilter)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '9px 12px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  <FileSpreadsheet size={14} color="#34d399" />
                  <span>Download CSV</span>
                </a>

                <a
                  href={getExportUrl(ds.id, 'json', dateFilter)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '9px 12px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#fff',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: 'none'
                  }}
                >
                  <FileCode size={14} color="#38bdf8" />
                  <span>Download JSON</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
