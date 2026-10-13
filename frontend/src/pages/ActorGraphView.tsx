import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { 
  Network, 
  Search, 
  Filter, 
  Download, 
  Share2, 
  Info, 
  Route, 
  RotateCcw,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { fetchGraph, fetchEgoGraph, findPath } from '../services/api';

interface ActorGraphViewProps {
  initialNodeId?: string;
  onNavigate: (tab: string, targetId?: string) => void;
}

export const ActorGraphView: React.FC<ActorGraphViewProps> = ({ initialNodeId, onNavigate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>('');
  const [minConfidence, setMinConfidence] = useState<number>(75);
  const [pathSource, setPathSource] = useState<string>('');
  const [pathTarget, setPathTarget] = useState<string>('');
  const [pathResult, setPathResult] = useState<any>(null);

  useEffect(() => {
    async function loadGraphData() {
      if (!containerRef.current) return;
      setLoading(true);

      try {
        const data = await fetchGraph(filterType || undefined, minConfidence, 250);

        const cyElements = [
          ...data.nodes.map((n: any) => ({
            data: {
              id: n.id,
              label: n.label,
              type: n.type,
              risk: n.risk_score || 50,
              properties: n.properties || {}
            }
          })),
          ...data.edges.map((e: any) => ({
            data: {
              id: e.id,
              source: e.source,
              target: e.target,
              type: e.type,
              confidence: e.confidence || 80
            }
          }))
        ];

        if (cyRef.current) {
          cyRef.current.destroy();
        }

        const cy = cytoscape({
          container: containerRef.current,
          elements: cyElements,
          style: [
            {
              selector: 'node',
              style: {
                'label': 'data(label)',
                'color': '#ffffff',
                'font-size': '11px',
                'font-family': 'Plus Jakarta Sans, sans-serif',
                'text-valign': 'bottom',
                'text-margin-y': 6,
                'width': 28,
                'height': 28,
                'border-width': 2,
                'border-color': 'rgba(255, 255, 255, 0.4)'
              }
            },
            {
              selector: 'node[type = "ACTOR"]',
              style: { 'background-color': '#a78bfa', 'width': 38, 'height': 38 }
            },
            {
              selector: 'node[type = "HANDLE"]',
              style: { 'background-color': '#38bdf8' }
            },
            {
              selector: 'node[type = "MARKETPLACE"]',
              style: { 'background-color': '#f43f5e', 'width': 44, 'height': 44 }
            },
            {
              selector: 'node[type = "PGP"]',
              style: { 'background-color': '#10b981' }
            },
            {
              selector: 'node[type = "WALLET"]',
              style: { 'background-color': '#f59e0b' }
            },
            {
              selector: 'node[type = "REAL_WORLD"]',
              style: { 'background-color': '#ef4444', 'width': 36, 'height': 36 }
            },
            {
              selector: 'node[type = "CLEARNET_IP"]',
              style: { 'background-color': '#3b82f6', 'width': 34, 'height': 34 }
            },
            {
              selector: 'node[type = "ONION"]',
              style: { 'background-color': '#c084fc' }
            },
            {
              selector: ':selected',
              style: {
                'border-color': '#ffffff',
                'border-width': 4
              }
            },
            {
              selector: 'edge',
              style: {
                'width': 1.8,
                'line-color': 'rgba(255, 255, 255, 0.15)',
                'curve-style': 'bezier',
                'target-arrow-shape': 'triangle',
                'target-arrow-color': 'rgba(255, 255, 255, 0.25)',
                'arrow-scale': 0.8
              }
            },
            {
              selector: 'edge[type = "OWNS_PGP"], edge[type = "SIGNS_WITH_PGP"]',
              style: { 'line-color': 'rgba(16, 185, 129, 0.45)', 'target-arrow-color': '#10b981' }
            },
            {
              selector: 'edge[type = "ORIGIN_MATCH"]',
              style: { 'line-color': 'rgba(239, 68, 68, 0.7)', 'width': 3, 'target-arrow-color': '#ef4444' }
            },
            {
              selector: 'edge[type = "ATTRIBUTED_TO"]',
              style: { 'line-color': 'rgba(239, 68, 68, 0.65)', 'width': 2.5, 'target-arrow-color': '#ef4444' }
            }
          ],
          layout: {
            name: 'cose',
            animate: false,
            nodeOverlap: 20,
            idealEdgeLength: 60,
            nodeRepulsion: 600000
          }
        });

        cy.on('tap', 'node', (evt) => {
          const node = evt.target;
          setSelectedNode(node.data());
        });

        cy.on('tap', (evt) => {
          if (evt.target === cy) {
            setSelectedNode(null);
          }
        });

        if (initialNodeId) {
          const target = cy.getElementById(initialNodeId);
          if (target && target.length > 0) {
            target.select();
            cy.center(target);
            cy.zoom(1.4);
            setSelectedNode(target.data());
          }
        }

        cyRef.current = cy;
      } catch (err) {
        console.error('Failed to load graph:', err);
      } finally {
        setLoading(false);
      }
    }

    loadGraphData();
  }, [filterType, minConfidence, initialNodeId]);

  const handleEgoExpand = async () => {
    if (!selectedNode || !cyRef.current) return;
    try {
      const egoData = await fetchEgoGraph(selectedNode.id, 2);
      const cy = cyRef.current;
      cy.elements().remove();
      
      const newElements = [
        ...egoData.nodes.map((n: any) => ({
          data: { id: n.id, label: n.label, type: n.type, risk: n.risk_score }
        })),
        ...egoData.edges.map((e: any) => ({
          data: { id: e.id, source: e.source, target: e.target, type: e.type, confidence: e.confidence }
        }))
      ];
      cy.add(newElements);
      cy.layout({ name: 'concentric', animate: true, animationDuration: 400 }).run();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFindPath = async () => {
    if (!pathSource || !pathTarget) return;
    try {
      const res = await findPath(pathSource, pathTarget);
      setPathResult(res);
      if (res.found && cyRef.current) {
        const cy = cyRef.current;
        cy.elements().unselect();
        res.nodes.forEach((n: any) => {
          cy.getElementById(n.id).select();
        });
      }
    } catch (err) {
      setPathResult({ found: false, message: 'No connective path discovered.' });
    }
  };

  const handleExportPNG = () => {
    if (!cyRef.current) return;
    const png64 = cyRef.current.png({ full: true, bg: '#080808' });
    const a = document.createElement('a');
    a.href = png64;
    a.download = 'sellix_trace_graph.png';
    a.click();
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 72px)', position: 'relative', overflow: 'hidden' }}>
      {/* Main Canvas Area */}
      <div style={{ flex: 1, position: 'relative', background: '#080808' }}>
        {/* Floating Controls Bar */}
        <div style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 10,
          display: 'flex',
          gap: 10,
          background: 'rgba(20, 20, 22, 0.85)',
          backdropFilter: 'blur(12px)',
          padding: '8px 12px',
          borderRadius: 9999,
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {/* Filter select */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              background: '#141416',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 6,
              color: '#cbd5e1',
              fontSize: 12,
              padding: '4px 8px',
              outline: 'none'
            }}
          >
            <option value="">All Entities</option>
            <option value="ACTOR">Actors Only</option>
            <option value="HANDLE">Handles Only</option>
            <option value="MARKETPLACE">Markets</option>
            <option value="CLEARNET_IP">Origin IPs</option>
            <option value="REAL_WORLD">Real-World</option>
          </select>

          {/* Confidence Slider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8' }}>
            <span>Min Conf:</span>
            <input
              type="range"
              min="50"
              max="95"
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              style={{ width: 70 }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', color: '#a78bfa' }}>{minConfidence}%</span>
          </div>

          {/* Zoom buttons */}
          <button
            onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.25)}
            className="btn-glass"
            style={{ padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)}
            className="btn-glass"
            style={{ padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => cyRef.current?.fit()}
            className="btn-glass"
            style={{ padding: '4px 8px', borderRadius: 6, cursor: 'pointer' }}
          >
            <RotateCcw size={14} />
          </button>

          {/* Export PNG */}
          <button
            onClick={handleExportPNG}
            className="btn-glass"
            style={{ padding: '4px 8px', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Download size={13} />
            <span style={{ fontSize: 11 }}>PNG</span>
          </button>
        </div>

        {/* Legend */}
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 16,
          zIndex: 10,
          background: 'rgba(20, 20, 22, 0.85)',
          backdropFilter: 'blur(12px)',
          padding: '10px 14px',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          gap: 14,
          fontSize: 11
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#a78bfa' }}></span>
            <span>Actor</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#38bdf8' }}></span>
            <span>Handle</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }}></span>
            <span>PGP</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }}></span>
            <span>Wallet</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }}></span>
            <span>Real-World</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }}></span>
            <span>Origin IP</span>
          </div>
        </div>

        {/* Cytoscape Container */}
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Right Sidebar: Entity Inspector & Shortest Pathfinder */}
      <div style={{
        width: 360,
        background: '#0e0f11',
        borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        padding: 24
      }}>
        {selectedNode ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <span className="badge badge-medium" style={{ fontSize: 10, marginBottom: 6 }}>
                  {selectedNode.type}
                </span>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', wordBreak: 'break-all' }}>
                  {selectedNode.label}
                </h3>
              </div>
              <span className="badge badge-critical">
                RISK {selectedNode.risk || 50}
              </span>
            </div>

            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 18, fontFamily: 'var(--font-mono)' }}>
              Entity ID: {selectedNode.id}
            </div>

            {/* Actions on Node */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button
                onClick={handleEgoExpand}
                className="btn-pill btn-white"
                style={{ flex: 1, padding: '7px 10px', fontSize: 12 }}
              >
                Expand 2-Hop Ego
              </button>
              {selectedNode.type === 'ACTOR' && (
                <button
                  onClick={() => onNavigate('actors', selectedNode.id)}
                  className="btn-pill btn-glass"
                  style={{ flex: 1, padding: '7px 10px', fontSize: 12 }}
                >
                  Full Dossier
                </button>
              )}
            </div>

            {/* Properties */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 8 }}>
                ATTRIBUTES &amp; METADATA
              </h4>
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 8,
                padding: 12,
                fontSize: 12,
                color: '#cbd5e1',
                lineHeight: 1.6
              }}>
                {Object.entries(selectedNode.properties || {}).map(([k, v]: any) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '4px 0' }}>
                    <span style={{ color: '#94a3b8' }}>{k}:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#fff' }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: '#64748b', fontSize: 13, marginBottom: 24, textAlign: 'center', padding: 20 }}>
            Click any node on the graph to inspect metadata and expand its neighborhood.
          </div>
        )}

        {/* Shortest Pathfinder Section */}
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: 20,
          marginTop: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Route size={16} color="#a78bfa" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Investigative Path Finder</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            <input
              type="text"
              placeholder="Source Entity ID (e.g. hs_shadowgate)"
              value={pathSource}
              onChange={(e) => setPathSource(e.target.value)}
              style={{
                background: '#141416',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 6,
                padding: '6px 10px',
                color: '#fff',
                fontSize: 12
              }}
            />
            <input
              type="text"
              placeholder="Target Entity ID (e.g. host_fr_ovh)"
              value={pathTarget}
              onChange={(e) => setPathTarget(e.target.value)}
              style={{
                background: '#141416',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 6,
                padding: '6px 10px',
                color: '#fff',
                fontSize: 12
              }}
            />
            <button
              onClick={handleFindPath}
              className="btn-pill btn-violet"
              style={{ padding: '7px 12px', fontSize: 12, marginTop: 4 }}
            >
              Trace Connection Path
            </button>
          </div>

          {pathResult && (
            <div style={{
              padding: 10,
              borderRadius: 8,
              background: pathResult.found ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: pathResult.found ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: 12,
              color: pathResult.found ? '#34d399' : '#f87171'
            }}>
              {pathResult.found ? (
                <div>
                  <strong>Path Discovered ({pathResult.length} hops):</strong>
                  <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                    {pathResult.nodes.map((n: any) => n.label).join(' &rarr; ')}
                  </div>
                </div>
              ) : (
                <span>No link found between these two entities.</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
