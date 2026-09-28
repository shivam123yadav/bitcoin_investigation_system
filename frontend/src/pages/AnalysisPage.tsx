import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Zap, Brain, AlertTriangle, Play, RotateCw, ArrowUpRight } from 'lucide-react';
import { GlassPanel, SectionHeader, ScoreRing, ProgressBar, LoadingState, ErrorState, CommandButton } from '../components/ui';
import { dashboardService, systemService, analysisService } from '../services';
import type { DashboardStats, SystemStatus, InvestigationLead, AnalysisStatus, DashboardTimeline } from '../types';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

type FlexibleAnalysisPayload = {
  status: string;
  run_id?: string;
  dataset_id: string;
  filename?: string;
  format?: string;
  analysis_mode?: string;
  record_count?: number;
  started_at?: string;
  completed_at?: string;
  result?: {
    entity_count?: number;
    anomaly_count?: number;
    entities?: Array<Record<string, unknown>>;
    graph?: { nodes?: number; edges?: number };
    network?: {
      entity_count?: number;
      anomaly_count?: number;
      entities?: Array<Record<string, unknown>>;
    };
    correlation?: {
      transactions_with_network_and_blockchain?: number;
      unique_txids?: number;
      unique_ips?: number;
    };
    message?: string;
  };
};

export default function AnalysisMonitor() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisStatus | null>(null);
  const [timeline, setTimeline] = useState<DashboardTimeline[]>([]);
  const [leads, setLeads] = useState<InvestigationLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [flexible, setFlexible] = useState<FlexibleAnalysisPayload | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const activeFlexibleId = localStorage.getItem('activeFlexibleDatasetId');
    if (activeFlexibleId) {
      try {
        const result = await analysisService.getFlexibleAnalysis(activeFlexibleId);
        setFlexible(result as FlexibleAnalysisPayload);
        setLoading(false);
        return;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load flexible dataset analysis.');
        setLoading(false);
        return;
      }
    }

    try {
      const [s, st, a, tl, l] = await Promise.all([
        dashboardService.getStats(),
        systemService.getStatus(),
        analysisService.getStatus(),
        dashboardService.getTimeline(),
        dashboardService.getTopLeads(6),
      ]);
      setFlexible(null);
      setStats(s);
      setStatus(st);
      setAnalysis(a);
      setTimeline(tl);
      setLeads(l);
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load analysis data.');
      setLoading(false);
    }
  };
  useEffect(() => { loadData(); }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  const handleRunAnalysis = async () => {
    const activeFlexibleId = localStorage.getItem('activeFlexibleDatasetId');

    if (activeFlexibleId) {
      setRunning(true);
      setError(null);
      try {
        await analysisService.trigger(activeFlexibleId);
        const result = await analysisService.getFlexibleAnalysis(activeFlexibleId);
        setFlexible(result as FlexibleAnalysisPayload);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to run uploaded dataset analysis');
      } finally {
        setRunning(false);
      }
      return;
    }

    setRunning(true);
    try {
      await analysisService.trigger();
      pollRef.current = setInterval(async () => {
        try {
          const a = await analysisService.getStatus();
          setAnalysis(a);
          if (a.status === 'completed' || a.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setRunning(false);
            loadData();
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setRunning(false);
        }
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start analysis');
      setRunning(false);
    }
  };

  const clearFlexibleDataset = () => {
    localStorage.removeItem('activeFlexibleDatasetId');
    localStorage.removeItem('activeFlexibleAnalysisRunId');
    window.location.reload();
  };
  if (loading) return <LoadingState message="Loading analysis data..." />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  if (flexible) {
    const result = flexible.result ?? {};
    const entities = Array.isArray(result.entities) ? result.entities : [];
    const network = result.network;
    const correlation = result.correlation;
    const modeLabel = (flexible.analysis_mode ?? 'generic_metadata').replace(/_/g, ' ').toUpperCase();

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <Brain size={20} className="text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">Uploaded Dataset Analysis</h1>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                {flexible.filename ?? flexible.dataset_id} · {modeLabel}
                {flexible.completed_at && <span className="ml-2 text-cyan-400">• {new Date(flexible.completed_at).toLocaleString()}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CommandButton onClick={clearFlexibleDataset}>Use SIH Dataset</CommandButton>
            <CommandButton variant="primary" onClick={handleRunAnalysis} disabled={running}>
              <Play size={12} /> {running ? 'Running...' : 'Run Analysis'}
            </CommandButton>
          </div>
        </div>

        <GlassPanel className="p-4 border-cyan-500/20">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <span><span className="text-[var(--color-text-muted)]">Dataset ID:</span> <span className="font-mono text-[var(--color-text-primary)]">{flexible.dataset_id}</span></span>
            <span><span className="text-[var(--color-text-muted)]">Records:</span> <span className="text-[var(--color-text-primary)]">{(flexible.record_count ?? 0).toLocaleString()}</span></span>
            <span><span className="text-[var(--color-text-muted)]">Format:</span> <span className="text-[var(--color-text-primary)]">{flexible.format ?? 'unknown'}</span></span>
            <span className="text-green-400">Analysis completed</span>
          </div>
        </GlassPanel>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <GlassPanel className="p-4"><p className="text-[10px] uppercase text-[var(--color-text-muted)]">Entities</p><p className="text-2xl font-bold mt-1">{(result.entity_count ?? 0).toLocaleString()}</p></GlassPanel>
          <GlassPanel className="p-4"><p className="text-[10px] uppercase text-[var(--color-text-muted)]">Anomalies</p><p className="text-2xl font-bold mt-1 text-amber-400">{(result.anomaly_count ?? 0).toLocaleString()}</p></GlassPanel>
          <GlassPanel className="p-4"><p className="text-[10px] uppercase text-[var(--color-text-muted)]">Graph Edges</p><p className="text-2xl font-bold mt-1">{(result.graph?.edges ?? 0).toLocaleString()}</p></GlassPanel>
          <GlassPanel className="p-4"><p className="text-[10px] uppercase text-[var(--color-text-muted)]">Network Anomalies</p><p className="text-2xl font-bold mt-1 text-cyan-400">{(network?.anomaly_count ?? 0).toLocaleString()}</p></GlassPanel>
        </div>

        {correlation && (
          <GlassPanel className="p-5">
            <SectionHeader title="Network ↔ Blockchain Correlation" subtitle="Relationships observed in the uploaded dataset" icon={Zap} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div><p className="text-[10px] text-[var(--color-text-muted)]">TXs with network + blockchain data</p><p className="text-lg font-semibold mt-1">{(correlation.transactions_with_network_and_blockchain ?? 0).toLocaleString()}</p></div>
              <div><p className="text-[10px] text-[var(--color-text-muted)]">Unique TXIDs</p><p className="text-lg font-semibold mt-1">{(correlation.unique_txids ?? 0).toLocaleString()}</p></div>
              <div><p className="text-[10px] text-[var(--color-text-muted)]">Unique IPs</p><p className="text-lg font-semibold mt-1">{(correlation.unique_ips ?? 0).toLocaleString()}</p></div>
            </div>
          </GlassPanel>
        )}

        <GlassPanel className="p-5">
          <SectionHeader title="Top Investigative Entities" subtitle="Entities ranked by the uploaded dataset's Isolation Forest anomaly score" icon={AlertTriangle} />
          <div className="space-y-2 mt-4">
            {entities.slice(0, 10).map((entity, index) => {
              const id = String(entity.entity_id ?? entity.id ?? `entity-${index + 1}`);
              const score = Number(entity.anomaly_score ?? 0);
              return (
                <div key={`${id}-${index}`} className="flex items-center gap-4 p-3 rounded-lg bg-[var(--color-bg-tertiary)]/50 border border-[var(--color-border-subtle)]">
                  <span className="w-6 text-xs text-[var(--color-text-muted)]">#{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-[var(--color-text-primary)] truncate">{id}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">Transactions: {Number(entity.transaction_count ?? 0).toLocaleString()} · Volume: {Number(entity.total_volume ?? 0).toLocaleString()}</p>
                  </div>
                  <ScoreRing score={score * 100} size={34} strokeWidth={2.5} />
                </div>
              );
            })}
            {!entities.length && <p className="text-xs text-[var(--color-text-muted)]">No entity-level results were produced for this schema.</p>}
          </div>
        </GlassPanel>

        {result.message && <GlassPanel className="p-4 text-xs text-[var(--color-text-muted)]">{result.message}</GlassPanel>}
      </div>
    );
  }

  const chartData = timeline.map(t => ({
    hour: new Date(t.timestamp).getHours() + ':00',
    observations: t.observations,
    anomalies: t.anomalies,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <Brain size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">Analysis Monitor</h1>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              Offline analysis pipeline — review completed results and stages
              {analysis?.status === 'completed' && analysis.completed_at && (
                <span className="ml-2 text-cyan-400">• Last run: {new Date(analysis.completed_at).toLocaleString()}</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {analysis?.status === 'running' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
              <RotateCw size={12} className="text-cyan-400 animate-spin" />
              <span className="text-xs text-cyan-400 font-medium">Running</span>
            </div>
          )}
          {analysis?.status === 'completed' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/20">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-xs text-green-400 font-medium">Complete</span>
            </div>
          )}
          {analysis?.status === 'not_run' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-xs text-amber-400 font-medium">Not Run</span>
            </div>
          )}
          <CommandButton variant="primary" onClick={handleRunAnalysis} disabled={running}>
            <Play size={12} /> {running ? 'Running...' : 'Run Analysis'}
          </CommandButton>
          <CommandButton onClick={loadData}>
            <RotateCw size={12} /> Refresh
          </CommandButton>
        </div>
      </div>

      {/* Analysis Status */}
      {analysis?.status === 'failed' && (
        <GlassPanel className="p-4 border-red-500/30">
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} className="text-red-400" />
            <div>
              <p className="text-xs font-medium text-red-400">Analysis Failed</p>
              <p className="text-[10px] text-[var(--color-text-muted)]">{analysis.error || 'Unknown error occurred during analysis.'}</p>
            </div>
          </div>
        </GlassPanel>
      )}

      {/* Pipeline Stages */}
      {analysis?.stages && (
        <GlassPanel className="p-5">
          <SectionHeader title="Pipeline Stages" subtitle="Analysis processing stages and results" icon={Activity} />
          <div className="space-y-3 mt-4">
            {analysis.stages.map((stage, i) => (
              <div key={stage.id} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                  stage.status === 'complete' ? 'bg-green-500/10 border-green-500/30' :
                  stage.status === 'running' ? 'bg-cyan-500/10 border-cyan-500/30' :
                  stage.status === 'error' ? 'bg-red-500/10 border-red-500/30' :
                  'bg-[var(--color-bg-tertiary)] border-[var(--color-border-subtle)]'
                }`}>
                  {stage.status === 'complete' && <span className="text-green-400 text-xs font-bold">✓</span>}
                  {stage.status === 'running' && <RotateCw size={12} className="text-cyan-400 animate-spin" />}
                  {stage.status === 'error' && <span className="text-red-400 text-xs font-bold">✗</span>}
                  {stage.status === 'pending' && <span className="text-[var(--color-text-muted)] text-xs">{i + 1}</span>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--color-text-primary)]">{stage.name}</span>
                    {stage.metrics && (
                      <div className="flex items-center gap-2">
                        {Object.entries(stage.metrics).slice(0, 3).map(([k, v]) => (
                          <span key={k} className="text-[10px] font-mono text-[var(--color-text-muted)]">
                            {k.replace(/_/g, ' ')}: <span className="text-[var(--color-text-secondary)]">{typeof v === 'number' ? v.toLocaleString() : v}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ProgressBar value={stage.progress} color={stage.status === 'complete' ? 'green' : stage.status === 'running' ? 'cyan' : 'cyan'} />
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {/* Activity Chart */}
      <GlassPanel className="p-5">
        <SectionHeader title="Observation Timeline" subtitle="Observation and anomaly volume over analysis period" icon={Activity} />
        <div className="h-48 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="replayGrad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="replayGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} interval={3} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} width={35} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '6px', fontSize: '11px' }} />
              <Area type="monotone" dataKey="observations" stroke="#38bdf8" fill="url(#replayGrad1)" strokeWidth={1.5} name="Observations" />
              <Area type="monotone" dataKey="anomalies" stroke="#f59e0b" fill="url(#replayGrad2)" strokeWidth={1.5} name="Anomalies" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GlassPanel>

      {/* Recent Leads */}
      <GlassPanel className="p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="Recent Investigation Leads" subtitle="Latest entities flagged for analyst review" icon={AlertTriangle} />
          <button onClick={() => navigate('/leads')} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
            View All <ArrowUpRight size={12} />
          </button>
        </div>
        <div className="space-y-2">
          {leads.slice(0, 6).map(lead => (
            <div key={lead.id} className="flex items-center gap-4 p-3 rounded-lg bg-[var(--color-bg-tertiary)]/50 border border-[var(--color-border-subtle)] cursor-pointer hover:border-[var(--color-border-active)] transition-all" onClick={() => navigate(`/entity/${lead.entity_id}`)}>
              <ScoreRing score={lead.anomaly_score} size={32} strokeWidth={2.5} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-[var(--color-text-primary)] truncate">{lead.entity_address.slice(0, 20)}...</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {lead.evidence_channels.slice(0, 3).map(ch => (
                    <span key={ch} className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-bg-primary)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)] uppercase">{ch}</span>
                  ))}
                </div>
              </div>
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                lead.priority === 'high' ? 'text-red-400 bg-red-500/10 border-red-500/30' :
                lead.priority === 'medium' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                'text-green-400 bg-green-500/10 border-green-500/30'
              }`}>{lead.priority}</span>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
