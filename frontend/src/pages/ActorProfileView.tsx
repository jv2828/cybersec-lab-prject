import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Key, 
  Wallet, 
  ShieldAlert, 
  Clock, 
  Layers, 
  ArrowRight,
  Download,
  RotateCcw,
  CheckCircle,
  XCircle,
  Activity,
  GitBranch,
  Network,
  HelpCircle,
  ExternalLink,
  Search
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  fetchActors, 
  fetchActorProfile, 
  reviewPersonaLink, 
  getExportUrl, 
  DateFilter 
} from '../services/api';
import { PageHeader } from '../components/PageHeader';
import { ActorGraphView } from './ActorGraphView';

interface ActorProfileViewProps {
  initialActorId?: string;
  onNavigate: (tab: string, targetId?: string) => void;
  dateFilter: DateFilter;
}

export const ActorProfileView: React.FC<ActorProfileViewProps> = ({ 
  initialActorId, 
  onNavigate, 
  dateFilter 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'profiles' | 'graph'>('profiles');
  const [actors, setActors] = useState<any[]>([]);
  const [selectedActorId, setSelectedActorId] = useState<string>(initialActorId || '');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [minRisk, setMinRisk] = useState<number>(0);
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [selectedSource, setSelectedSource] = useState('');

  // Persona Link Review Feedback message
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadActors() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchActors(dateFilter);
        setActors(data);
        if (!selectedActorId && data.length > 0) {
          setSelectedActorId(data[0].id);
        } else if (selectedActorId && !data.some((a: any) => a.id === selectedActorId) && data.length > 0) {
          setSelectedActorId(data[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch threat actors from database.');
      } finally {
        setLoading(false);
      }
    }
    loadActors();
  }, [dateFilter]);

  const loadProfile = async (id: string) => {
    setProfileLoading(true);
    setReviewMessage(null);
    try {
      const data = await fetchActorProfile(id);
      setProfile(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (selectedActorId) {
      loadProfile(selectedActorId);
    }
  }, [selectedActorId]);

  const handleReviewPersonaLink = async (linkId: number, action: 'ACCEPT' | 'REJECT') => {
    try {
      const result = await reviewPersonaLink(linkId, action, `Analyst reviewed and set to ${action}`);
      setReviewMessage(`Persona migration link ${action === 'ACCEPT' ? 'ACCEPTED and merged into relationship graph' : 'REJECTED'}.`);
      if (selectedActorId) {
        loadProfile(selectedActorId);
      }
    } catch (err: any) {
      setReviewMessage(`Action failed: ${err.message || 'Server error'}`);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setMinRisk(0);
    setMinConfidence(0);
    setSelectedSource('');
  };

  // Filtered actors
  const filteredActors = actors.filter((a) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = a.primary_handle.toLowerCase().includes(q);
      const matchCat = a.category.toLowerCase().includes(q);
      const matchHandles = a.handles?.some((h: any) => h.handle.toLowerCase().includes(q));
      if (!matchName && !matchCat && !matchHandles) return false;
    }
    if (selectedCategory && a.category !== selectedCategory) return false;
    if (minRisk > 0 && a.risk_score < minRisk) return false;
    if (minConfidence > 0 && (a.attribution_confidence || 0) < minConfidence) return false;
    if (selectedSource && a.source_id !== selectedSource) return false;
    return true;
  });

  // Unique categories & sources for filter dropdowns
  const categories = Array.from(new Set(actors.map((a) => a.category).filter(Boolean)));
  const sources = Array.from(new Set(actors.map((a) => a.source_id).filter(Boolean)));

  // Format 24-hr behavioural histogram data for BarChart
  const histogramData = profile?.behavioural_profile?.hour_of_day_histogram 
    ? profile.behavioural_profile.hour_of_day_histogram.map((count: number, hour: number) => ({
        hour: `${String(hour).padStart(2, '0')}:00`,
        activity: count
      }))
    : [];

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1500, margin: '0 auto' }}>
      <PageHeader
        title="Threat Actors & Syndicates"
        description="Cross-marketplace persona deanonymization, behavioural activity profiling, and cryptographic identity mapping."
        helpText="Investigate known threat actor syndicates. Review character n-gram stylometric links, 24-hour activity heatmaps, and accept or reject candidate persona migrations."
        breadcrumbs={[
          { label: 'Threat Actors', onClick: () => { setSelectedActorId(actors[0]?.id || ''); setActiveSubTab('profiles'); } },
          ...(profile ? [{ label: profile.primary_handle }] : [])
        ]}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <a
              href={getExportUrl('actors', 'csv', dateFilter)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#e2e8f0',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <Download size={13} /> Export Actors CSV
            </a>
            <a
              href={getExportUrl('actors', 'json', dateFilter)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#e2e8f0',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              <Download size={13} /> Export JSON
            </a>
          </div>
        }
      />

      {/* SUB-TABS: Profiles vs Graph */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 12 }}>
        <button
          onClick={() => setActiveSubTab('profiles')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 6,
            background: activeSubTab === 'profiles' ? '#7c3aed' : 'rgba(255, 255, 255, 0.05)',
            color: activeSubTab === 'profiles' ? '#ffffff' : '#94a3b8',
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <Users size={15} /> Profiles & Intelligence
        </button>

        <button
          onClick={() => setActiveSubTab('graph')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 6,
            background: activeSubTab === 'graph' ? '#7c3aed' : 'rgba(255, 255, 255, 0.05)',
            color: activeSubTab === 'graph' ? '#ffffff' : '#94a3b8',
            border: 'none',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <Network size={15} /> Actor Relationship Graph
        </button>
      </div>

      {activeSubTab === 'graph' ? (
        <div style={{ height: 'calc(100vh - 220px)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <ActorGraphView initialNodeId={selectedActorId} onNavigate={onNavigate} dateFilter={dateFilter} />
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 24, height: 'calc(100vh - 240px)', minHeight: 650 }}>
          {/* LEFT SIDEBAR: Search, Filters & Actor List */}
          <div style={{
            width: 360,
            background: '#141416',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 10,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Filters Header */}
            <div style={{ padding: 14, borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: '#101012' }}>
              {/* Search Bar */}
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search size={14} color="#64748b" style={{ position: 'absolute', left: 10, top: 10 }} />
                <input
                  type="text"
                  placeholder="Search handles, categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px 8px 30px',
                    background: '#0a0a0c',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: 6,
                    color: '#e2e8f0',
                    fontSize: 12,
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Filter Row 1: Category & Source */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  style={{
                    background: '#0a0a0c',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#cbd5e1',
                    borderRadius: 4,
                    padding: '5px 8px',
                    fontSize: 11
                  }}
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  style={{
                    background: '#0a0a0c',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#cbd5e1',
                    borderRadius: 4,
                    padding: '5px 8px',
                    fontSize: 11
                  }}
                >
                  <option value="">All Sources</option>
                  {sources.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Filter Row 2: Min Risk & Min Confidence */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <select
                  value={minRisk}
                  onChange={(e) => setMinRisk(Number(e.target.value))}
                  style={{
                    background: '#0a0a0c',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#cbd5e1',
                    borderRadius: 4,
                    padding: '5px 8px',
                    fontSize: 11
                  }}
                >
                  <option value={0}>Min Risk: Any</option>
                  <option value={80}>Risk 80+</option>
                  <option value={85}>Risk 85+</option>
                  <option value={90}>Risk 90+</option>
                </select>

                <select
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  style={{
                    background: '#0a0a0c',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#cbd5e1',
                    borderRadius: 4,
                    padding: '5px 8px',
                    fontSize: 11
                  }}
                >
                  <option value={0}>Confidence: Any</option>
                  <option value={60}>Confidence 60%+</option>
                  <option value={75}>Confidence 75%+</option>
                  <option value={85}>Confidence 85%+</option>
                </select>
              </div>

              {/* Reset Filters & Results Count */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  Showing <strong>{filteredActors.length}</strong> of {actors.length} actors
                </span>
                <button
                  onClick={resetFilters}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#a78bfa',
                    fontSize: 11,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3
                  }}
                >
                  <RotateCcw size={11} /> Reset
                </button>
              </div>
            </div>

            {/* Actors List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              {loading && (
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  Loading actors database...
                </div>
              )}

              {!loading && filteredActors.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  <div>No threat actors match the selected filters.</div>
                  <button
                    onClick={resetFilters}
                    style={{
                      marginTop: 10,
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#cbd5e1',
                      padding: '4px 10px',
                      borderRadius: 4,
                      fontSize: 11,
                      cursor: 'pointer'
                    }}
                  >
                    Clear Filter Criteria
                  </button>
                </div>
              )}

              {!loading && filteredActors.map((a) => {
                const isSelected = a.id === selectedActorId;
                return (
                  <div
                    key={a.id}
                    onClick={() => setSelectedActorId(a.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 8,
                      marginBottom: 6,
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(167, 139, 250, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                      border: isSelected ? '1px solid #7c3aed' : '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#c084fc' : '#ffffff' }}>
                        {a.primary_handle}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: a.risk_score >= 85 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                        color: a.risk_score >= 85 ? '#f87171' : '#fbbf24',
                        border: a.risk_score >= 85 ? '1px solid #ef4444' : '1px solid #f59e0b'
                      }}>
                        RISK {a.risk_score}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, fontSize: 11, color: '#94a3b8' }}>
                      <span>{a.category}</span>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>
                        {a.attribution_confidence || 85}% Conf.
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT DETAIL PANEL */}
          <div style={{
            flex: 1,
            background: '#141416',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 10,
            overflowY: 'auto',
            padding: 28
          }}>
            {profileLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                Loading profile details...
              </div>
            ) : !profile ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                Select an actor from the left list to view their complete profile dossier.
              </div>
            ) : (
              <div>
                {/* Profile Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingBottom: 20,
                  marginBottom: 24,
                  flexWrap: 'wrap',
                  gap: 16
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#ffffff', margin: 0 }}>
                        {profile.primary_handle}
                      </h1>
                      <span style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid #ef4444',
                        color: '#f87171',
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700
                      }}>
                        RISK INDEX {profile.risk_score}/100
                      </span>
                      <span style={{
                        background: 'rgba(167, 139, 250, 0.2)',
                        border: '1px solid #7c3aed',
                        color: '#c084fc',
                        padding: '3px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700
                      }}>
                        {profile.category}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span>Primary Source: <strong style={{ color: '#34d399' }}>{profile.source_id || 'AlphaBay'}</strong></span>
                      <span>Last Scan Date: <strong style={{ color: '#e2e8f0' }}>{profile.last_scan_date ? new Date(profile.last_scan_date).toLocaleDateString() : 'Active'}</strong></span>
                      <span>Activity Timezone: <strong style={{ color: '#e2e8f0' }}>{profile.activity_timezone || 'UTC+3'}</strong></span>
                    </div>
                  </div>

                  {/* Attribution Confidence Card */}
                  <div style={{
                    background: '#0a0a0c',
                    border: '1px solid rgba(167, 139, 250, 0.4)',
                    borderRadius: 8,
                    padding: '10px 18px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#34d399' }}>
                      {profile.attribution_confidence}%
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: 0.5 }}>
                      ATTRIBUTION CONFIDENCE
                    </div>
                  </div>
                </div>

                {/* Attribution Breakdown Box */}
                {profile.attribution_breakdown && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: 8,
                    padding: 14,
                    marginBottom: 24,
                    fontSize: 12
                  }}>
                    <div style={{ fontWeight: 700, color: '#a78bfa', marginBottom: 6 }}>
                      HOW ATTRIBUTION CONFIDENCE WAS COMPUTED:
                    </div>
                    <div style={{ color: '#cbd5e1', lineHeight: 1.6 }}>
                      Base Score: <strong>+{profile.attribution_breakdown.base_score || 30}</strong> | 
                      Cryptographic PGP Footprints: <strong>+{profile.attribution_breakdown.pgp_factor || 25}</strong> | 
                      Blockchain Wallet Clustering: <strong>+{profile.attribution_breakdown.wallet_factor || 20}</strong> | 
                      Accepted Persona Links: <strong>+{profile.attribution_breakdown.persona_link_factor || 15}</strong>. 
                      Final score normalized to <strong>{profile.attribution_confidence}%</strong> explainable confidence.
                    </div>
                  </div>
                )}

                {/* SUGGESTED PERSONA MIGRATION LINKS (Human-in-the-loop review) */}
                <div style={{
                  background: 'rgba(124, 58, 237, 0.08)',
                  border: '1px solid rgba(167, 139, 250, 0.3)',
                  borderRadius: 10,
                  padding: 20,
                  marginBottom: 28
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <GitBranch size={16} color="#c084fc" />
                      <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#ffffff' }}>
                        Suggested Persona Migration Links (Rebrand Detection)
                      </h3>
                    </div>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Human-in-the-loop Verification</span>
                  </div>

                  {reviewMessage && (
                    <div style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: 6, color: '#34d399', fontSize: 12, marginBottom: 12 }}>
                      {reviewMessage}
                    </div>
                  )}

                  {profile.persona_links && profile.persona_links.filter((pl: any) => pl.status === 'PROPOSED').length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {profile.persona_links.filter((pl: any) => pl.status === 'PROPOSED').map((pl: any) => (
                        <div 
                          key={pl.id}
                          style={{
                            background: '#141416',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 6,
                            padding: 12,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 12
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 700, color: '#fff', fontSize: 13 }}>
                                Candidate Handle: {pl.rationale?.candidate_handle || pl.handle_id}
                              </span>
                              <span style={{ fontSize: 10, background: '#7c3aed', color: '#fff', padding: '1px 5px', borderRadius: 4, textTransform: 'uppercase' }}>
                                Method: {pl.method}
                              </span>
                              <span style={{ fontSize: 11, color: '#34d399', fontWeight: 700 }}>
                                Match Score: {Math.round(pl.score)}%
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                              Rationale: {pl.rationale?.reasons?.join('; ') || 'AI stylometric & cryptographic linkage'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => handleReviewPersonaLink(pl.id, 'ACCEPT')}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 12px',
                                background: '#10b981',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <CheckCircle size={13} /> Accept & Merge
                            </button>
                            <button
                              onClick={() => handleReviewPersonaLink(pl.id, 'REJECT')}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 12px',
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid #ef4444',
                                color: '#f87171',
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      No unreviewed persona migration links currently pending. All detected handles are either accepted into the relationship network or rejected.
                    </div>
                  )}
                </div>

                {/* BEHAVIOURAL PROFILE: 24-Hour Activity Histogram Bar Chart */}
                <div style={{
                  background: '#0a0a0c',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 10,
                  padding: 20,
                  marginBottom: 28
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Activity size={16} color="#38bdf8" />
                      <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: '#ffffff' }}>
                        Behavioural Profile: 24-Hour Activity Cadence
                      </h3>
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      Inferred Timezone: <strong style={{ color: '#38bdf8' }}>{profile.behavioural_profile?.inferred_timezone || 'UTC+3'}</strong>
                    </div>
                  </div>

                  <div style={{ height: 160, width: '100%', marginBottom: 12 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={histogramData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ background: '#18181b', border: '1px solid #7c3aed', borderRadius: 6, fontSize: 12, color: '#fff' }}
                        />
                        <Bar dataKey="activity" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ display: 'flex', gap: 24, fontSize: 12, color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                    <div>
                      Posting Cadence: <strong style={{ color: '#cbd5e1' }}>{profile.behavioural_profile?.posting_cadence || 'Night/Weekend Active'}</strong>
                    </div>
                    <div>
                      Active Observation Days: <strong style={{ color: '#cbd5e1' }}>{profile.behavioural_profile?.active_days || 5} days</strong>
                    </div>
                  </div>
                </div>

                {/* Real-World Pivot Entities */}
                {profile.real_world_entities && profile.real_world_entities.length > 0 && (
                  <div style={{ marginBottom: 28 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#cbd5e1', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Layers size={15} color="#ef4444" /> Attributed Real-World Entities ({profile.real_world_entities.length})
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                      {profile.real_world_entities.map((rw: any) => (
                        <div key={rw.id} style={{ background: '#0a0a0c', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 8, padding: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{rw.name}</div>
                            <span style={{ fontSize: 10, background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid #ef4444', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                              {rw.confidence}% PIVOT
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#94a3b8' }}>
                            Type: {rw.type} &bull; Country: {rw.country}
                          </div>
                          <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 4, fontFamily: 'monospace' }}>
                            {rw.platform}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Handles & Wallets Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {/* Market Handles */}
                  <div style={{ background: '#0a0a0c', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 8, padding: 16 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} color="#a78bfa" /> Market Handles ({profile.handles?.length || 0})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {profile.handles?.map((h: any) => (
                        <div key={h.id} style={{ background: '#141416', padding: 8, borderRadius: 6, fontSize: 12 }}>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{h.handle}</div>
                          <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                            Marketplace: <strong style={{ color: '#94a3b8' }}>{h.marketplace_id}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cryptocurrency Wallets */}
                  <div style={{ background: '#0a0a0c', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 8, padding: 16 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Wallet size={14} color="#34d399" /> Wallets ({profile.wallets?.length || 0})
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {profile.wallets?.map((w: any) => (
                        <div key={w.id} style={{ background: '#141416', padding: 8, borderRadius: 6, fontSize: 12 }}>
                          <div style={{ color: '#34d399', fontWeight: 600, fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>
                            [{w.currency}] {w.address}
                          </div>
                          <div style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
                            Total Vol: ${w.total_received_usd?.toLocaleString() || 0}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
