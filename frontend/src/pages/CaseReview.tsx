import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  GitBranch,
  Activity,
  Network,
  Brain,
  Clock,
  Wallet,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

import {
  GlassPanel,
  RiskBadge,
  LoadingState,
  IntelligenceTag,
} from '../components/ui';

import {
  caseService,
  entityService,
  patternService,
} from '../services';

type CaseReviewProps = {
  caseId: string;
  onBack: () => void;
};

type EvidenceItem = {
  id?: string;
  kind?: string;
  channel?: string;
  title?: string;
  description?: string;
  metric?: string | number;
  score?: number;
  severity?: string;
  patternType?: string;
  indicators?: string[];
};

type TimelineItem = {
  txid: string;
  timestamp: string;
  direction: 'in' | 'out';
  amount: number;
  related_entity: string;
  fee: number;
};

type PatternItem = {
  id: string;
  pattern_type?: string;
  type?: string;
  score?: number;
  description?: string;
};

export default function CaseReview({
  caseId,
  onBack,
}: CaseReviewProps) {
  const [caseData, setCaseData] = useState<any>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError('');

        const data = await caseService.getDetails(caseId);

        if (cancelled) return;

        setCaseData(data);

        const entityId =
          data.primaryEntity ??
          data.primary_entity ??
          '';

        if (!entityId) {
          setLoading(false);
          return;
        }

        const [
          evidenceData,
          findingsData,
          timelineData,
          patternData,
        ] = await Promise.all([
          entityService.getEvidence(entityId),
          entityService.getFindings(entityId),
          entityService.getTimeline(entityId),
          patternService.getAll(),
        ]);

        if (cancelled) return;

        setEvidence(evidenceData as any[]);
        setFindings(findingsData as any[]);
        setTimeline(timelineData as TimelineItem[]);

        const patternIds = new Set(
          (data.patternIds ?? []).map(String)
        );

        const matchedPatterns = (patternData ?? [])
          .filter((pattern: any) =>
            patternIds.has(
              String(
                pattern.id ??
                pattern.patternId ??
                pattern.metric ??
                ''
              )
            )
          );

        setPatterns(matchedPatterns as PatternItem[]);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load case review'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [caseId]);

  if (loading) {
    return (
      <LoadingState message="Loading investigation case..." />
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] hover:text-cyan-400"
        >
          <ArrowLeft size={14} />
          Back to Cases
        </button>

        <GlassPanel className="p-6">
          <div className="flex items-center gap-3 text-red-400">
            <AlertTriangle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        </GlassPanel>
      </div>
    );
  }

  if (!caseData) return null;

  const entityId =
    caseData.primaryEntity ??
    caseData.primary_entity ??
    '';

  const status =
    String(caseData.status ?? 'open')
      .replace('_', ' ');

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] hover:text-cyan-400 mb-3"
          >
            <ArrowLeft size={14} />
            Back to Cases
          </button>

          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
              {caseData.id}
            </h1>

            <RiskBadge
              priority={
                caseData.priority === 'high' ||
                caseData.priority === 'medium'
                  ? caseData.priority
                  : 'low'
              }
            />

            <span className="px-2 py-1 rounded border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 text-[10px] capitalize">
              {status}
            </span>
          </div>

          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Investigation Case Review
          </p>
        </div>
      </div>

      {/* Case overview */}
      <GlassPanel className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
              Case Overview
            </h2>

            <p className="text-xs text-[var(--color-text-secondary)] mt-2 max-w-3xl">
              {caseData.description ??
                caseData.summary ??
                caseData.title ??
                'No case description available.'}
            </p>
          </div>

          <FileText
            size={20}
            className="text-cyan-400"
          />
        </div>

        <div className="grid grid-cols-4 gap-4 mt-5">
          <ReviewMetric
            label="Evidence"
            value={caseData.evidenceIds?.length ?? evidence.length}
          />

          <ReviewMetric
            label="Patterns"
            value={caseData.patternIds?.length ?? patterns.length}
          />

          <ReviewMetric
            label="Transactions"
            value={caseData.transactionIds?.length ?? timeline.length}
          />

          <ReviewMetric
            label="Related Entities"
            value={caseData.relatedEntities?.length ?? 0}
          />
        </div>

        <div className="mt-5 pt-4 border-t border-[var(--color-border-subtle)] grid grid-cols-2 gap-4">

          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
              Analyst
            </p>

            <p className="text-xs text-[var(--color-text-primary)] mt-1">
              {caseData.analyst ?? 'Local Analyst'}
            </p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
              Primary Entity
            </p>

            <div className="flex items-center gap-2 mt-1">
              <Wallet size={12} className="text-cyan-400" />

              <span className="text-xs font-mono text-cyan-400 break-all">
                {entityId || '—'}
              </span>
            </div>
          </div>

        </div>
      </GlassPanel>

      {/* Evidence */}
      <GlassPanel className="p-5">
        <SectionTitle
          icon={<Brain size={15} />}
          title="Investigation Evidence"
          count={evidence.length}
        />

        {evidence.length === 0 ? (
          <EmptySection text="No evidence available for this entity." />
        ) : (
          <div className="space-y-2 mt-4">
            {evidence.map((item, index) => (
              <div
                key={`${item.id ?? item.title ?? 'evidence'}-${index}`}
                className="p-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <IntelligenceTag
                        label={String(
                          item.channel ??
                          item.kind ??
                          'Evidence'
                        ).toUpperCase()}
                        color="cyan"
                      />

                      <span className="text-xs font-medium text-[var(--color-text-primary)]">
                        {item.title ??
                          item.description ??
                          'Evidence finding'}
                      </span>
                    </div>

                    {item.indicators?.length ? (
                      <ul className="mt-2 space-y-1">
                        {item.indicators.map(
                          (indicator: string, i: number) => (
                            <li
                              key={i}
                              className="text-[11px] text-[var(--color-text-muted)]"
                            >
                              • {indicator}
                            </li>
                          )
                        )}
                      </ul>
                    ) : item.description ? (
                      <p className="text-[11px] text-[var(--color-text-muted)] mt-2">
                        {item.description}
                      </p>
                    ) : null}
                  </div>

                  {item.score !== undefined && (
  <span className="text-xs font-mono text-cyan-400">
    {formatEvidenceMetric(item.score)}
  </span>
)}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>

      {/* Findings */}
      <GlassPanel className="p-5">
        <SectionTitle
          icon={<AlertTriangle size={15} />}
          title="Model & Analytical Findings"
          count={findings.length}
        />

        {findings.length === 0 ? (
          <EmptySection text="No additional findings available." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {findings.map((finding, index) => (
              <div
                key={String(
                  finding.id ?? `finding-${index}`
                )}
                className="p-3 rounded-lg border border-[var(--color-border-subtle)]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--color-text-primary)]">
                    {finding.type ?? 'Finding'}
                  </span>

                  <RiskBadge
                    priority={
                      finding.severity === 'high' ||
                      finding.severity === 'medium'
                        ? finding.severity
                        : 'low'
                    }
                  />
                </div>

                <p className="text-[11px] text-[var(--color-text-muted)] mt-2">
                  {finding.description ?? 'No description available.'}
                </p>

                {Array.isArray(finding.evidence) &&
                  finding.evidence.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {finding.evidence.map(
                        (item: string, i: number) => (
                          <div
                            key={i}
                            className="text-[10px] text-[var(--color-text-secondary)]"
                          >
                            • {item}
                          </div>
                        )
                      )}
                    </div>
                  )}
              </div>
            ))}
          </div>
        )}
      </GlassPanel>

      {/* Patterns */}
      <GlassPanel className="p-5">
        <SectionTitle
          icon={<GitBranch size={15} />}
          title="Associated Patterns"
          count={patterns.length}
        />

        {patterns.length === 0 ? (
          <EmptySection text="No pattern records attached to this case." />
        ) : (
          <div className="space-y-2 mt-4">
            {patterns.map((pattern, index) => (
              <div
                key={pattern.id ?? index}
                className="flex items-center justify-between p-3 rounded-lg border border-[var(--color-border-subtle)]"
              >
                <div>
                  <p className="text-xs font-semibold text-[var(--color-text-primary)]">
                    {pattern.id}
                  </p>

                  <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
                    {pattern.pattern_type ??
                      pattern.type ??
                      'Behavioral pattern'}
                  </p>
                </div>

                {pattern.score !== undefined && (
                  <span className="text-xs font-mono text-cyan-400">
                    {Number(pattern.score).toFixed(4)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassPanel>

      {/* Transaction timeline */}
      <GlassPanel className="p-5">
        <SectionTitle
          icon={<Activity size={15} />}
          title="Transaction Timeline"
          count={timeline.length}
        />

        {timeline.length === 0 ? (
          <EmptySection text="No transaction timeline available." />
        ) : (
          <div className="mt-4 space-y-2">
            {timeline.slice(0, 50).map((tx, index) => (
              <div
                key={`${tx.txid}-${index}`}
                className="p-3 rounded-lg border border-[var(--color-border-subtle)]"
              >
                <div className="flex items-center justify-between gap-4">

                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                      Transaction
                    </p>

                    <p className="text-xs font-mono text-cyan-400 truncate">
                      {tx.txid}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-1 rounded border ${
                      tx.direction === 'in'
                        ? 'text-green-400 bg-green-500/10 border-green-500/20'
                        : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    }`}
                  >
                    {tx.direction.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-4 mt-3">

                  <div>
                    <p className="text-[9px] text-[var(--color-text-muted)]">
                      Amount
                    </p>
                    <p className="text-xs text-[var(--color-text-primary)]">
                      {Number(tx.amount).toFixed(6)} BTC
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] text-[var(--color-text-muted)]">
                      Fee
                    </p>
                    <p className="text-xs text-[var(--color-text-primary)]">
                      {Number(tx.fee).toFixed(6)} BTC
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] text-[var(--color-text-muted)]">
                      Timestamp
                    </p>
                    <p className="text-xs text-[var(--color-text-primary)]">
                      {formatDate(tx.timestamp)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] text-[var(--color-text-muted)]">
                      Related
                    </p>
                    <p className="text-xs font-mono text-cyan-400 truncate">
                      {tx.related_entity || '—'}
                    </p>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

        {timeline.length > 50 && (
          <p className="text-[10px] text-[var(--color-text-muted)] mt-3">
            Showing the first 50 transactions. Full timeline remains
            available through Entity Investigation.
          </p>
        )}
      </GlassPanel>

      {/* Related entities */}
      <GlassPanel className="p-5">
        <SectionTitle
          icon={<Network size={15} />}
          title="Related Entities"
          count={caseData.relatedEntities?.length ?? 0}
        />

        {caseData.relatedEntities?.length ? (
          <div className="flex flex-wrap gap-2 mt-4">
            {caseData.relatedEntities.map(
              (entity: string) => (
                <div
                  key={entity}
                  className="px-3 py-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5"
                >
                  <span className="text-xs font-mono text-cyan-400">
                    {entity}
                  </span>
                </div>
              )
            )}
          </div>
        ) : (
          <EmptySection text="No related entities attached to this case." />
        )}
      </GlassPanel>

    </div>
  );
}

function ReviewMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="p-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]">
      <p className="text-lg font-bold text-[var(--color-text-primary)]">
        {value}
      </p>
      <p className="text-[9px] uppercase tracking-wider text-[var(--color-text-muted)]">
        {label}
      </p>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-cyan-400">
        {icon}
      </span>

      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
        {title}
      </h2>

      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]">
        {count}
      </span>
    </div>
  );
}

function EmptySection({ text }: { text: string }) {
  return (
    <div className="mt-4 p-4 text-center rounded-lg border border-dashed border-[var(--color-border-subtle)]">
      <p className="text-xs text-[var(--color-text-muted)]">
        {text}
      </p>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatEvidenceMetric(score: number): string;
function formatEvidenceMetric(
  channel: string,
  score: number,
  indicators: string[]
): string;
function formatEvidenceMetric(
  channelOrScore: string | number,
  score?: number,
  indicators: string[] = []
): string {
  if (typeof channelOrScore === 'number') {
    return channelOrScore <= 1 && channelOrScore >= 0
      ? `${Math.round(channelOrScore * 100)}%`
      : String(channelOrScore);
  }

  const metricLine = indicators.find(
    item => item.startsWith('Metric:')
  );

  if (metricLine) {
    return metricLine.replace('Metric:', '').trim();
  }

  if (channelOrScore.toLowerCase().includes('ml')) {
    return score!.toFixed(2);
  }

  return Number.isInteger(score)
    ? String(score)
    : score!.toFixed(2);
}