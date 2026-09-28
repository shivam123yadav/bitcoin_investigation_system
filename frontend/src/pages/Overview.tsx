import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Activity, Database, Brain, Search, TrendingUp,
  ArrowUpRight, Zap, Globe, GitBranch, AlertTriangle
} from 'lucide-react';
import { GlassPanel, MetricCard, SectionHeader, StatusIndicator, ScoreRing, ProgressBar, InsightCard } from '../components/ui';
import { dashboardService, systemService } from '../services';
import type { DashboardStats, SystemStatus, InvestigationLead, DashboardTimeline } from '../types';
import { AreaChart, Area, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

export default function Overview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [topLeads, setTopLeads] = useState<InvestigationLead[]>([]);
  const [timeline, setTimeline] = useState<DashboardTimeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      dashboardService.getStats(),
      systemService.getStatus(),
      dashboardService.getTopLeads(5),
      dashboardService.getTimeline(),
    ]).then(([s, st, leads, tl]) => {
      setStats(s);
      setStatus(st);
      setTopLeads(leads);
      setTimeline(tl);
      setLoading(false);
    }).catch(err => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  // Use real timeline data from backend
  const activityData = timeline.map(t => ({
    hour: new Date(t.timestamp).getHours() + ':00',
    observations: t.observations,
    anomalies: t.anomalies,
  }));

  const riskDistribution = stats ? [
    { name: 'High', value: stats.high_priority, color: '#ef4444' },
    { name: 'Medium', value: stats.medium_priority, color: '#f59e0b' },
    { name: 'Low', value: stats.low_priority, color: '#10b981' },
  ] : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 skeleton rounded-lg" />
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 skeleton rounded-lg" />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-64 skeleton rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="grid grid-cols-3 gap-4">
        <GlassPanel elevated className="p-6 col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield size={20} className="text-cyan-400" />
                <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-semibold">Bitcoin Network Intelligence</span>
              </div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] tracking-tight">Command Center</h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-2 max-w-lg">
                Correlating network observations, blockchain entities and behavioral signals to surface investigation leads.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <button onClick={() => navigate('/leads')} className="px-4 py-2 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-all flex items-center gap-2">
                  <Search size={12} /> Investigation Queue
                </button>
                <button onClick={() => navigate('/graph')} className="px-4 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] text-xs font-medium hover:border-[var(--color-border-active)] transition-all flex items-center gap-2">
                  <GitBranch size={12} /> Graph Analysis
                </button>
              </div>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel elevated className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-subtle" />
            <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] font-semibold">System Status</span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-secondary)]">Engine</span>
              <StatusIndicator status={status?.engine_online ? 'online' : 'error'} label={status?.engine_online ? 'ONLINE' : 'OFFLINE'} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-secondary)]">Analysis</span>
              <StatusIndicator status={status?.analysis_complete ? 'online' : 'warning'} label={status?.analysis_complete ? 'COMPLETE' : 'PENDING'} />
            </div>
            <div className="h-px bg-[var(--color-border-subtle)] my-2" />
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold tabular-nums text-cyan-400">{status?.total_observations.toLocaleString()}</p>
                <p className="text-[9px] uppercase text-[var(--color-text-muted)]">Observations</p>
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums text-violet-400">{status?.total_entities.toLocaleString()}</p>
                <p className="text-[9px] uppercase text-[var(--color-text-muted)]">Entities</p>
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums text-amber-400">{status?.total_leads}</p>
                <p className="text-[9px] uppercase text-[var(--color-text-muted)]">Leads</p>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        <MetricCard label="Transactions" value={stats?.transactions || 0} icon={Activity} color="cyan" />
        <MetricCard label="Wallets" value={stats?.wallets || 0} icon={Globe} color="blue" />
        <MetricCard label="IP Observations" value={stats?.ip_observations || 0} icon={Database} color="violet" />
        <MetricCard label="Clusters" value={stats?.clusters || 0} icon={Brain} color="amber" />
        <MetricCard label="Investigation Leads" value={stats?.leads || 0} icon={Search} color="green" />
      </div>

      {/* Intelligence Section */}
      <div className="grid grid-cols-3 gap-4">
        {/* Activity Timeline */}
        <GlassPanel className="p-5">
          <SectionHeader title="Transaction Activity" subtitle="24h observation volume" icon={TrendingUp} />
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData}>
                <defs>
                  <linearGradient id="obsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} interval={5} />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '6px', fontSize: '11px' }} />
                <Area type="monotone" dataKey="observations" stroke="#38bdf8" fill="url(#obsGrad)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        {/* Risk Distribution */}
        <GlassPanel className="p-5">
          <SectionHeader title="Priority Distribution" subtitle="Investigation leads by priority" icon={AlertTriangle} />
          <div className="flex items-center justify-center h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" stroke="none">
                  {riskDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '6px', fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {riskDistribution.map(item => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                <span className="text-[10px] text-[var(--color-text-muted)]">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Investigation Readiness */}
        <GlassPanel className="p-5">
          <SectionHeader title="Investigation Readiness" subtitle="System preparedness" icon={Zap} />
          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-secondary)]">Data Ingestion</span>
              <span className="text-xs font-mono text-green-400">100%</span>
            </div>
            <ProgressBar value={100} color="green" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-secondary)]">ML Analysis</span>
              <span className="text-xs font-mono text-green-400">100%</span>
            </div>
            <ProgressBar value={100} color="cyan" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-secondary)]">Pattern Detection</span>
              <span className="text-xs font-mono text-cyan-400">100%</span>
            </div>
            <ProgressBar value={100} color="violet" />
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-secondary)]">Lead Generation</span>
              <span className="text-xs font-mono text-amber-400">100%</span>
            </div>
            <ProgressBar value={100} color="amber" />
            <div className="mt-4 pt-3 border-t border-[var(--color-border-subtle)]">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">Queue Ready</span>
                <span className="text-xs font-bold text-cyan-400">{stats?.leads} leads</span>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Top Leads */}
      <GlassPanel className="p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="Top Investigation Leads" subtitle="Highest priority entities requiring analyst review" icon={Search} />
          <button onClick={() => navigate('/leads')} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
            View All <ArrowUpRight size={12} />
          </button>
        </div>
        <div className="space-y-2">
          {topLeads.map(lead => (
            <div
              key={lead.id}
              onClick={() => navigate(`/entity/${lead.entity_id}`)}
              className="flex items-center gap-4 p-3 rounded-lg bg-[var(--color-bg-tertiary)]/50 border border-[var(--color-border-subtle)] hover:border-[var(--color-border-active)] cursor-pointer transition-all group"
            >
              <span className="text-xs font-mono text-[var(--color-text-muted)] w-6">#{lead.rank}</span>
              <ScoreRing score={lead.anomaly_score} size={36} strokeWidth={2.5} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-[var(--color-text-primary)] truncate group-hover:text-cyan-400 transition-colors">{lead.entity_address}</p>
                <div className="flex items-center gap-2 mt-1">
                  {lead.evidence_channels.map(ch => (
                    <span key={ch} className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-[var(--color-bg-primary)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">{ch}</span>
                  ))}
                </div>
              </div>
              <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                lead.priority === 'high' ? 'text-red-400 bg-red-500/10 border-red-500/30' :
                lead.priority === 'medium' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                'text-green-400 bg-green-500/10 border-green-500/30'
              }`}>{lead.priority}</span>
              <ArrowUpRight size={14} className="text-[var(--color-text-muted)] group-hover:text-cyan-400 transition-colors" />
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
