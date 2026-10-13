import React from 'react';
import { 
  ShieldAlert, 
  Search, 
  Network, 
  Globe2, 
  Users, 
  Layers, 
  FolderLock, 
  Activity, 
  Bell, 
  ArrowLeft 
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  openSearch: () => void;
  unreadAlertsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  openSearch,
  unreadAlertsCount
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'services', label: 'Hidden Services', icon: Globe2 },
    { id: 'graph', label: 'Actor Graph', icon: Network },
    { id: 'actors', label: 'Threat Actors', icon: Users },
    { id: 'pivots', label: 'Real-World Pivots', icon: Layers },
    { id: 'cases', label: 'Cases & Dossiers', icon: FolderLock },
    { id: 'pipeline', label: 'Pipeline & Audits', icon: ShieldAlert },
  ];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 40,
      background: 'rgba(8, 8, 8, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      height: 72,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px'
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <a 
          href="/" 
          title="Back to Landing Page"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10, 
            textDecoration: 'none', 
            color: '#fff' 
          }}
        >
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(167, 139, 250, 0.4)'
          }}>
            <ShieldAlert size={19} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.1 }}>SELLIX TRACE</div>
            <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, letterSpacing: 0.5 }}>OSINT &bull; CTI</div>
          </div>
        </a>

        {/* Global Nav Tabs */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 24 }}>
          {navItems.map((item) => {
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
                  padding: '7px 13px',
                  borderRadius: 9999,
                  background: isActive ? 'rgba(167, 139, 250, 0.15)' : 'transparent',
                  color: isActive ? '#a78bfa' : '#94a3b8',
                  border: isActive ? '1px solid rgba(167, 139, 250, 0.35)' : '1px solid transparent',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Right Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Global Search Button */}
        <button
          onClick={openSearch}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '7px 16px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 9999,
            color: '#94a3b8',
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          <Search size={14} />
          <span>Search entities (e.g. <code>pgp:</code>, <code>wallet:</code>)...</span>
          <span style={{ 
            fontSize: 10, 
            background: 'rgba(255, 255, 255, 0.1)', 
            padding: '2px 6px', 
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
            padding: 8,
            borderRadius: '50%',
            cursor: 'pointer',
            color: '#cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Recent Alerts"
        >
          <Bell size={16} />
          {unreadAlertsCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#ef4444',
              color: '#fff',
              fontSize: 10,
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

        {/* Analyst Profile Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '5px 12px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 9999
        }}>
          <div style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#2e1065',
            color: '#c084fc',
            fontSize: 11,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            V
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>Agent Vance</div>
          <span style={{ fontSize: 10, color: '#10b981', fontWeight: 800 }}>&bull; ACTIVE</span>
        </div>
      </div>
    </header>
  );
};
