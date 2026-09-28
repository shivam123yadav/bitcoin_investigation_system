import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Wallet, Globe, MapPin, TrendingUp, ArrowUpRight } from 'lucide-react';
import { GlassPanel, SectionHeader, ScoreRing, IntelligenceTag, LoadingState, MiniMetric } from '../components/ui';
import { clusterService } from '../services';
import type { Cluster } from '../types';

export default function Clusters() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    clusterService.getAll().then(data => { setClusters(data); setLoading(false); });
  }, []);

  if (loading) return <LoadingState message="Loading behavioral clusters..." />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">Behavioral Clusters</h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">Entity groupings based on transactional and network behavior patterns</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <GlassPanel className="p-4">
          <MiniMetric label="Total Clusters" value={clusters.length} />
        </GlassPanel>
        <GlassPanel className="p-4">
          <MiniMetric
            label="Clustered Wallets"
            value={clusters.reduce((s, c) => s + c.wallet_count, 0)}
          />
        </GlassPanel>

        <GlassPanel className="p-4">
          <MiniMetric
            label="Unique IPs"
            value={
              new Set(
                clusters.flatMap(c => c.ips)
              ).size
            }
          />
        </GlassPanel>
        <GlassPanel className="p-4">
          <MiniMetric label="Avg Anomaly" value={(clusters.reduce((s, c) => s + c.avg_anomaly, 0) / clusters.length).toFixed(2)} />
        </GlassPanel>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Cluster Cards */}
        <div className="col-span-2 space-y-3">
          {clusters.map(cluster => (
            <GlassPanel
              key={cluster.id}
              className={`p-4 cursor-pointer transition-all hover:glow-cyan ${selectedCluster?.id === cluster.id ? 'border-cyan-500/30 glow-cyan' : ''}`}
              onClick={() => setSelectedCluster(cluster)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Brain size={18} className="text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{cluster.name}</h3>
                    <p className="text-[10px] text-[var(--color-text-muted)]">Cluster ID: {cluster.id}</p>
                  </div>
                </div>
                <ScoreRing score={cluster.avg_anomaly} size={40} strokeWidth={3} />
              </div>

              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="flex items-center gap-1.5">
                  <Wallet size={11} className="text-cyan-400" />
                  <span className="text-[10px] text-[var(--color-text-secondary)]">{cluster.wallet_count} wallets</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe size={11} className="text-amber-400" />
                  <span className="text-[10px] text-[var(--color-text-secondary)]">{cluster.ip_count} IPs</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin size={11} className="text-green-400" />
                  <span className="text-[10px] text-[var(--color-text-secondary)]">{cluster.countries.join(', ')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={11} className="text-violet-400" />
                  <span className="text-[10px] text-[var(--color-text-secondary)]">{cluster.total_volume.toFixed(1)} BTC</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {cluster.behavioral_tags.map(tag => (
                  <IntelligenceTag key={tag} label={tag.replace(/_/g, ' ')} color="violet" />
                ))}
              </div>
            </GlassPanel>
          ))}
        </div>

        {/* Cluster Detail */}
        <div className="col-span-1">
          {selectedCluster ? (
            <div className="space-y-4 sticky top-4">
              <GlassPanel elevated className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{selectedCluster.name}</h3>
                  <ScoreRing score={selectedCluster.avg_anomaly} size={48} strokeWidth={3} />
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Member Wallets</p>
                    <div className="space-y-1">
                      {selectedCluster.wallets.slice(0, 5).map(w => (
                        <div key={w} className="flex items-center gap-2 px-2 py-1 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]">
                          <Wallet size={10} className="text-cyan-400" />
                          <span className="text-[10px] font-mono text-[var(--color-text-secondary)] truncate">{w}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Associated IPs</p>
                    <div className="space-y-1">
                      {selectedCluster.ips.map(ip => (
                        <div key={ip} className="flex items-center gap-2 px-2 py-1 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]">
                          <Globe size={10} className="text-amber-400" />
                          <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">{ip}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Countries</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedCluster.countries.map(c => (
                        <IntelligenceTag key={c} label={c} color="amber" />
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Behavioral Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedCluster.behavioral_tags.map(tag => (
                        <IntelligenceTag key={tag} label={tag.replace(/_/g, ' ')} color="violet" />
                      ))}
                    </div>
                  </div>
                </div>

                <button onClick={() => navigate('/graph')} className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-400 hover:bg-cyan-500/20 transition-all">
                  <ArrowUpRight size={12} /> View in Graph
                </button>
              </GlassPanel>
            </div>
          ) : (
            <GlassPanel className="p-5">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Brain size={24} className="text-[var(--color-text-muted)] mb-2" />
                <p className="text-xs text-[var(--color-text-muted)]">Select a cluster</p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Click a cluster card to view details</p>
              </div>
            </GlassPanel>
          )}
        </div>
      </div>
    </div>
  );
}
