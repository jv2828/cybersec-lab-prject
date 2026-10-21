import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Globe2, 
  Users, 
  DownloadCloud, 
  Home, 
  ChevronDown, 
  Layers, 
  FolderLock, 
  Cpu, 
  Calendar, 
  ShieldAlert,
  Bell
} from 'lucide-react';
import { DateFilter } from '../services/api';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  dateFilter: DateFilter & { preset: string };
  setDateFilter: (filter: DateFilter & { preset: string }) => void;
  openSearch: () => void;
  unreadAlertsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  dateFilter,
  setDateFilter,
  openSearch,
  unreadAlertsCount
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 5 Primary items as mandated
  const primaryTabs = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'verify', label: 'Verify Evidence', icon: ShieldCheck, badge: 'CORE' },
    { id: 'actors', label: 'Threat Actors', icon: Users },
    { id: 'services', label: 'Hidden Services', icon: Globe2 },
    { id: 'export', label: 'Export & Reports', icon: DownloadCloud },
  ];

  const advancedItems = [
    { id: 'pivots', label: 'Real-World Pivots', icon: Layers, desc: 'Cross-platform attribution' },
    { id: 'cases', label: 'Cases & Dossiers', icon: FolderLock, desc: 'Investigation records' },
    { id: 'pipeline', label: 'Pipeline & Autonomous Feeds', icon: Cpu, desc: 'Feeds & engine runs' },
  ];

  const handlePreset = (preset: 'all' | '7d' | '30d' | '90d') => {
    const now = new Date();
    if (preset === 'all') {
      setDateFilter({ preset: 'all', date_from: undefined, date_to: undefined });
      return;
    }
    const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
    const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    setDateFilter({
      preset,
      date_from: past.toISOString().split('T')[0],
      date_to: now.toISOString().split('T')[0]
    });
  };

  const isAdvancedActive = ['pivots', 'cases', 'pipeline'].includes(currentTab);

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(8, 8, 8, 0.92)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      minHeight: 70,
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      gap: 12
    }}>
      {/* Brand & Left Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <a 
          href="/about" 
          title="About Sellix Trace"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10, 
            textDecoration: 'none', 
            color: '#fff' 
          }}
        >
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(167, 139, 250, 0.4)'
          }}>
            <ShieldAlert size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.1 }}>SELLIX TRACE</div>
            <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, letterSpacing: 0.5 }}>DEANONYMIZATION PLATFORM</div>
          </div>
        </a>

        {/* The 5 Required Primary Navigation Items */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {primaryTabs.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  padding: '7px 14px',
                  borderRadius: 9999,
                  background: isActive ? 'rgba(167, 139, 250, 0.18)' : 'transparent',
                  color: isActive ? '#c084fc' : '#94a3b8',
                  border: isActive ? '1px solid rgba(167, 139, 250, 0.4)' : '1px solid transparent',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={15} />
                {item.label}
                {item.badge && (
                  <span style={{
                    fontSize: 9,
                    background: '#7c3aed',
                    color: '#ffffff',
                    padding: '1px 5px',
                    borderRadius: 4,
                    fontWeight: 800
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Advanced Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '7px 12px',
                borderRadius: 9999,
                background: isAdvancedActive ? 'rgba(167, 139, 250, 0.15)' : 'transparent',
                color: isAdvancedActive ? '#c084fc' : '#94a3b8',
                border: isAdvancedActive ? '1px solid rgba(167, 139, 250, 0.3)' : '1px solid transparent',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <span>Advanced</span>
              <ChevronDown size={14} />
            </button>

            {showAdvanced && (
              <div 
                onMouseLeave={() => setShowAdvanced(false)}
                style={{
                  position: 'absolute',
                  top: 38,
                  left: 0,
                  width: 260,
                  background: '#141416',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 10,
                  padding: 6,
                  boxShadow: '0 12px 30px rgba(0,0,0,0.8)',
                  zIndex: 100
                }}
              >
                {advancedItems.map((adv) => {
                  const AdvIcon = adv.icon;
                  const isActive = currentTab === adv.id;
                  return (
                    <button
                      key={adv.id}
                      onClick={() => {
                        setCurrentTab(adv.id);
                        setShowAdvanced(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '9px 12px',
                        borderRadius: 6,
                        background: isActive ? 'rgba(167, 139, 250, 0.15)' : 'transparent',
                        border: 'none',
                        color: isActive ? '#c084fc' : '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: 'pointer'
                      }}
                    >
                      <AdvIcon size={16} color={isActive ? '#c084fc' : '#94a3b8'} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{adv.label}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{adv.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Global Date-Range Filter & Right Utilities */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        {/* Global Date Range Filter */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          padding: '4px 8px'
        }}>
          <Calendar size={14} color="#a78bfa" />
          <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>TIMELINE:</span>

          {/* Preset Buttons */}
          {(['all', '7d', '30d', '90d'] as const).map((p) => {
            const isSelected = dateFilter.preset === p;
            return (
              <button
                key={p}
                onClick={() => handlePreset(p)}
                style={{
                  background: isSelected ? '#7c3aed' : 'rgba(255, 255, 255, 0.05)',
                  color: isSelected ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  borderRadius: 4,
                  padding: '3px 7px',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {p === 'all' ? 'All' : p}
              </button>
            );
          })}

          {/* From / To Date Inputs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
            <input
              type="date"
              aria-label="Filter from date"
              value={dateFilter.date_from || ''}
              onChange={(e) => setDateFilter({
                preset: 'custom',
                date_from: e.target.value || undefined,
                date_to: dateFilter.date_to
              })}
              style={{
                background: '#0a0a0c',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#e2e8f0',
                borderRadius: 4,
                padding: '2px 4px',
                fontSize: 11
              }}
            />
            <span style={{ fontSize: 11, color: '#64748b' }}>to</span>
            <input
              type="date"
              aria-label="Filter to date"
              value={dateFilter.date_to || ''}
              onChange={(e) => setDateFilter({
                preset: 'custom',
                date_from: dateFilter.date_from,
                date_to: e.target.value || undefined
              })}
              style={{
                background: '#0a0a0c',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#e2e8f0',
                borderRadius: 4,
                padding: '2px 4px',
                fontSize: 11
              }}
            />
          </div>
        </div>

        {/* Global Search Button */}
        <button
          onClick={openSearch}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 9999,
            color: '#94a3b8',
            fontSize: 12,
            cursor: 'pointer'
          }}
        >
          <Search size={13} />
          <span>Search</span>
          <span style={{ 
            fontSize: 10, 
            background: 'rgba(255, 255, 255, 0.1)', 
            padding: '1px 5px', 
            borderRadius: 4, 
            color: '#cbd5e1' 
          }}>
            ⌘K
          </span>
        </button>

        {/* Alerts Trigger */}
        <button
          onClick={() => setCurrentTab('pipeline')}
          style={{
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: 7,
            borderRadius: '50%',
            cursor: 'pointer',
            color: '#cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Recent Alerts & Ingest Runs"
        >
          <Bell size={15} />
          {unreadAlertsCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 15,
              height: 15,
              borderRadius: '50%',
              background: '#ef4444',
              color: '#fff',
              fontSize: 9,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 8px #ef4444'
            }}>
              {unreadAlertsCount}
            </span>
          )}
        </button>

        {/* Synthetic Label Guardrail badge */}
        <div style={{
          padding: '3px 8px',
          background: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 4,
          fontSize: 10,
          fontWeight: 800,
          color: '#10b981',
          letterSpacing: 0.4
        }}>
          SYNTHETIC DATA
        </div>
      </div>
    </header>
  );
};
