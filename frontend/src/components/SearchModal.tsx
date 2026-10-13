import React, { useState, useEffect } from 'react';
import { Search, X, ExternalLink, ShieldAlert, Key, Wallet, Globe, User } from 'lucide-react';
import { searchEntities } from '../services/api';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string, targetId?: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchEntities(query);
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'ACTOR':
      case 'HANDLE':
        return <User size={15} color="#a78bfa" />;
      case 'PGP_KEY':
        return <Key size={15} color="#38bdf8" />;
      case 'WALLET':
        return <Wallet size={15} color="#f59e0b" />;
      case 'CLEARNET_IP':
      case 'HIDDEN_SERVICE':
        return <Globe size={15} color="#10b981" />;
      default:
        return <ShieldAlert size={15} color="#94a3b8" />;
    }
  };

  const handleSelect = (item: any) => {
    onClose();
    if (item.category === 'ACTOR' || item.category === 'HANDLE') {
      onNavigate('actors', item.id);
    } else if (item.category === 'HIDDEN_SERVICE' || item.category === 'CLEARNET_IP') {
      onNavigate('services', item.id);
    } else {
      onNavigate('graph', item.id);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: 100
    }}>
      <div style={{
        width: '100%',
        maxWidth: 640,
        background: '#141416',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8)'
      }}>
        {/* Search Input Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <Search size={18} color="#a78bfa" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type query or syntax: handle:ghost, pgp:98A1, wallet:bc1q, ip:198.51..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: 15,
              fontFamily: 'inherit'
            }}
          />
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: 420, overflowY: 'auto', padding: '12px' }}>
          {loading && (
            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              Scanning threat-intelligence index...
            </div>
          )}

          {!loading && results.length === 0 && query.length >= 2 && (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: 14 }}>
              No entities found matching "{query}".
            </div>
          )}

          {!loading && results.map((item, idx) => (
            <div
              key={idx}
              onClick={() => handleSelect(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: 10,
                cursor: 'pointer',
                transition: 'background 0.15s ease',
                marginBottom: 4
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {getCategoryIcon(item.category)}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#ffffff' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>{item.subtitle}</div>
                </div>
              </div>
              <ExternalLink size={14} color="#64748b" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
