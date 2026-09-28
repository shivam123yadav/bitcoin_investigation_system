import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, ZoomIn, ZoomOut, Maximize2, RotateCcw, Filter,
  Info, Wallet, ArrowRightLeft, Globe, Brain, X
} from 'lucide-react';
import { GlassPanel, ScoreRing, RiskBadge, IntelligenceTag, CommandButton, LoadingState } from '../components/ui';
import { graphService } from '../services';
import type { GraphData, GraphNode } from '../types';

const NODE_COLORS: Record<string, { fill: string; stroke: string }> = {
  wallet: { fill: '#0e7490', stroke: '#22d3ee' },
  transaction: { fill: '#6d28d9', stroke: '#a78bfa' },
  ip: { fill: '#b45309', stroke: '#fbbf24' },
  cluster: { fill: '#be123c', stroke: '#fb7185' },
};

export default function GraphInvestigation() {
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    graphService.getData().then(d => { setData(d); setLoading(false); });
  }, []);

  // Layout nodes in a force-directed-like arrangement
  const layoutNodes = useMemo(() => {
    if (!data) return [];
    const width = 900;
    const height = 600;
    const cx = width / 2;
    const cy = height / 2;
    return data.nodes.map((node, i) => {
      const angle = (i / data.nodes.length) * Math.PI * 2;
      const radius = node.type === 'cluster' ? 0 : node.type === 'wallet' ? 180 : node.type === 'transaction' ? 120 : 250;
      // Deterministic jitter based on node index
      const jitterX = ((i * 7919) % 40) - 20;
      const jitterY = ((i * 104729) % 40) - 20;
      return {
        ...node,
        x: cx + Math.cos(angle) * radius + jitterX,
        y: cy + Math.sin(angle) * radius + jitterY,
      };
    });
  }, [data]);

  const filteredNodes = useMemo(() => {
    let nodes = layoutNodes;
    if (filter !== 'all') nodes = nodes.filter(n => n.type === filter);
    if (searchTerm) nodes = nodes.filter(n => n.label.toLowerCase().includes(searchTerm.toLowerCase()));
    return nodes;
  }, [layoutNodes, filter, searchTerm]);

  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = useMemo(() => {
    if (!data) return [];
    return data.edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  }, [data, filteredNodeIds]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const stats = useMemo(() => {
    if (!data) return {};
    return {
      nodes: data.nodes.length,
      edges: data.edges.length,
      wallets: data.nodes.filter(n => n.type === 'wallet').length,
      transactions: data.nodes.filter(n => n.type === 'transaction').length,
      ips: data.nodes.filter(n => n.type === 'ip').length,
      clusters: new Set(
        data.nodes
          .filter(n => n.type === 'wallet' && 'clusterId' in n && n.clusterId)
          .map(n => 'clusterId' in n ? n.clusterId : undefined)
      ).size,
    };
  }, [data]);

  if (loading) return <LoadingState message="Loading graph data..." />;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">Graph Investigation</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Link analysis workspace — explore entity relationships</p>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          {Object.entries(stats).map(([key, val]) => (
            <div key={key} className="px-2 py-1 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]">
              <span className="text-[var(--color-text-muted)] capitalize">{key}: </span>
              <span className="font-mono text-[var(--color-text-primary)]">{val}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4" style={{ height: 'calc(100vh - 200px)' }}>
        {/* Graph Workspace */}
        <div className="col-span-3 relative">
          <GlassPanel className="h-full overflow-hidden">
            {/* Toolbar */}
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                  <input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search nodes..."
                    className="pl-8 pr-3 py-1.5 rounded-md bg-[var(--color-bg-primary)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-active)] w-48"
                  />
                </div>
                <div className="flex items-center gap-1 bg-[var(--color-bg-primary)] border border-[var(--color-border-subtle)] rounded-md p-0.5">
                  {['all', 'wallet', 'transaction', 'ip', 'cluster'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${filter === f ? 'bg-cyan-500/20 text-cyan-400' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}`}
                    >
                      {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <CommandButton size="sm" onClick={() => setZoom(z => Math.min(z + 0.2, 2))}><ZoomIn size={12} /></CommandButton>
                <CommandButton size="sm" onClick={() => setZoom(z => Math.max(z - 0.2, 0.4))}><ZoomOut size={12} /></CommandButton>
                <CommandButton size="sm" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><Maximize2 size={12} /></CommandButton>
                <CommandButton size="sm" onClick={() => { setSelectedNode(null); setFilter('all'); setSearchTerm(''); }}><RotateCcw size={12} /></CommandButton>
              </div>
            </div>

            {/* SVG Graph */}
            <svg
              className="w-full h-full cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <g transform={`translate(${pan.x + 450}, ${pan.y + 300}) scale(${zoom}) translate(-450, -300)`}>
                {/* Edges */}
                {filteredEdges.map((edge, i) => {
                  const source = filteredNodes.find(n => n.id === edge.source);
                  const target = filteredNodes.find(n => n.id === edge.target);
                  if (!source || !target) return null;
                  const isSelected = selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id);
                  return (
                    <line
                      key={i}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={isSelected ? '#38bdf8' : 'rgba(56,189,248,0.15)'}
                      strokeWidth={isSelected ? 2 : 1}
                      strokeDasharray={edge.type === 'observed_at' ? '4,4' : undefined}
                    />
                  );
                })}
                {/* Nodes */}
                {filteredNodes.map(node => {
                  const colors = NODE_COLORS[node.type] || NODE_COLORS.wallet;
                  const isSelected = selectedNode?.id === node.id;
                  const isConnected = selectedNode && filteredEdges.some(e =>
                    (e.source === selectedNode.id && e.target === node.id) ||
                    (e.target === selectedNode.id && e.source === node.id)
                  );
                  const size = node.type === 'cluster' ? 20 : node.type === 'wallet' ? 14 : 10;
                  return (
                    <g
                      key={node.id}
                      className="graph-node"
                      onClick={(e) => { e.stopPropagation(); setSelectedNode(node); }}
                      style={{ cursor: 'pointer' }}
                    >
                      {isSelected && (
                        <circle cx={node.x} cy={node.y} r={size + 8} fill="none" stroke={colors.stroke} strokeWidth={1} opacity={0.4} strokeDasharray="3,3">
                          <animateTransform attributeName="transform" type="rotate" from={`0 ${node.x} ${node.y}`} to={`360 ${node.x} ${node.y}`} dur="10s" repeatCount="indefinite" />
                        </circle>
                      )}
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={size}
                        fill={colors.fill}
                        stroke={isSelected ? colors.stroke : isConnected ? colors.stroke : 'rgba(255,255,255,0.1)'}
                        strokeWidth={isSelected ? 2.5 : isConnected ? 1.5 : 1}
                        opacity={selectedNode && !isSelected && !isConnected ? 0.4 : 1}
                      />
                      <text
                        x={node.x}
                        y={node.y + size + 14}
                        textAnchor="middle"
                        fill={isSelected ? '#e2e8f0' : '#64748b'}
                        fontSize={9}
                        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                      >
                        {node.label.slice(0, 12)}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 flex items-center gap-3 px-3 py-2 rounded-md bg-[var(--color-bg-primary)]/90 border border-[var(--color-border-subtle)]">
              {Object.entries(NODE_COLORS).map(([type, colors]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: colors.fill, border: `1.5px solid ${colors.stroke}` }} />
                  <span className="text-[9px] text-[var(--color-text-muted)] capitalize">{type}</span>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>

        {/* Right Panel */}
        <div className="col-span-1 overflow-y-auto space-y-4">
          {selectedNode ? (
            <>
              <GlassPanel className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Selected Entity</span>
                  <button onClick={() => setSelectedNode(null)} className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]">
                    <X size={12} className="text-[var(--color-text-muted)]" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: NODE_COLORS[selectedNode.type]?.fill || '#0e7490' }}>
                    {selectedNode.type === 'wallet' && <Wallet size={16} className="text-cyan-300" />}
                    {selectedNode.type === 'transaction' && <ArrowRightLeft size={16} className="text-violet-300" />}
                    {selectedNode.type === 'ip' && <Globe size={16} className="text-amber-300" />}
                    {selectedNode.type === 'cluster' && <Brain size={16} className="text-rose-300" />}
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--color-text-primary)]">{selectedNode.label}</p>
                    <IntelligenceTag label={selectedNode.type} color={selectedNode.type === 'wallet' ? 'cyan' : selectedNode.type === 'transaction' ? 'violet' : selectedNode.type === 'ip' ? 'amber' : 'red'} />
                  </div>
                </div>
                {selectedNode.anomaly_score !== undefined && (
                  <div className="flex items-center justify-between py-2 border-t border-[var(--color-border-subtle)]">
                    <span className="text-[10px] text-[var(--color-text-muted)]">Anomaly Score</span>
                    <ScoreRing score={selectedNode.anomaly_score} size={32} strokeWidth={2.5} />
                  </div>
                )}
              </GlassPanel>

              <GlassPanel className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-3">Connections</p>
                <div className="space-y-2">
                  {filteredEdges
                    .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map((edge, i) => {
                      const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                      const otherNode = filteredNodes.find(n => n.id === otherId);
                      if (!otherNode) return null;
                      return (
                        <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] cursor-pointer hover:border-[var(--color-border-active)]" onClick={() => setSelectedNode(otherNode)}>
                          <div className="w-2 h-2 rounded-full" style={{ background: NODE_COLORS[otherNode.type]?.stroke }} />
                          <span className="text-[10px] font-mono text-[var(--color-text-secondary)] truncate flex-1">{otherNode.label}</span>
                          <span className="text-[9px] text-[var(--color-text-muted)]">{edge.type}</span>
                        </div>
                      );
                    })}
                </div>
              </GlassPanel>
            </>
          ) : (
            <GlassPanel className="p-4">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Info size={20} className="text-[var(--color-text-muted)] mb-2" />
                <p className="text-xs text-[var(--color-text-muted)]">Select a node to inspect</p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Click any entity in the graph</p>
              </div>
            </GlassPanel>
          )}

          {/* Graph Stats */}
          <GlassPanel className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold mb-3">Graph Statistics</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(stats).map(([key, val]) => (
                <div key={key} className="px-2 py-1.5 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]">
                  <p className="text-[9px] text-[var(--color-text-muted)] capitalize">{key}</p>
                  <p className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">{val}</p>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
