/**
 * Backend adapter for the current BTC SENTINEL UI.
 *
 * The UI was generated independently from the original SIH frontend, so this
 * module deliberately keeps the UI types separate from the FastAPI contract.
 * It calls the same /api/v1 endpoints used by the original frontend and
 * normalizes the backend payloads into the newer UI's types.
 */
import type {
  Entity, InvestigationLead, Cluster, TransactionFlow, Pattern,
  AnalysisStage, DatasetInfo, Case, GraphData, SystemStatus, DashboardStats,
  DashboardTimeline, EntityEvidence, EntityFinding, EntityTimelineEntry,
  SearchResult, HealthStatus, AnalysisStatus, DatasetUploadResult,
} from '../types';
import * as mock from './mockBackend';

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

/**
 * Minimal deployment protection.
 *
 * When VITE_API_TOKEN is set, every request carries the shared token in the
 * X-API-Token header. The backend only requires it for state-changing
 * endpoints (case create/delete, analysis runs, dataset uploads), so read-only
 * dashboards keep working either way. When the variable is unset no header is
 * sent, which keeps local development unchanged.
 */
const API_TOKEN = (import.meta.env.VITE_API_TOKEN || '').trim();

function authHeaders(): Record<string, string> {
  return API_TOKEN ? { 'X-API-Token': API_TOKEN } : {};
}

const configuredBase = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
// Accept both the old ".../api/v1" configuration and a bare backend origin.
const API_BASE = configuredBase.endsWith('/api/v1')
  ? configuredBase
  : configuredBase.endsWith('/api')
    ? `${configuredBase}/v1`
    : configuredBase === '/api'
      ? '/api/v1'
      : configuredBase.includes('/api')
        ? configuredBase
        : `${configuredBase}/api/v1`;

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...authHeaders(),
      ...(options?.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${body.slice(0, 240) || response.statusText}`);
  }
  return response.json() as Promise<T>;
}

async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function n(value: unknown, fallback = 0): number {
  const x = Number(value);
  return Number.isFinite(x) ? x : fallback;
}

function text(value: unknown, fallback = ''): string {
  return value == null ? fallback : String(value);
}

function priority(value: unknown): 'high' | 'medium' | 'low' {
  const v = text(value).toLowerCase();
  return v === 'high' || v === 'medium' || v === 'low' ? v : 'low';
}

function mapLead(raw: any, fallbackRank = 0): InvestigationLead {
  const score = n(raw.finalPriorityScore ?? raw.priorityScore ?? raw.priority_score);
  const entityId = text(raw.entityId ?? raw.entity_id ?? raw.id);
  const confidence = raw.confidence ?? raw.analyticalConfidenceIndicator;
  return {
    id: text(raw.leadId ?? raw.id ?? `LEAD-${fallbackRank}`),
    rank: n(raw.rank, fallbackRank),
    entity_id: entityId,
    entity_address: text(raw.entityLabel ?? raw.entity_address ?? entityId),
    entity_type: text(raw.type ?? raw.entityType ?? 'wallet'),
    priority: priority(raw.priority),
    anomaly_score: n(raw.anomalyScore ?? raw.anomaly_score ?? (raw.signalBreakdown?.anomalyScore)),
    evidence_channels: Array.isArray(raw.evidenceChannels)
      ? raw.evidenceChannels.map(String)
      : Array.isArray(raw.signals) ? raw.signals.slice(0, 5).map(String) : [],
    cluster_id: raw.clusterId || raw.cluster_id || undefined,
    last_activity: text(raw.lastActivity ?? raw.last_activity),
    pattern_matches: Array.isArray(raw.validatedPatterns)
      ? raw.validatedPatterns.map((p: any) => text(p.patternType ?? p.pattern_type)).filter(Boolean)
      : [],
    description: text(raw.explanation ?? raw.description ?? (confidence != null ? `Evidence coverage: ${n(confidence)}` : '')),
  };
}

function mapEntity(raw: any, id: string): Entity {
  const address = text(raw.address ?? raw.entityId ?? raw.id ?? id);
  return {
    id: text(raw.id ?? raw.entityId ?? id),
    address,
    type: raw.type === 'ip' || raw.type === 'transaction' || raw.type === 'cluster' ? raw.type : 'wallet',
    first_seen: text(raw.firstSeen ?? raw.first_seen),
    last_seen: text(raw.lastActivity ?? raw.lastActivityAt ?? raw.last_seen ?? raw.last_activity),
    tx_count: n(raw.transactions ?? raw.transactionCount ?? raw.tx_count ?? raw.transaction_count),
    total_volume: n(raw.totalVolumeBtc ?? raw.totalVolume ?? raw.total_volume),
    anomaly_score: n(raw.anomalyScore ?? raw.anomaly_score),
    priority: priority(raw.priority),
    cluster_id: raw.clusterId ?? raw.cluster_id
      ? text(raw.clusterId ?? raw.cluster_id)
      : undefined,
    countries: Array.isArray(raw.countriesList) ? raw.countriesList.map(String) : Array.isArray(raw.countries) ? raw.countries.map(String) : [],
    asns: Array.isArray(raw.asns) ? raw.asns.map(String) : [],
    observed_ips: Array.isArray(raw.observedIps) ? raw.observedIps.map(String) : Array.isArray(raw.ips) ? raw.ips.map(String) : [],
    tags: Array.isArray(raw.signals) ? raw.signals.map(String) : [],
  };
}

function mapCluster(raw: any): Cluster {
  return {
    id: text(raw.id ?? raw.clusterId),
    name: text(raw.name ?? raw.label ?? `Cluster ${raw.id ?? ''}`),
    wallet_count: n(raw.walletCount ?? raw.wallet_count ?? raw.memberWalletIds?.length),
    ip_count: n(raw.ipCount ?? raw.ip_count ?? raw.associatedIpIds?.length),
    countries: Array.isArray(raw.countriesList)
      ? raw.countriesList.map(String)
      : Array.isArray(raw.countries)
        ? raw.countries.map(String)
        : [],
    total_volume: n(raw.totalVolumeBtc ?? raw.total_volume),
    avg_anomaly: n(raw.avgAnomalyScore ?? raw.avg_anomaly),
    behavioral_tags: Array.isArray(raw.behavioralTags)
      ? raw.behavioralTags.map(String)
      : [],
    wallets: Array.isArray(raw.memberWalletIds)
      ? raw.memberWalletIds.map(String)
      : [],
    ips: Array.isArray(raw.associatedIpIds)
      ? raw.associatedIpIds.map(String)
      : [],
  };
}

function mapPattern(raw: any): Pattern {
  const kind = text(raw.pattern_type ?? raw.patternType ?? raw.kind).toLowerCase();
  const type: Pattern['type'] = kind.includes('repeated-fanout') || kind.includes('fan-out-repeated')
    ? 'repeated-fanout'
    : kind.includes('peel') ? 'peeling'
      : kind.includes('mix') ? 'mixing'
        : kind.includes('fan_in') || kind.includes('fan-in') ? 'fan_in'
          : kind.includes('fan_out') || kind.includes('fan-out') ? 'fan_out'
            : kind.includes('chain') ? 'chain' : 'mixing';
  const steps = Array.isArray(raw.steps) ? raw.steps : [];
  const wallets = [...new Set(steps.map((s: any) => text(s.walletId ?? s.wallet_id)).filter(Boolean))];
  const confidenceRaw = raw.confidence;
  const confidence = typeof confidenceRaw === 'number'
    ? Math.max(0, Math.min(1, confidenceRaw))
    : text(confidenceRaw).toLowerCase() === 'high' ? 0.9
      : text(confidenceRaw).toLowerCase() === 'medium' ? 0.7 : 0.5;
  return {
    id: text(raw.id),
    type,
    confidence,
    score: n(raw.pattern_score ?? raw.patternScore ?? raw.score, 0),
    observations: Array.isArray(raw.observations) ? raw.observations.length : n(raw.observations),
    transactions: raw.transactions != null || raw.transaction_count != null
      ? n(raw.transactions ?? raw.transaction_count)
      : new Set(steps.map((s: any) => s.txId ?? s.txid)).size,
    wallets: n(raw.wallets ?? wallets.length),
    time_window: text(raw.time_window ?? raw.timeWindow ?? 'Not available'),
    description: text(raw.description, 'Candidate behavioral pattern requiring analyst review.'),
    entities: Array.isArray(raw.entities) ? raw.entities.map(String) : wallets,
    repeated_tx_count: raw.repeated_tx_count ?? raw.repeatedTransactionCount,
    output_set_reuse: raw.output_set_reuse ?? raw.outputSetReuse,
    median_gap: raw.median_gap != null ? n(raw.median_gap) : raw.medianGapHours != null ? n(raw.medianGapHours) * 3600 : undefined,
    observation_span: raw.observation_span != null ? text(raw.observation_span) : raw.observationSpanHours != null ? `${n(raw.observationSpanHours)}h` : undefined,
    output_similarity: raw.output_similarity ?? raw.outputSimilarity,
    value_conservation: raw.value_conservation ?? raw.valueConservation,
    pattern_steps: steps.map((s: any) => ({
      txid: text(s.txId ?? s.txid),
      timestamp: text(s.timestamp),
      source: text(s.walletId ?? s.walletLabel ?? s.wallet_id),
      outputs: Array.isArray(s.outputs) ? s.outputs.map(String) : [],
      amount: n(s.amount),
    })),
  };
}

function mapTimelinePoint(raw: any): DashboardTimeline {
  return {
    timestamp: text(raw.timestamp ?? raw.label ?? raw.time),
    observations: n(raw.observations ?? raw.transactions ?? raw.count),
    anomalies: n(raw.anomalies ?? raw.anomaly_count),
  };
}

function mapDataset(raw: any): DatasetInfo {
  const fields = Array.isArray(raw.fields) ? raw.fields : [];
  return {
    filename: text(raw.filename ?? raw.dataset_id ?? 'Unknown dataset'),
    format: text(raw.format ?? 'csv').toLowerCase(),
    size: raw.fileSizeBytes != null ? `${(n(raw.fileSizeBytes) / 1024 / 1024).toFixed(1)} MB` : 'Not available',
    record_count: n(raw.records ?? raw.record_count),
    date_range: {
      start: text(raw.timeRangeStart ?? raw.time_start),
      end: text(raw.timeRangeEnd ?? raw.time_end),
    },
    validation_state: text(raw.validationStatus ?? raw.validation_status).toLowerCase().includes('invalid') ? 'invalid'
      : text(raw.validationStatus ?? raw.validation_status).toLowerCase().includes('warning') ? 'warning' : 'valid',
    fields: fields.map((f: any) => ({
      name: text(f.field ?? f.name),
      coverage: n(f.coverage),
      status: text(f.status).toLowerCase() === 'critical' || text(f.status).toLowerCase() === 'invalid' ? 'invalid' : text(f.status).toLowerCase() === 'warning' ? 'warning' : 'valid',
    })),
  };
}

function mapStage(raw: any): AnalysisStage {
  const s = text(raw.status).toLowerCase();
  return {
    id: text(raw.id),
    name: text(raw.name),
    status: s === 'completed' || s === 'complete' ? 'complete' : s === 'running' || s === 'processing' ? 'running' : s === 'failed' || s === 'error' ? 'error' : 'pending',
    progress: n(raw.progress),
    description: text(raw.description ?? raw.detail ?? raw.name),
    metrics: raw.metrics,
  };
}

// ============================================================
// Health / system
// ============================================================
export const healthService = {
  async check(): Promise<HealthStatus> {
    if (USE_MOCK) return mock.mockHealth;

    const raw = await apiFetch<any>('/health');

    return {
      status: raw.status === 'ok' ? 'healthy' : 'degraded',
      version: raw.version,
    };
  },
};

export const systemService = {
  async getStatus(): Promise<SystemStatus> {
    if (USE_MOCK) return mock.mockSystemStatus;
    const [statsRaw, metaRaw, analysisRaw] = await Promise.all([
      apiFetch<any>('/dashboard/stats'),
      apiFetch<any>('/dataset/meta'),
      apiFetch<any>('/analysis/status'),
    ]);
    return {
      engine_online: true,
      analysis_complete: text(analysisRaw.status).toLowerCase() === 'completed',
      dataset_loaded: n(metaRaw.records ?? metaRaw.record_count) > 0,
      dataset_name: text(metaRaw.filename ?? metaRaw.dataset_id),
      total_observations: n(metaRaw.records ?? metaRaw.record_count),
      total_entities: n(statsRaw.wallets) + n(statsRaw.ips),
      total_leads: n(statsRaw.leads),
    };
  },
};

// ============================================================
// Dashboard
// ============================================================
export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    if (USE_MOCK) return mock.mockDashboardStats;
    const [stats, priority] = await Promise.all([
      apiFetch<any>('/dashboard/stats'),
      apiFetch<any>('/dashboard/priority-distribution'),
    ]);
    return {
      transactions: n(stats.transactions),
      wallets: n(stats.wallets),
      ip_observations: n(stats.ips),
      clusters: n(stats.clusters),
      leads: n(stats.leads),
      high_priority: n(priority.high),
      medium_priority: n(priority.medium),
      low_priority: n(priority.low),
    };
  },
  async getPriorityDistribution() {
    if (USE_MOCK) return { high: mock.mockDashboardStats.high_priority, medium: mock.mockDashboardStats.medium_priority, low: mock.mockDashboardStats.low_priority };
    return apiFetch<{ high: number; medium: number; low: number }>('/dashboard/priority-distribution');
  },
  async getTopLeads(limit = 10): Promise<InvestigationLead[]> {
    if (USE_MOCK) return mock.mockLeads.slice(0, limit);
    const raw = await apiFetch<any[]>(`/dashboard/top-leads?limit=${limit}`);
    return (raw ?? []).map((x, i) => mapLead(x, i + 1));
  },
  async getTimeline(): Promise<DashboardTimeline[]> {
    if (USE_MOCK) return mock.mockDashboardTimeline;
    const raw = await apiFetch<any[]>('/dashboard/timeline');
    return (raw ?? []).map(mapTimelinePoint);
  },
  async getRecentActivity(): Promise<InvestigationLead[]> {
    if (USE_MOCK) return mock.mockLeads.slice(0, 8);
    const raw = await apiFetch<any[]>('/dashboard/recent-activity');
    return (raw ?? []).map((x, i) => mapLead(x, i + 1));
  },
};

// ============================================================
// Leads / entities
// ============================================================
export const leadService = {
  async getAll(): Promise<InvestigationLead[]> {
    if (USE_MOCK) return mock.mockLeads;
    const raw = await apiFetch<any[]>('/leads');
    return (raw ?? []).map((x, i) => mapLead(x, i + 1));
  },
};

export const entityService = {
  async getById(id: string): Promise<Entity> {
    if (USE_MOCK) {
      const item = mock.mockEntities.find(e => e.id === id);
      if (!item) throw new Error(`Entity ${id} not found`);
      return item;
    }
    return mapEntity(await apiFetch<any>(`/entities/wallet/${encodeURIComponent(id)}`), id);
  },
  async getEvidence(id: string): Promise<EntityEvidence[]> {
  if (USE_MOCK) return mock.mockEntityEvidence(id);

  const raw = await apiFetch<any[]>(
    `/entities/${encodeURIComponent(id)}/evidence`
  );

  return (raw ?? []).map((x, i) => {
    const metric = text(x.metric);
    const parsedMetric = Number.parseFloat(metric);

    return {
      channel: text(
        x.channel ??
        x.kind ??
        `evidence-${i + 1}`
      ),

      // Backend evidence uses `metric`, not `score`.
      score: Number.isFinite(parsedMetric)
        ? parsedMetric
        : n(x.score ?? x.value),

      indicators: [
        x.title ? String(x.title) : '',
        x.description ? String(x.description) : '',
        metric ? `Metric: ${metric}` : '',
      ].filter(Boolean),
    };
  });
},
  async getFindings(id: string): Promise<EntityFinding[]> {
    if (USE_MOCK) return mock.mockEntityFindings(id);
    const raw = await apiFetch<any[]>(`/entities/${encodeURIComponent(id)}/findings`);
    return (raw ?? []).map((x, i) => ({
      id: text(x.id ?? `${id}-finding-${i + 1}`),
      type: text(x.type ?? x.model ?? 'model finding'),
      severity: priority(x.severity),
      description: text(x.description),
      evidence: Array.isArray(x.evidence) ? x.evidence.map(String) : [text(x.metric)].filter(Boolean),
    }));
  },
  async getTimeline(id: string): Promise<EntityTimelineEntry[]> {
    if (USE_MOCK) return mock.mockEntityTimeline(id);
    const raw = await apiFetch<any[]>(`/entities/${encodeURIComponent(id)}/timeline`);
    return (raw ?? []).map((x: any) => ({
      txid: text(x.txid ?? x.txId),
      timestamp: text(x.timestamp),
      direction: x.direction === 'in' ? 'in' : 'out',
      amount: n(x.amount),
      related_entity: text(x.relatedEntity ?? x.related_entity),
      fee: n(x.fee),
    }));
  },
};

// ============================================================
// Clusters / patterns
// ============================================================
export const clusterService = {
  async getAll(): Promise<Cluster[]> {
    if (USE_MOCK) return mock.mockClusters;
    const raw = await apiFetch<any[]>('/clusters');
    return (raw ?? []).map(mapCluster);
  },
};

export const patternService = {
  async getAll(): Promise<Pattern[]> {
    if (USE_MOCK) return mock.mockPatterns;
    const raw = await apiFetch<any[]>('/patterns');
    return (raw ?? []).map(mapPattern);
  },
};

// ============================================================
// Analysis
// ============================================================
export const analysisService = {
  async getStatus(): Promise<AnalysisStatus> {
    if (USE_MOCK) return mock.mockAnalysisStatus;
    const raw = await apiFetch<any>('/analysis/status');
    return {
      status: text(raw.status) as AnalysisStatus['status'],
      started_at: raw.started_at,
      completed_at: raw.completed_at,
      stages: Array.isArray(raw.stages) ? raw.stages.map(mapStage) : [],
      error: raw.error,
    };
  },
  async trigger(datasetId?: string): Promise<{ status: string; job_id?: string; run_id?: string; analysis_mode?: string }> {
    if (USE_MOCK) {
      return { status: 'started', job_id: 'mock-job-001', run_id: 'mock-run-001' };
    }

    const result = datasetId
      ? await apiPost<any>(`/flexible-dataset/${encodeURIComponent(datasetId)}/analyze`)
      : await apiPost<any>('/analysis/run');

    return {
      status: text(result?.status ?? 'started'),
      job_id: result?.job_id,
      run_id: result?.run_id ?? result?.job_id,
      analysis_mode: result?.analysis_mode,
    };
  },

  async getFlexibleAnalysis(datasetId: string): Promise<any> {
    if (USE_MOCK) return null;
    return apiFetch<any>(`/flexible-dataset/${encodeURIComponent(datasetId)}/analysis`);
  },
};

export const datasetService = {
  async getInfo(): Promise<DatasetInfo> {
    if (USE_MOCK) return mock.mockDataset;

    const [meta, quality] = await Promise.all([
      apiFetch<any>('/dataset/meta'),
      apiFetch<any[]>('/dataset/quality'),
    ]);

    const dataset = mapDataset(meta);

    const fields = Array.isArray(quality)
      ? quality.map((q: any) => ({
        name: text(q.field ?? q.name),
        coverage: n(q.coverage),
        status:
          text(q.status).toLowerCase() === 'good'
            ? 'valid' as const
            : text(q.status).toLowerCase() === 'warning'
              ? 'warning' as const
              : 'invalid' as const,
      }))
      : [];

    return {
      ...dataset,
      fields,
    };
  },

  async upload(file: File): Promise<DatasetUploadResult> {
    if (USE_MOCK) {
      return mock.simulateDatasetUpload(file.name, file.size);
    }

    const form = new FormData();
    form.append('file', file);

    const result = await fetch(
      `${API_BASE}/flexible-dataset/upload`,
      {
        method: 'POST',
        headers: authHeaders(),
        body: form,
      }
    );

    if (!result.ok) {
      const body = await result.text().catch(() => '');
      throw new Error(
        `API ${result.status}: ${body.slice(0, 240) || result.statusText}`
      );
    }

    const raw = await result.json();

    return {
      success: raw.success !== false,
      filename: raw.filename ?? file.name,
      record_count: n(raw.record_count ?? raw.records),
      validation_state: raw.warnings?.length ? 'warning' : 'valid',
      error: raw.error,
      fields: Array.isArray(raw.available_canonical_fields)
        ? raw.available_canonical_fields.map((field: string) => ({
          name: field,
          coverage: 100,
          status: 'valid' as const,
        }))
        : [],
      dataset_id: raw.dataset_id,
      format: raw.format,
      analysis_mode: raw.analysis_mode,
      available_canonical_fields: raw.available_canonical_fields ?? [],
      missing_canonical_fields: raw.missing_canonical_fields ?? [],
      unmapped_columns: raw.unmapped_columns ?? [],
      warnings: raw.warnings ?? [],
    } as DatasetUploadResult;
  },
};

// ============================================================
// Cases / graph / transactions / search
// ============================================================
export const caseService = {
  async getAll(): Promise<Case[]> {
    if (USE_MOCK) return mock.mockCases;

    const raw = await apiFetch<any[]>('/cases');

    return (raw ?? []).map((x: any) => ({
      id: text(x.id),
      primary_entity: text(
        x.primaryEntity ?? x.primary_entity
      ),
      priority: priority(x.priority),
      status: text(x.status) as Case['status'],
      created: text(x.created),
      updated: text(x.updated),
      analyst: text(x.analyst),
      summary: text(
        x.summary ?? x.description ?? x.title
      ),
      evidence_count: Array.isArray(x.evidenceIds)
        ? x.evidenceIds.length
        : n(x.evidence_count),
      pattern_count: Array.isArray(x.patternIds)
        ? x.patternIds.length
        : n(x.pattern_count),
      related_entities: Array.isArray(x.relatedEntities)
        ? x.relatedEntities.map(String)
        : [],
    }));
  },

  async delete(caseId: string): Promise<void> {
  if (USE_MOCK) {
    const index = mock.mockCases.findIndex(
      (item) => item.id === caseId
    );

    if (index >= 0) {
      mock.mockCases.splice(index, 1);
    }

    return;
  }

  await apiFetch<void>(
    `/cases/${encodeURIComponent(caseId)}`,
    {
      method: 'DELETE',
    }
  );
},


  async create(payload: {
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }): Promise<Case> {
    if (USE_MOCK) {
      return {
        id: `CASE-${Date.now()}`,
        primary_entity: '',
        priority: payload.priority,
        status: 'open',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        analyst: 'Local Analyst',
        summary: payload.description || payload.title,
        evidence_count: 0,
        pattern_count: 0,
        related_entities: [],
      };
    }

    const raw = await apiPost<any>('/cases', payload);

    return {
      id: text(raw.id),
      primary_entity: text(
        raw.primaryEntity ?? raw.primary_entity
      ),
      priority: priority(raw.priority),
      status: text(raw.status) as Case['status'],
      created: text(raw.created),
      updated: text(raw.updated),
      analyst: text(raw.analyst),
      summary: text(
        raw.summary ?? raw.description ?? raw.title
      ),
      evidence_count: Array.isArray(raw.evidenceIds)
        ? raw.evidenceIds.length
        : n(raw.evidence_count),
      pattern_count: Array.isArray(raw.patternIds)
        ? raw.patternIds.length
        : n(raw.pattern_count),
      related_entities: Array.isArray(raw.relatedEntities)
        ? raw.relatedEntities.map(String)
        : [],
    };
  },

  /**
   * Create a persistent investigation case from an existing lead.
   * Goes through the shared API base so the path is always /api/v1.
   */
  async createFromLead(leadId: string): Promise<Case> {
    if (USE_MOCK) {
      return {
        id: `CASE-${Date.now()}`,
        primary_entity: '',
        priority: 'medium',
        status: 'open',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        analyst: 'Local Analyst',
        summary: `Investigation case created from lead ${leadId}`,
        evidence_count: 0,
        pattern_count: 0,
        related_entities: [],
      };
    }

    const raw = await apiPost<any>(
      `/cases/from-lead/${encodeURIComponent(leadId)}`
    );

    return {
      id: text(raw.id),
      primary_entity: text(
        raw.primaryEntity ?? raw.primary_entity
      ),
      priority: priority(raw.priority),
      status: text(raw.status) as Case['status'],
      created: text(raw.created),
      updated: text(raw.updated),
      analyst: text(raw.analyst),
      summary: text(
        raw.summary ?? raw.description ?? raw.title
      ),
      evidence_count: Array.isArray(raw.evidenceIds)
        ? raw.evidenceIds.length
        : n(raw.evidence_count),
      pattern_count: Array.isArray(raw.patternIds)
        ? raw.patternIds.length
        : n(raw.pattern_count),
      related_entities: Array.isArray(raw.relatedEntities)
        ? raw.relatedEntities.map(String)
        : [],
    };
  },

  async getDetails(id: string): Promise<any> {
    if (USE_MOCK) {
      const item = mock.mockCases.find(c => c.id === id);
      if (!item) throw new Error(`Case ${id} not found`);
      return item;
    }

    return apiFetch<any>(`/cases/${encodeURIComponent(id)}`);
  },
};

export const graphService = {
  async getData(): Promise<GraphData> {
    if (USE_MOCK) return mock.mockGraphData;
    const raw = await apiFetch<any>('/graph');
    return {
      nodes: (raw.nodes ?? []).map((x: any) => ({
        id: text(x.id),
        label: text(x.label ?? x.id),
        type:
          x.type === 'transaction' || x.type === 'ip'
            ? x.type
            : 'wallet',
        clusterId: x.clusterId ?? x.cluster_id,
        anomaly_score: x.anomalyScore ?? x.anomaly_score,
        x: x.x,
        y: x.y,
      })),
      edges: raw.edges ?? [],
    };
  },
};

export const transactionService = {
  async getFlows(): Promise<TransactionFlow[]> {
    if (USE_MOCK) return mock.mockTransactionFlows;

    const raw = await apiFetch<any[]>('/transactions/flow-patterns');
    const flows: TransactionFlow[] = [];

    /*
     * The backend returns flow PATTERNS. Each pattern contains `steps`, and
     * each step represents one input/output observation belonging to a TX.
     *
     * Do not turn every step into a separate TransactionFlow. Doing that
     * produces duplicate TX cards and empty 0-in / 0-out transactions.
     *
     * Instead, group steps by TXID and reconstruct the real transaction
     * inputs and outputs from the step direction.
     */
    for (const pattern of raw ?? []) {
      const steps = Array.isArray(pattern.steps) ? pattern.steps : [];

      // Some backend versions may already return transaction-level records.
      if (
        (pattern.txid || pattern.txId) &&
        (Array.isArray(pattern.inputs) || Array.isArray(pattern.outputs))
      ) {
        flows.push({
          txid: text(pattern.txid ?? pattern.txId ?? pattern.id),
          timestamp: text(pattern.timestamp),
          fee: n(pattern.fee),
          inputs: Array.isArray(pattern.inputs)
            ? pattern.inputs.map((i: any) => ({
              address: text(
                i.address ??
                i.walletId ??
                i.wallet_id ??
                i.walletLabel
              ),
              amount: n(i.amount),
            }))
            : [],
          outputs: Array.isArray(pattern.outputs)
            ? pattern.outputs.map((o: any) => ({
              address: text(
                o.address ??
                o.walletId ??
                o.wallet_id ??
                o.walletLabel
              ),
              amount: n(o.amount),
            }))
            : [],
          pattern: text(
            pattern.pattern_type ??
            pattern.patternType ??
            pattern.kind
          ),
        });

        continue;
      }

      // Backend pattern response: group all steps belonging to the same TX.
      const transactions = new Map<
        string,
        {
          timestamp: string;
          fee: number;
          inputs: { address: string; amount: number }[];
          outputs: { address: string; amount: number }[];
        }
      >();

      for (const step of steps) {
        const txid = text(step.txId ?? step.txid);
        if (!txid) continue;

        if (!transactions.has(txid)) {
          transactions.set(txid, {
            timestamp: text(step.timestamp ?? pattern.timestamp),
            fee: n(step.fee ?? pattern.fee),
            inputs: [],
            outputs: [],
          });
        }

        const tx = transactions.get(txid)!;

        const address = text(
          step.address ??
          step.walletId ??
          step.wallet_id ??
          step.walletLabel
        );

        if (!address) continue;

        const item = {
          address,
          amount: n(step.amount),
        };

        const direction = text(step.direction).toLowerCase();

        if (
          direction === 'input' ||
          direction === 'in' ||
          direction === 'source'
        ) {
          tx.inputs.push(item);
        } else if (
          direction === 'output' ||
          direction === 'out' ||
          direction === 'destination'
        ) {
          tx.outputs.push(item);
        } else {
          /*
           * Older backend pattern records can encode direction in the step ID
           * instead of a separate `direction` field.
           */
          const stepId = text(step.id).toLowerCase();

          if (stepId.includes(':in:') || stepId.endsWith(':in')) {
            tx.inputs.push(item);
          } else if (
            stepId.includes(':out:') ||
            stepId.endsWith(':out')
          ) {
            tx.outputs.push(item);
          } else if (Array.isArray(step.inputs)) {
            for (const input of step.inputs) {
              const inputAddress = text(
                input.address ??
                input.walletId ??
                input.wallet_id ??
                input.walletLabel
              );

              if (inputAddress) {
                tx.inputs.push({
                  address: inputAddress,
                  amount: n(input.amount),
                });
              }
            }
          } else if (Array.isArray(step.outputs)) {
            for (const output of step.outputs) {
              const outputAddress = text(
                output.address ??
                output.walletId ??
                output.wallet_id ??
                output.walletLabel
              );

              if (outputAddress) {
                tx.outputs.push({
                  address: outputAddress,
                  amount: n(output.amount),
                });
              }
            }
          }
        }
      }

      const patternType = text(
        pattern.pattern_type ??
        pattern.patternType ??
        pattern.kind
      );

      for (const [txid, tx] of transactions) {
        /*
         * Keep the transaction if it contains at least one real side of the
         * flow. Never manufacture an input/output or amount.
         */
        if (tx.inputs.length === 0 && tx.outputs.length === 0) continue;

        flows.push({
          txid,
          timestamp: tx.timestamp,
          fee: tx.fee,
          inputs: tx.inputs,
          outputs: tx.outputs,
          pattern: patternType,
        });
      }
    }

    return flows;
  },
};

export const searchService = {
  async search(query: string): Promise<SearchResult[]> {
    if (USE_MOCK) return mock.mockSearch(query);
    const raw = await apiFetch<any[]>(`/search?q=${encodeURIComponent(query)}`);
    return (raw ?? []).map((x: any) => ({
      type: x.type ?? 'entity', id: text(x.id), label: text(x.label ?? x.entityLabel ?? x.id),
      sublabel: text(x.sublabel ?? x.description ?? ''),
    }));
  },
};