import React, { useState } from 'react';
import { HelpCircle, ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  title: string;
  description: string;
  helpText: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  helpText,
  breadcrumbs,
  actions
}) => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight size={12} color="#64748b" />}
              {crumb.onClick ? (
                <button
                  onClick={crumb.onClick}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#a78bfa',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 12,
                    fontWeight: 500,
                    textDecoration: 'underline'
                  }}
                >
                  {crumb.label}
                </button>
              ) : (
                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Main Title Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', margin: 0, letterSpacing: -0.5 }}>
              {title}
            </h1>

            {/* Help Popover Trigger */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowHelp(!showHelp)}
                onMouseEnter={() => setShowHelp(true)}
                onMouseLeave={() => setShowHelp(false)}
                title="Page Help & Purpose"
                style={{
                  background: showHelp ? 'rgba(167, 139, 250, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(167, 139, 250, 0.3)',
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#a78bfa',
                  fontSize: 12,
                  fontWeight: 700
                }}
              >
                ?
              </button>

              {/* Popover Bubble */}
              {showHelp && (
                <div style={{
                  position: 'absolute',
                  top: 32,
                  left: 0,
                  zIndex: 50,
                  width: 320,
                  background: '#18181b',
                  border: '1px solid #7c3aed',
                  borderRadius: 8,
                  padding: '12px 14px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 0 15px rgba(124, 58, 237, 0.3)',
                  fontSize: 12,
                  color: '#e2e8f0',
                  lineHeight: 1.5
                }}>
                  <div style={{ fontWeight: 700, color: '#c084fc', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <HelpCircle size={14} /> Page Overview
                  </div>
                  {helpText}
                </div>
              )}
            </div>
          </div>

          {/* One line description */}
          <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#94a3b8' }}>
            {description}
          </p>
        </div>

        {/* Actions (e.g. Export these results button) */}
        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
