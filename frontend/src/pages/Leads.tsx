import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Filter,
  ArrowUpDown,
  ArrowUpRight,
  Brain,
  Activity,
  Shield,
  GitBranch,
  FileText,
  FolderPlus,
  Check,
} from 'lucide-react';

import {
  GlassPanel,
  SearchInput,
  ScoreRing,
  RiskBadge,
  IntelligenceTag,
  EmptyState,
  LoadingState,
} from '../components/ui';

import { leadService, caseService } from '../services';
import type { InvestigationLead } from '../types';

export default function Leads() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [leads, setLeads] = useState<InvestigationLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<
    'rank' | 'anomaly_score' | 'priority'
  >('rank');

  const [creatingCase, setCreatingCase] = useState<string | null>(null);
  const [createdCases, setCreatedCases] = useState<Set<string>>(new Set());

  useEffect(() => {
    leadService.getAll().then(data => {
      setLeads(data);
      setLoading(false);
    });
  }, []);

  const filteredLeads = leads
    .filter(
      l =>
        priorityFilter === 'all' ||
        l.priority === priorityFilter
    )
    .filter(
      l =>
        !search ||
        l.entity_address
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        l.evidence_channels.some(c =>
          c.toLowerCase().includes(search.toLowerCase())
        )
    )
    .sort((a, b) => {
      if (sortBy === 'anomaly_score') {
        return b.anomaly_score - a.anomaly_score;
      }

      if (sortBy === 'priority') {
        const order = {
          high: 0,
          medium: 1,
          low: 2,
        };

        return order[a.priority] - order[b.priority];
      }

      return a.rank - b.rank;
    });

  const highCount = leads.filter(
    l => l.priority === 'high'
  ).length;

  const medCount = leads.filter(
    l => l.priority === 'medium'
  ).length;

  const lowCount = leads.filter(
    l => l.priority === 'low'
  ).length;

  /**
   * Create a persistent investigation case from a real lead.
   */
  const handleCreateCase = async (
    e: React.MouseEvent,
    lead: InvestigationLead
  ) => {
    e.stopPropagation();

    if (creatingCase === lead.id) {
      return;
    }

    if (createdCases.has(lead.id)) {
      navigate('/cases');
      return;
    }

    setCreatingCase(lead.id);

    try {
      const createdCase = await caseService.createFromLead(
        lead.id
      );

      console.log(
        'CASE CREATED FROM LEAD:',
        createdCase
      );

      setCreatedCases(prev => {
        const next = new Set(prev);
        next.add(lead.id);
        return next;
      });

      // Give the UI a moment to show "Created"
      // before opening Cases & Reports.
      setTimeout(() => {
        navigate('/cases');
      }, 500);
    } catch (error) {
      console.error(
        'Failed to create investigation case:',
        error
      );

      alert(
        'Failed to create investigation case. Check the backend console.'
      );
    } finally {
      setCreatingCase(null);
    }
  };

  if (loading) {
    return (
      <LoadingState message="Loading investigation leads..." />
    );
  }

  return (
    <div className="space-y-6">

      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
            Investigation Queue
          </h1>

          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            {leads.length} leads generated from ML anomaly
            detection and behavioral analysis
          </p>
        </div>

        <div className="flex items-center gap-3">

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-red-500/10 border border-red-500/20">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-xs font-mono text-red-400">
              {highCount} High
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs font-mono text-amber-400">
              {medCount} Medium
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/20">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs font-mono text-green-400">
              {lowCount} Low
            </span>
          </div>

        </div>
      </div>

      {/* Controls */}
      <GlassPanel className="p-4">
        <div className="flex items-center gap-4">

          <div className="flex-1 max-w-sm">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search addresses, evidence channels..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter
              size={12}
              className="text-[var(--color-text-muted)]"
            />

            {['all', 'high', 'medium', 'low'].map(p => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-1 rounded text-[10px] font-medium uppercase tracking-wider transition-all ${priorityFilter === p
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] border border-transparent'
                  }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">

            <ArrowUpDown
              size={12}
              className="text-[var(--color-text-muted)]"
            />

            <select
              value={sortBy}
              onChange={e =>
                setSortBy(
                  e.target.value as typeof sortBy
                )
              }
              className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] rounded px-2 py-1 text-[10px] text-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-border-active)]"
            >
              <option value="rank">Rank</option>
              <option value="anomaly_score">
                Anomaly Score
              </option>
              <option value="priority">Priority</option>
            </select>

          </div>

        </div>
      </GlassPanel>

      {/* Leads Table */}
      <GlassPanel className="overflow-hidden">

        <div className="overflow-x-auto">

          <table className="intel-table w-full">

            <thead>
              <tr>
                <th className="w-12">Rank</th>
                <th>Entity</th>
                <th>Type</th>
                <th>Priority</th>
                <th>ML Anomaly</th>
                <th>Evidence</th>
                <th>Cluster</th>
                <th>Last Activity</th>
                <th className="w-32">Action</th>
              </tr>
            </thead>

            <tbody>

              {filteredLeads.map(lead => {

                const isCreating =
                  creatingCase === lead.id;

                const isCreated =
                  createdCases.has(lead.id);

                return (
                  <tr
                    key={lead.id}
                    className="group cursor-pointer"
                    onClick={() =>
                      navigate(
                        `/entity/${lead.entity_id}`
                      )
                    }
                  >

                    {/* Rank */}
                    <td>
                      <span className="text-xs font-mono text-[var(--color-text-muted)]">
                        #{lead.rank}
                      </span>
                    </td>

                    {/* Entity */}
                    <td>
                      <span className="text-xs font-mono text-[var(--color-text-primary)] group-hover:text-cyan-400 transition-colors">
                        {lead.entity_address.slice(0, 16)}
                        ...
                        {lead.entity_address.slice(-6)}
                      </span>
                    </td>

                    {/* Type */}
                    <td>
                      <IntelligenceTag
                        label={lead.entity_type}
                        color="cyan"
                      />
                    </td>

                    {/* Priority */}
                    <td>
                      <RiskBadge
                        priority={lead.priority}
                      />
                    </td>

                    {/* ML Anomaly */}
                    <td>
                      <div className="flex items-center gap-2">

                        <ScoreRing
                          score={
                            lead.anomaly_score > 1
                              ? lead.anomaly_score / 100
                              : lead.anomaly_score
                          }
                          size={28}
                          strokeWidth={2}
                        />

                        <span className="text-xs font-mono tabular-nums text-[var(--color-text-secondary)]">
                          {lead.anomaly_score > 1
                            ? lead.anomaly_score.toFixed(0)
                            : (
                              lead.anomaly_score * 100
                            ).toFixed(0)}
                        </span>

                      </div>
                    </td>

                    {/* Evidence Channels */}
                    <td>
                      <div className="flex items-center gap-1">

                        {lead.evidence_channels.map(ch => {

                          const iconMap: Record<
                            string,
                            React.ElementType
                          > = {
                            ml: Brain,
                            temporal: Activity,
                            network: Shield,
                            graph: GitBranch,
                            pattern: FileText,
                          };

                          const Icon =
                            iconMap[ch] || Activity;

                          return (
                            <span
                              key={ch}
                              className="p-1 rounded bg-[var(--color-bg-primary)] border border-[var(--color-border-subtle)]"
                              title={ch}
                            >
                              <Icon
                                size={10}
                                className="text-[var(--color-text-muted)]"
                              />
                            </span>
                          );
                        })}

                      </div>
                    </td>

                    {/* Cluster */}
                    <td>
                      <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                        {lead.cluster_id
                          ? String(lead.cluster_id).startsWith('C-')
                            ? lead.cluster_id
                            : `C-${lead.cluster_id}`
                          : '—'}
                      </span>
                    </td>

                    {/* Last Activity */}
                    <td>
                      <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                        {new Date(
                          lead.last_activity
                        ).toLocaleDateString()}
                      </span>
                    </td>

                    {/* Actions */}
                    <td>

                      <div className="flex items-center gap-1">

                        {/* Create Case */}
                        <button
                          title={
                            isCreated
                              ? 'Case created — open Cases & Reports'
                              : 'Create investigation case'
                          }
                          disabled={isCreating}
                          onClick={e =>
                            handleCreateCase(
                              e,
                              lead
                            )
                          }
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md border text-[10px] font-medium transition-all ${isCreated
                              ? 'border-green-500/30 text-green-400 bg-green-500/10'
                              : 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10'
                            } ${isCreating
                              ? 'opacity-60 cursor-wait'
                              : ''
                            }`}
                        >

                          {isCreating ? (
                            <>
                              <span className="w-3 h-3 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                              Creating
                            </>
                          ) : isCreated ? (
                            <>
                              <Check size={11} />
                              Created
                            </>
                          ) : (
                            <>
                              <FolderPlus size={11} />
                              Case
                            </>
                          )}

                        </button>

                        {/* Entity */}
                        <button
                          title="Open entity investigation"
                          className="p-1.5 rounded hover:bg-cyan-500/10 transition-colors"
                          onClick={e => {
                            e.stopPropagation();
                            navigate(
                              `/entity/${lead.entity_id}`
                            );
                          }}
                        >
                          <ArrowUpRight
                            size={14}
                            className="text-cyan-400"
                          />
                        </button>

                      </div>

                    </td>

                  </tr>
                );
              })}

            </tbody>

          </table>

        </div>

        {filteredLeads.length === 0 && (
          <EmptyState
            title="No leads match your filters"
            description="Try adjusting the search or priority filter"
          />
        )}

      </GlassPanel>

    </div>
  );
}