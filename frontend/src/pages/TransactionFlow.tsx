import { useState, useEffect } from 'react';
import {
  ArrowRightLeft,
  Clock,
  Hash,
  DollarSign,
  Wallet,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import {
  GlassPanel,
  IntelligenceTag,
  LoadingState,
} from '../components/ui';

import { transactionService } from '../services';
import type { TransactionFlow } from '../types';

export default function TransactionFlow() {
  const [flows, setFlows] = useState<TransactionFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    transactionService
      .getFlows()
      .then(data => {
        if (!mounted) return;
        setFlows(data);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load transaction flows');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <LoadingState message="Loading transaction flows..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
            Transaction Flow Analysis
          </h1>

          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Visualize fund movement patterns and trace transaction chains
          </p>
        </div>

        <GlassPanel className="p-6 border-red-500/20">
          <p className="text-sm font-semibold text-red-400">
            Unable to load transaction flows
          </p>

          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            {error}
          </p>
        </GlassPanel>
      </div>
    );
  }

  const patternColors: Record<string, string> = {
    fan_out: 'cyan',
    'repeated-fanout': 'green',
    peeling: 'amber',
    mixing: 'violet',
    fan_in: 'green',
    chain: 'red',
  };

  const patterns = [
    'fan_out',
    'repeated-fanout',
    'peeling',
    'mixing',
    'fan_in',
  ];

  const formatPatternName = (pattern: string) =>
    pattern
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());

  const formatAddress = (address: string) => {
    if (!address) return 'Unknown address';

    if (address.length <= 24) {
      return address;
    }

    return `${address.slice(0, 14)}...${address.slice(-10)}`;
  };

  const formatTxid = (txid: string) => {
    if (!txid) return 'Unknown transaction';

    if (txid.length <= 32) {
      return txid;
    }

    return `${txid.slice(0, 24)}...${txid.slice(-8)}`;
  };

  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return 'Time unavailable';

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return timestamp;
    }

    return date.toLocaleString();
  };

  const formatBtc = (value: number, decimals = 6) => {
    if (!Number.isFinite(value)) return '0.000000';

    return value.toFixed(decimals);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
          Transaction Flow Analysis
        </h1>

        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Visualize fund movement patterns and trace transaction chains
        </p>
      </div>

      {/* Pattern Summary */}
      <div className="grid grid-cols-5 gap-4">
        {patterns.map(pattern => {
          const count = flows.filter(
            flow => flow.pattern === pattern
          ).length;

          const color = patternColors[pattern] || 'cyan';

          return (
            <GlassPanel
              key={pattern}
              className="p-4 flex items-center gap-3"
            >
              <div
                className={`p-2 rounded-lg ${
                  color === 'cyan'
                    ? 'bg-cyan-500/10'
                    : color === 'amber'
                      ? 'bg-amber-500/10'
                      : color === 'violet'
                        ? 'bg-violet-500/10'
                        : color === 'red'
                          ? 'bg-red-500/10'
                          : 'bg-green-500/10'
                }`}
              >
                <ArrowRightLeft
                  size={16}
                  className={
                    color === 'cyan'
                      ? 'text-cyan-400'
                      : color === 'amber'
                        ? 'text-amber-400'
                        : color === 'violet'
                          ? 'text-violet-400'
                          : color === 'red'
                            ? 'text-red-400'
                            : 'text-green-400'
                  }
                />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                  {formatPatternName(pattern)}
                </p>

                <p className="text-lg font-bold tabular-nums text-[var(--color-text-primary)]">
                  {count}
                </p>

                <p className="text-[9px] text-[var(--color-text-muted)]">
                  transaction flows
                </p>
              </div>
            </GlassPanel>
          );
        })}
      </div>

      {/* Empty State */}
      {flows.length === 0 && (
        <GlassPanel className="p-8 text-center">
          <ArrowRightLeft
            size={28}
            className="mx-auto text-[var(--color-text-muted)] mb-3"
          />

          <p className="text-sm font-semibold text-[var(--color-text-primary)]">
            No transaction flows detected
          </p>

          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Run the analysis on the active dataset to generate transaction-flow
            candidates.
          </p>
        </GlassPanel>
      )}

      {/* Transaction Flows */}
      <div className="space-y-4">
        {flows.map((flow, index) => {
          const flowKey = `${flow.txid}-${index}`;
          const isExpanded = expandedTx === flowKey;

          const totalIn = flow.inputs.reduce(
            (sum, input) => sum + input.amount,
            0
          );

          const totalOut = flow.outputs.reduce(
            (sum, output) => sum + output.amount,
            0
          );

          const conservationDifference =
            Math.abs(totalIn - totalOut - flow.fee);

          const conservationVerified =
            flow.inputs.length > 0 &&
            flow.outputs.length > 0 &&
            conservationDifference < 0.00001;

          return (
            <GlassPanel
              key={flowKey}
              className="overflow-hidden"
            >

              {/* Transaction Header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--color-bg-tertiary)]/50 transition-colors"
                onClick={() =>
                  setExpandedTx(isExpanded ? null : flowKey)
                }
              >
                <div className="flex items-center gap-4 min-w-0">

                  <div className="p-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] shrink-0">
                    <Hash
                      size={16}
                      className="text-cyan-400"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-mono text-[var(--color-text-primary)] truncate">
                      {formatTxid(flow.txid)}
                    </p>

                    <div className="flex items-center gap-3 mt-1 flex-wrap">

                      <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                        <Clock size={9} />

                        {formatTimestamp(flow.timestamp)}
                      </span>

                      <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                        <DollarSign size={9} />

                        Fee: {formatBtc(flow.fee)} BTC
                      </span>

                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">

                  {flow.pattern && (
                    <IntelligenceTag
                      label={formatPatternName(flow.pattern)}
                      color={patternColors[flow.pattern] || 'cyan'}
                    />
                  )}

                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums text-[var(--color-text-primary)]">
                      {formatBtc(totalIn, 4)} BTC
                    </p>

                    <p className="text-[10px] text-[var(--color-text-muted)]">
                      {flow.inputs.length} in → {flow.outputs.length} out
                    </p>
                  </div>

                  {isExpanded ? (
                    <ChevronUp
                      size={16}
                      className="text-[var(--color-text-muted)]"
                    />
                  ) : (
                    <ChevronDown
                      size={16}
                      className="text-[var(--color-text-muted)]"
                    />
                  )}
                </div>
              </div>

              {/* Expanded Transaction Flow */}
              {isExpanded && (
                <div className="px-4 pb-5 border-t border-[var(--color-border-subtle)]">

                  <div className="flex items-start justify-center gap-8 py-6">

                    {/* Inputs */}
                    <div className="flex flex-col gap-2 items-end min-w-0 max-w-[42%]">

                      <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                        Inputs ({flow.inputs.length})
                      </p>

                      {flow.inputs.length === 0 ? (
                        <div className="text-[10px] text-[var(--color-text-muted)]">
                          No input records available
                        </div>
                      ) : (
                        flow.inputs.map((input, i) => (
                          <div
                            key={`${input.address}-${i}`}
                            className="flex items-center gap-2 px-3 py-2 rounded-md bg-cyan-500/5 border border-cyan-500/20"
                          >
                            <Wallet
                              size={12}
                              className="text-cyan-400 shrink-0"
                            />

                            <div className="text-right min-w-0">
                              <p
                                title={input.address}
                                className="text-[10px] font-mono text-[var(--color-text-primary)] truncate max-w-[260px]"
                              >
                                {formatAddress(input.address)}
                              </p>

                              <p className="text-[10px] font-mono text-cyan-400">
                                {formatBtc(input.amount)} BTC
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Transaction Node */}
                    <div className="flex flex-col items-center justify-center gap-1 pt-5 shrink-0">

                      <div className="flex flex-col items-center">
                        <div className="w-px h-4 bg-cyan-500/30" />

                        <div className="w-2 h-2 border-l-2 border-b-2 border-cyan-500/50 rotate-[-45deg] -mt-1" />
                      </div>

                      <div className="px-3 py-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] text-center">

                        <ArrowRightLeft
                          size={14}
                          className="text-[var(--color-accent-cyan)] mx-auto mb-1"
                        />

                        <p className="text-[9px] text-[var(--color-text-muted)]">
                          TX
                        </p>

                      </div>

                      <div className="flex flex-col items-center">
                        <div className="w-px h-4 bg-cyan-500/30" />

                        <div className="w-2 h-2 border-l-2 border-b-2 border-cyan-500/50 rotate-[-45deg] -mt-1" />
                      </div>

                    </div>

                    {/* Outputs */}
                    <div className="flex flex-col gap-2 min-w-0 max-w-[42%]">

                      <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)] mb-1">
                        Outputs ({flow.outputs.length})
                      </p>

                      {flow.outputs.length === 0 ? (
                        <div className="text-[10px] text-[var(--color-text-muted)]">
                          No output records available
                        </div>
                      ) : (
                        flow.outputs.map((output, i) => (
                          <div
                            key={`${output.address}-${i}`}
                            className="flex items-center gap-2 px-3 py-2 rounded-md bg-violet-500/5 border border-violet-500/20"
                          >
                            <Wallet
                              size={12}
                              className="text-violet-400 shrink-0"
                            />

                            <div className="min-w-0">
                              <p
                                title={output.address}
                                className="text-[10px] font-mono text-[var(--color-text-primary)] truncate max-w-[260px]"
                              >
                                {formatAddress(output.address)}
                              </p>

                              <p className="text-[10px] font-mono text-violet-400">
                                {formatBtc(output.amount)} BTC
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Value Summary */}
                  <div className="flex items-center justify-center gap-6 py-3 border-t border-[var(--color-border-subtle)] flex-wrap">

                    <div className="text-center">
                      <p className="text-[9px] text-[var(--color-text-muted)]">
                        Total Input
                      </p>

                      <p className="text-xs font-mono font-bold text-cyan-400">
                        {formatBtc(totalIn)} BTC
                      </p>
                    </div>

                    <div className="text-center">
                      <p className="text-[9px] text-[var(--color-text-muted)]">
                        Fee
                      </p>

                      <p className="text-xs font-mono font-bold text-amber-400">
                        {formatBtc(flow.fee)} BTC
                      </p>
                    </div>

                    <div className="text-center">
                      <p className="text-[9px] text-[var(--color-text-muted)]">
                        Total Output
                      </p>

                      <p className="text-xs font-mono font-bold text-violet-400">
                        {formatBtc(totalOut)} BTC
                      </p>
                    </div>

                    <div className="text-center">
                      <p className="text-[9px] text-[var(--color-text-muted)]">
                        Conservation
                      </p>

                      <p
                        className={`text-xs font-mono font-bold ${
                          conservationVerified
                            ? 'text-green-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {conservationVerified
                          ? '✓ Verified'
                          : '⚠ Check'}
                      </p>
                    </div>

                  </div>
                </div>
              )}
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}