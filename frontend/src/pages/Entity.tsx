import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield, Brain, Activity, Globe, GitBranch, FileText,
  ArrowLeft, Clock, Hash, DollarSign, MapPin, Layers, Tag
} from 'lucide-react';
import { GlassPanel, SectionHeader, ScoreRing, RiskBadge, IntelligenceTag, EvidenceCard, TimelineItem, Breadcrumb, LoadingState, ErrorState, ProgressBar } from '../components/ui';
import { entityService } from '../services';
import type { Entity, EntityEvidence, EntityFinding, EntityTimelineEntry } from '../types';

export default function EntityInvestigation() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [evidence, setEvidence] = useState<EntityEvidence[]>([]);
  const [findings, setFindings] = useState<EntityFinding[]>([]);
  const [timeline, setTimeline] = useState<EntityTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      entityService.getById(id),
      entityService.getEvidence(id),
      entityService.getFindings(id),
      entityService.getTimeline(id),
    ]).then(([e, ev, f, t]) => {
      setEntity(e);
      setEvidence(ev);
      setFindings(f);
      setTimeline(t);
      setLoading(false);
    }).catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <LoadingState message="Loading entity intelligence..." />;
  if (error || !entity) return <ErrorState message={error || 'Entity not found'} onRetry={() => navigate('/leads')} />;

  // Calculate evidence coverage from real backend data
  const evidenceCoverage = evidence.reduce((acc, e) => {
    acc[e.channel] = Math.round(e.score * 100);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: 'Investigation', href: '/leads' },
        { label: 'Leads', href: '/leads' },
        { label: `Entity ${entity.id}` },
      ]} />

      {/* Entity Header */}
      <GlassPanel elevated className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-cyan-500/20">
              <Shield size={24} className="text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Entity Investigation</h1>
                <RiskBadge priority={entity.priority} />
                <IntelligenceTag label={entity.type} color="cyan" />
              </div>
              <p className="text-sm font-mono text-cyan-400 mb-3">{entity.address}</p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-[var(--color-text-muted)]" />
                  <span className="text-[10px] text-[var(--color-text-muted)]">First seen: {new Date(entity.first_seen).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-[var(--color-text-muted)]" />
                  <span className="text-[10px] text-[var(--color-text-muted)]">Last activity: {new Date(entity.last_seen).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers size={12} className="text-[var(--color-text-muted)]" />
                  <span className="text-[10px] text-[var(--color-text-muted)]">Cluster: C-{entity.cluster_id}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ScoreRing score={entity.anomaly_score} size={64} strokeWidth={4} />
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">ML Anomaly</p>
              <p className="text-lg font-bold tabular-nums text-[var(--color-text-primary)]">{(entity.anomaly_score * 100).toFixed(1)}</p>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Evidence Summary */}
      <div className="grid grid-cols-3 gap-4">
        <GlassPanel className="p-5 col-span-2">
          <SectionHeader title="Evidence Summary" subtitle="Multi-channel intelligence coverage" icon={Brain} />
          <div className="grid grid-cols-5 gap-3 mb-6">
            {Object.entries(evidenceCoverage).map(([channel, score]) => (
              <div key={channel} className="text-center">
                <ScoreRing score={score / 100} size={44} strokeWidth={3} />
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1 capitalize">{channel}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-secondary)]">Overall Evidence Coverage</span>
              <span className="text-xs font-mono text-cyan-400">{Math.round(Object.values(evidenceCoverage).reduce((a, b) => a + b, 0) / Object.values(evidenceCoverage).length)}%</span>
            </div>
            <ProgressBar value={Object.values(evidenceCoverage).reduce((a, b) => a + b, 0) / Object.values(evidenceCoverage).length} color="cyan" />
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {Object.entries(evidenceCoverage).map(([channel]) => (
              <EvidenceCard key={channel} channel={channel} />
            ))}
          </div>
        </GlassPanel>

        {/* Entity Metadata */}
        <GlassPanel className="p-5">
          <SectionHeader title="Entity Metadata" icon={Hash} />
          <div className="space-y-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Transaction Count</p>
              <p className="text-xl font-bold tabular-nums text-[var(--color-text-primary)]">{entity.tx_count.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Total Volume</p>
              <p className="text-xl font-bold tabular-nums text-[var(--color-text-primary)]">{entity.total_volume.toFixed(2)} <span className="text-xs text-[var(--color-text-muted)]">BTC</span></p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Countries</p>
              <div className="flex flex-wrap gap-1">
                {entity.countries?.map(c => <IntelligenceTag key={c} label={c} color="amber" />)}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Tags</p>
              <div className="flex flex-wrap gap-1">
                {entity.tags?.map(t => <IntelligenceTag key={t} label={t.replace('_', ' ')} color="violet" />)}
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Network Signals */}
      <GlassPanel className="p-5">
        <SectionHeader title="Network Signals" subtitle="Observed IP addresses and geographic data" icon={Globe} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Observed IPs</p>
            <div className="space-y-1.5">
              {entity.observed_ips?.slice(0, 5).map(ip => (
                <div key={ip} className="flex items-center gap-2 px-3 py-1.5 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]">
                  <Globe size={10} className="text-[var(--color-text-muted)]" />
                  <span className="text-xs font-mono text-[var(--color-text-secondary)]">{ip}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Geographic Distribution</p>
            <div className="flex flex-wrap gap-2">
              {entity.countries?.map(c => (
                <div key={c} className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]">
                  <MapPin size={10} className="text-amber-400" />
                  <span className="text-xs text-[var(--color-text-secondary)]">{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Transaction Timeline */}
      <GlassPanel className="p-5">
        <SectionHeader title="Transaction Timeline" subtitle="Recent activity with related entities" icon={Activity} />
        <div className="mt-4">
          {timeline.map((tx, i) => (
            <TimelineItem
              key={i}
              timestamp={new Date(tx.timestamp).toLocaleString()}
              title={`${tx.direction === 'in' ? '← Received' : '→ Sent'} ${tx.amount} BTC`}
              description={`TX: ${tx.txid} | Fee: ${tx.fee} BTC | Related: ${tx.related_entity}`}
              icon={tx.direction === 'in' ? Activity : GitBranch}
              color={tx.direction === 'in' ? 'green' : 'cyan'}
            />
          ))}
        </div>
      </GlassPanel>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/leads')} className="flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-border-active)] transition-all">
          <ArrowLeft size={12} /> Back to Leads
        </button>
        <button onClick={() => navigate('/graph')} className="flex items-center gap-2 px-4 py-2 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-400 hover:bg-cyan-500/20 transition-all">
          <GitBranch size={12} /> Open in Graph
        </button>
      </div>
    </div>
  );
}
