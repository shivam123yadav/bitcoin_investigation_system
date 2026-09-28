import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, ArrowDown, ArrowRightLeft, Wallet, Clock, Hash, TrendingUp, ChevronDown, ChevronUp, X } from 'lucide-react';
import { GlassPanel, SectionHeader, IntelligenceTag, LoadingState, ErrorState, ScoreRing, ProgressBar, CommandButton } from '../components/ui';
import { patternService } from '../services';
import type { Pattern } from '../types';

export default function Patterns() {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    patternService.getAll()
      .then(data => { setPatterns(data); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  if (loading) return <LoadingState message="Loading patterns..." />;
  if (error) return <ErrorState message={error} />;

  const patternTypeLabel = (type: string) => {
    switch (type) {
      case 'repeated-fanout': return 'REPEATED FAN-OUT';
      case 'fan_out': return 'FAN-OUT';
      case 'fan_in': return 'FAN-IN';
      case 'peeling': return 'PEELING CHAIN';
      case 'mixing': return 'MIXING';
      case 'chain': return 'CHAIN';
      default: return type.toUpperCase().replace(/_/g, ' ');
    }
  };

  const patternColor = (type: string) => {
    switch (type) {
      case 'repeated-fanout': case 'fan_out': return 'cyan';
      case 'peeling': return 'amber';
      case 'mixing': return 'violet';
      case 'fan_in': return 'green';
      case 'chain': return 'red';
      default: return 'cyan';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">Pattern Intelligence</h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">Candidate behavioral patterns detected — requires analyst review</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {['repeated-fanout', 'peeling', 'mixing', 'fan_in'].map(type => {
          const count = patterns.filter(p => p.type === type).length;
          const color = patternColor(type);
          return (
            <GlassPanel key={type} className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${color === 'cyan' ? 'bg-cyan-500/10' : color === 'amber' ? 'bg-amber-500/10' : color === 'violet' ? 'bg-violet-500/10' : 'bg-green-500/10'}`}>
                <ArrowRightLeft size={16} className={color === 'cyan' ? 'text-cyan-400' : color === 'amber' ? 'text-amber-400' : color === 'violet' ? 'text-violet-400' : 'text-green-400'} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{patternTypeLabel(type)}</p>
                <p className="text-lg font-bold tabular-nums text-[var(--color-text-primary)]">{count}</p>
              </div>
            </GlassPanel>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Pattern Cards */}
        <div className="col-span-2 space-y-3">
          {patterns.map(pattern => (
            <GlassPanel
              key={pattern.id}
              className={`p-4 cursor-pointer transition-all ${selectedPattern?.id === pattern.id ? 'border-[var(--color-border-active)] glow-cyan' : 'hover:border-[var(--color-border-active)]'}`}
              onClick={() => setSelectedPattern(pattern)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${patternColor(pattern.type) === 'cyan' ? 'bg-cyan-500/10' : patternColor(pattern.type) === 'amber' ? 'bg-amber-500/10' : patternColor(pattern.type) === 'violet' ? 'bg-violet-500/10' : 'bg-green-500/10'}`}>
                    <GitBranch size={16} className={patternColor(pattern.type) === 'cyan' ? 'text-cyan-400' : patternColor(pattern.type) === 'amber' ? 'text-amber-400' : patternColor(pattern.type) === 'violet' ? 'text-violet-400' : 'text-green-400'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <IntelligenceTag label={patternTypeLabel(pattern.type)} color={patternColor(pattern.type)} />
                      <span className="text-[10px] text-[var(--color-text-muted)]">ID: {pattern.id}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">{pattern.description}</p>
                  </div>
                </div>
                <ScoreRing score={pattern.score} size={40} strokeWidth={3} />
              </div>

              <div className="grid grid-cols-5 gap-3 mt-4">
                <div>
                  <p className="text-[9px] text-[var(--color-text-muted)]">Score</p>
                  <p className="text-xs font-mono font-bold tabular-nums text-[var(--color-text-primary)]">{(pattern.score * 100).toFixed(0)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-[var(--color-text-muted)]" title="Evidence coverage reflects the amount and consistency of supporting analytical evidence; it is not a probability of criminal activity.">Evidence Coverage</p>
                  <p className="text-xs font-mono font-bold tabular-nums text-[var(--color-text-primary)]">{(pattern.confidence * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-[9px] text-[var(--color-text-muted)]">Observations</p>
                  <p className="text-xs font-mono font-bold tabular-nums text-[var(--color-text-primary)]">{pattern.observations}</p>
                </div>
                <div>
                  <p className="text-[9px] text-[var(--color-text-muted)]">Transactions</p>
                  <p className="text-xs font-mono font-bold tabular-nums text-[var(--color-text-primary)]">{pattern.transactions}</p>
                </div>
                <div>
                  <p className="text-[9px] text-[var(--color-text-muted)]">Time Window</p>
                  <p className="text-xs font-mono font-bold tabular-nums text-[var(--color-text-primary)]">{pattern.time_window}</p>
                </div>
              </div>

              {/* Repeated-fanout specific metrics */}
              {pattern.type === 'repeated-fanout' && (
                <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
                  {pattern.repeated_tx_count !== undefined && (
                    <div>
                      <p className="text-[9px] text-[var(--color-text-muted)]">Repeated TX Count</p>
                      <p className="text-xs font-mono font-bold text-cyan-400">{pattern.repeated_tx_count}</p>
                    </div>
                  )}
                  {pattern.output_set_reuse !== undefined && (
                    <div>
                      <p className="text-[9px] text-[var(--color-text-muted)]">Output Set Reuse</p>
                      <p className="text-xs font-mono font-bold text-cyan-400">{(pattern.output_set_reuse * 100).toFixed(0)}%</p>
                    </div>
                  )}
                  {pattern.output_similarity !== undefined && (
                    <div>
                      <p className="text-[9px] text-[var(--color-text-muted)]">Output Similarity</p>
                      <p className="text-xs font-mono font-bold text-cyan-400">{(pattern.output_similarity * 100).toFixed(0)}%</p>
                    </div>
                  )}
                  {pattern.value_conservation !== undefined && (
                    <div>
                      <p className="text-[9px] text-[var(--color-text-muted)]">Value Conservation</p>
                      <p className="text-xs font-mono font-bold text-cyan-400">{(pattern.value_conservation * 100).toFixed(0)}%</p>
                    </div>
                  )}
                </div>
              )}
            </GlassPanel>
          ))}
        </div>

        {/* Pattern Detail */}
        <div className="col-span-1">
          {selectedPattern ? (
            <div className="space-y-4 sticky top-4">
              <GlassPanel elevated className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <IntelligenceTag label={patternTypeLabel(selectedPattern.type)} color={patternColor(selectedPattern.type)} />
                  <button onClick={() => setSelectedPattern(null)} className="p-1 rounded hover:bg-[var(--color-bg-tertiary)]">
                    <X size={12} className="text-[var(--color-text-muted)]" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Pattern Score</p>
                    <div className="flex items-center gap-3">
                      <ScoreRing score={selectedPattern.score} size={48} strokeWidth={3} />
                      <div>
                        <p className="text-lg font-bold tabular-nums text-[var(--color-text-primary)]">{(selectedPattern.score * 100).toFixed(1)}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">evidence coverage: {(selectedPattern.confidence * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Description</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{selectedPattern.description}</p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Entities</p>
                    <div className="space-y-1">
                      {selectedPattern.entities.map(e => (
                        <div key={e} className="px-2 py-1 rounded bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]">
                          <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">{e}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Repeated-fanout visualization */}
                  {selectedPattern.type === 'repeated-fanout' && selectedPattern.pattern_steps && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Pattern Flow</p>
                      <div className="space-y-2">
                        {selectedPattern.pattern_steps.slice(0, 4).map((step, i) => (
                          <div key={i} className="relative">
                            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-cyan-500/5 border border-cyan-500/20">
                              <Wallet size={10} className="text-cyan-400" />
                              <span className="text-[9px] font-mono text-[var(--color-text-secondary)] truncate">{step.source}</span>
                            </div>
                            <div className="flex items-center justify-center py-1">
                              <ArrowDown size={10} className="text-cyan-400/50" />
                            </div>
                            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-violet-500/5 border border-violet-500/20">
                              <Hash size={10} className="text-violet-400" />
                              <span className="text-[9px] font-mono text-[var(--color-text-secondary)] truncate">TX: {step.txid.slice(0, 12)}</span>
                            </div>
                            <div className="flex items-center justify-center py-1">
                              <ArrowDown size={10} className="text-violet-400/50" />
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                              {step.outputs.slice(0, 4).map((out, j) => (
                                <div key={j} className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/5 border border-amber-500/20">
                                  <Wallet size={8} className="text-amber-400" />
                                  <span className="text-[8px] font-mono text-[var(--color-text-secondary)] truncate">{out.slice(0, 10)}</span>
                                </div>
                              ))}
                            </div>
                            {i < 3 && <div className="border-b border-[var(--color-border-subtle)] my-2" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional metrics for repeated-fanout */}
                  {selectedPattern.type === 'repeated-fanout' && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Metrics</p>
                      <div className="space-y-2">
                        {selectedPattern.repeated_tx_count !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[var(--color-text-muted)]">Repeated TX Count</span>
                            <span className="text-[10px] font-mono text-cyan-400">{selectedPattern.repeated_tx_count}</span>
                          </div>
                        )}
                        {selectedPattern.median_gap !== undefined && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[var(--color-text-muted)]">Median Gap</span>
                            <span className="text-[10px] font-mono text-cyan-400">{Math.round(selectedPattern.median_gap / 3600)}h</span>
                          </div>
                        )}
                        {selectedPattern.observation_span && (
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-[var(--color-text-muted)]">Observation Span</span>
                            <span className="text-[10px] font-mono text-cyan-400">{selectedPattern.observation_span}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </GlassPanel>
            </div>
          ) : (
            <GlassPanel className="p-5">
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <GitBranch size={24} className="text-[var(--color-text-muted)] mb-2" />
                <p className="text-xs text-[var(--color-text-muted)]">Select a pattern</p>
                <p className="text-[10px] text-[var(--color-text-muted)] mt-1">Click a pattern card to view details</p>
              </div>
            </GlassPanel>
          )}
        </div>
      </div>
    </div>
  );
}
