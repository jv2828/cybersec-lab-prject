import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SearchModal } from './components/SearchModal';
import { Dashboard } from './pages/Dashboard';
import { VerifyEvidenceView } from './pages/VerifyEvidenceView';
import { ServicesView } from './pages/ServicesView';
import { ActorProfileView } from './pages/ActorProfileView';
import { ExportView } from './pages/ExportView';
import { PivotsView } from './pages/PivotsView';
import { CasesView } from './pages/CasesView';
import { PipelineView } from './pages/PipelineView';
import { fetchAlerts, DateFilter } from './services/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [targetEntityId, setTargetEntityId] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);

  // Global Timeline Date Filter state
  const [dateFilter, setDateFilter] = useState<DateFilter & { preset: string }>({
    preset: 'all',
    date_from: undefined,
    date_to: undefined
  });

  useEffect(() => {
    async function loadAlertsCount() {
      try {
        const data = await fetchAlerts();
        const unread = data.filter((a: any) => a.status === 'UNREAD').length;
        setUnreadAlertsCount(unread);
      } catch (err) {
        console.error(err);
      }
    }
    loadAlertsCount();
  }, [currentTab]);

  // Global Cmd+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (tab: string, entityId?: string) => {
    setCurrentTab(tab);
    if (entityId) {
      setTargetEntityId(entityId);
    }
  };

  const renderCurrentView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} dateFilter={dateFilter} />;
      case 'verify':
        return <VerifyEvidenceView onNavigate={handleNavigate} dateFilter={dateFilter} />;
      case 'actors':
        return <ActorProfileView initialActorId={targetEntityId} onNavigate={handleNavigate} dateFilter={dateFilter} />;
      case 'services':
        return <ServicesView initialServiceId={targetEntityId} onNavigate={handleNavigate} dateFilter={dateFilter} />;
      case 'export':
        return <ExportView dateFilter={dateFilter} />;
      case 'pivots':
        return <PivotsView onNavigate={handleNavigate} />;
      case 'cases':
        return <CasesView />;
      case 'pipeline':
        return <PipelineView />;
      default:
        return <Dashboard onNavigate={handleNavigate} dateFilter={dateFilter} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: '#ffffff' }}>
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setTargetEntityId('');
          setCurrentTab(tab);
        }}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        openSearch={() => setIsSearchOpen(true)}
        unreadAlertsCount={unreadAlertsCount}
      />

      <main>
        {renderCurrentView()}
      </main>

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleNavigate}
      />
    </div>
  );
};

export default App;
