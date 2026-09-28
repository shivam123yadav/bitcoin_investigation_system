/**
 * Mock backend simulation for development/demo mode.
 * All data is deterministic - no Math.random().
 * Simulates FastAPI backend endpoints.
 */
import type {
  Entity, InvestigationLead, Cluster, TransactionFlow, Pattern,
  AnalysisStage, DatasetInfo, Case, GraphData, SystemStatus, DashboardStats,
  DashboardTimeline, DashboardGeo, EntityEvidence, EntityFinding,
  EntityTimelineEntry, GraphStatistics, SearchResult, HealthStatus,
  AnalysisStatus, PatternStep, DatasetUploadResult
} from '../types';

// Deterministic seed-based pseudo-random for consistent mock data
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rng = seededRandom(42);

// Helper to generate deterministic addresses
function detAddress(prefix: string, index: number, length = 14): string {
  const chars = '0123456789abcdef';
  let result = prefix;
  let seed = index * 7919 + 104729;
  for (let i = 0; i < length; i++) {
    seed = (seed * 16807) % 2147483647;
    result += chars[seed % 16];
  }
  return result;
}

function detIP(index: number): string {
  const a = ((index * 37 + 45) % 255);
  const b = ((index * 73 + 12) % 255);
  const c = ((index * 113 + 88) % 255);
  const d = ((index * 53 + 200) % 255);
  return `${a}.${b}.${c}.${d}`;
}

const COUNTRIES = ['US', 'DE', 'RU', 'CN', 'NL', 'SG', 'GB', 'FR', 'JP', 'BR'];
const TAGS = ['high_volume', 'rapid_turnover', 'multi_jurisdiction', 'temporal_cluster', 'high_flow'];

// --- System Status ---
export const mockSystemStatus: SystemStatus = {
  engine_online: true,
  analysis_complete: true,
  dataset_loaded: true,
  dataset_name: 'synthetic_traffic_v1.0.0.csv',
  total_observations: 48000,
  total_entities: 14513,
  total_leads: 150,
};

// --- Health ---
export const mockHealth: HealthStatus = {
  status: 'healthy',
  version: '1.0.0',
  uptime: 86400,
};

// --- Dashboard ---
export const mockDashboardStats: DashboardStats = {
  transactions: 12847,
  wallets: 8934,
  ip_observations: 48000,
  clusters: 8,
  leads: 150,
  high_priority: 23,
  medium_priority: 67,
  low_priority: 60,
};

export const mockDashboardTimeline: DashboardTimeline[] = Array.from({ length: 24 }, (_, i) => ({
  timestamp: `2024-03-22T${String(i).padStart(2, '0')}:00:00Z`,
  observations: Math.floor(800 + Math.sin(i * 0.5) * 400 + i * 60),
  anomalies: Math.floor(40 + Math.sin(i * 0.3) * 20 + i * 5),
}));

export const mockDashboardGeo: DashboardGeo[] = [
  { country: 'US', count: 12400, percentage: 25.8 },
  { country: 'DE', count: 8200, percentage: 17.1 },
  { country: 'RU', count: 6800, percentage: 14.2 },
  { country: 'CN', count: 5400, percentage: 11.3 },
  { country: 'NL', count: 4100, percentage: 8.5 },
  { country: 'SG', count: 3200, percentage: 6.7 },
  { country: 'GB', count: 2800, percentage: 5.8 },
  { country: 'FR', count: 2400, percentage: 5.0 },
  { country: 'JP', count: 1500, percentage: 3.1 },
  { country: 'BR', count: 1200, percentage: 2.5 },
];

// --- Leads ---
export const mockLeads: InvestigationLead[] = Array.from({ length: 30 }, (_, i) => ({
  id: `lead-${i + 1}`,
  rank: i + 1,
  entity_id: `entity-${i + 1}`,
  entity_address: detAddress('bc1q', i + 1, 20),
  entity_type: 'wallet',
  priority: i < 5 ? 'high' as const : i < 15 ? 'medium' as const : 'low' as const,
  anomaly_score: Math.round((0.95 - i * 0.02 + (i % 5) * 0.01) * 100) / 100,
  evidence_channels: ['ml', 'temporal', 'network', 'graph', 'pattern'].slice(0, (i % 4) + 1),
  cluster_id: Math.floor(i / 4) + 1,
  last_activity: new Date(Date.now() - (i + 1) * 86400000 * 2).toISOString(),
  pattern_matches: i < 10 ? ['fan_out', 'peeling'].slice(0, (i % 2) + 1) : undefined,
}));

// --- Entities ---
export const mockEntities: Entity[] = Array.from({ length: 50 }, (_, i) => ({
  id: `entity-${i + 1}`,
  address: detAddress('bc1q', i + 100, 20),
  type: (i < 35 ? 'wallet' : i < 45 ? 'ip' : 'transaction') as Entity['type'],
  first_seen: new Date(Date.now() - (i + 10) * 86400000 * 3).toISOString(),
  last_seen: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
  tx_count: Math.floor(50 + (i * 37) % 450),
  total_volume: Math.round(((i * 1.7 + 0.5) % 50) * 100) / 100,
  anomaly_score: Math.round((0.1 + (i * 0.016) % 0.8) * 100) / 100,
  priority: (i < 10 ? 'high' : i < 25 ? 'medium' : 'low') as Entity['priority'],
  cluster_id: Math.floor(i / 7) + 1,
  countries: COUNTRIES.slice(0, (i % 3) + 1),
  observed_ips: Array.from({ length: (i % 4) + 1 }, (_, j) => detIP(i * 10 + j)),
  tags: TAGS.slice(0, (i % 3) + 1),
}));

// --- Entity Evidence ---
export function mockEntityEvidence(entityId: string): EntityEvidence[] {
  const idx = parseInt(entityId.split('-')[1]) || 1;
  return [
    { channel: 'ml', score: Math.round((0.7 + (idx % 30) * 0.01) * 100) / 100, indicators: ['anomaly_score_high', 'feature_deviation'] },
    { channel: 'temporal', score: Math.round((0.5 + (idx % 20) * 0.02) * 100) / 100, indicators: ['rapid_turnover', 'off_hours_activity'] },
    { channel: 'network', score: Math.round((0.4 + (idx % 15) * 0.03) * 100) / 100, indicators: ['multi_ip', 'tor_exit_node'] },
    { channel: 'graph', score: Math.round((0.3 + (idx % 25) * 0.025) * 100) / 100, indicators: ['hub_connectivity', 'short_path_to_risk'] },
    { channel: 'pattern', score: Math.round((0.2 + (idx % 10) * 0.05) * 100) / 100, indicators: ['fan_out_match', 'peeling_candidate'] },
  ];
}

// --- Entity Findings ---
export function mockEntityFindings(entityId: string): EntityFinding[] {
  const idx = parseInt(entityId.split('-')[1]) || 1;
  const findings: EntityFinding[] = [
    {
      id: `f-${entityId}-1`,
      type: 'anomaly',
      severity: idx % 3 === 0 ? 'high' : 'medium',
      description: 'ML anomaly score exceeds threshold. Entity exhibits statistical deviation from normal transaction patterns.',
      evidence: ['anomaly_score', 'feature_vector'],
    },
  ];
  if (idx % 2 === 0) {
    findings.push({
      id: `f-${entityId}-2`,
      type: 'temporal',
      severity: 'medium',
      description: 'Transaction timing shows rapid turnover pattern inconsistent with typical holding behavior.',
      evidence: ['avg_hold_time', 'turnover_rate'],
    });
  }
  if (idx % 4 === 0) {
    findings.push({
      id: `f-${entityId}-3`,
      type: 'network',
      severity: idx % 3 === 0 ? 'high' : 'low',
      description: 'Entity observed from multiple geographic regions via distinct IP addresses.',
      evidence: ['ip_diversity', 'geo_spread'],
    });
  }
  return findings;
}

// --- Entity Timeline ---
export function mockEntityTimeline(entityId: string): EntityTimelineEntry[] {
  const idx = parseInt(entityId.split('-')[1]) || 1;
  return Array.from({ length: 8 }, (_, i) => ({
    txid: detAddress('tx:', idx * 100 + i, 12),
    timestamp: new Date(Date.now() - (i + 1) * 86400000 * 2).toISOString(),
    direction: (i % 3 === 0 ? 'in' : 'out') as 'in' | 'out',
    amount: Math.round(((idx * 0.3 + i * 0.7) % 5) * 10000) / 10000,
    related_entity: detAddress('bc1q', idx * 50 + i, 16),
    fee: Math.round((0.0001 + (i % 5) * 0.00002) * 100000) / 100000,
  }));
}

// --- Clusters ---
const CLUSTER_TAGS = [
  ['high_volume', 'rapid_turnover'],
  ['mixing_behavior', 'temporal_cluster'],
  ['peeling_chain', 'multi_jurisdiction'],
  ['fan_out_pattern', 'high_flow'],
  ['temporal_clustering', 'high_volume'],
  ['multi_jurisdiction', 'rapid_turnover'],
  ['high_flow', 'high_volume'],
  ['network_anomaly', 'multi_ip'],
];

export const mockClusters: Cluster[] = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  name: `Cluster ${String.fromCharCode(65 + i)}`,
  wallet_count: 50 + (i * 37) % 200,
  ip_count: 5 + (i * 13) % 30,
  countries: COUNTRIES.slice(0, (i % 3) + 1),
  total_volume: Math.round(((i * 12.5 + 10) % 100) * 100) / 100,
  avg_anomaly: Math.round((0.3 + (i * 0.06) % 0.5) * 100) / 100,
  behavioral_tags: CLUSTER_TAGS[i] || ['unclassified'],
  wallets: Array.from({ length: 5 }, (_, j) => detAddress('bc1q', (i + 1) * 100 + j, 14)),
  ips: Array.from({ length: 3 }, (_, j) => detIP((i + 1) * 30 + j)),
}));

// --- Patterns ---
const repeatedFanoutSteps: PatternStep[] = Array.from({ length: 6 }, (_, i) => ({
  txid: detAddress('tx:', 900 + i, 12),
  timestamp: new Date(Date.now() - (6 - i) * 3600000 * 4).toISOString(),
  source: detAddress('bc1q', 500, 16),
  outputs: Array.from({ length: 4 }, (_, j) => detAddress('bc1q', 600 + j, 16)),
  amount: Math.round((0.5 + i * 0.05) * 10000) / 10000,
}));

export const mockPatterns: Pattern[] = [
  {
    id: 'p1', type: 'repeated-fanout', confidence: 0.92, score: 0.88,
    observations: 156, transactions: 48, wallets: 12, time_window: '72h',
    description: 'Repeated fan-out pattern: single source distributing to multiple outputs with similar values across repeated transactions.',
    entities: [detAddress('bc1q', 500, 16), detAddress('bc1q', 600, 16)],
    repeated_tx_count: 48,
    output_set_reuse: 0.87,
    median_gap: 14400,
    observation_span: '72h',
    output_similarity: 0.91,
    value_conservation: 0.98,
    pattern_steps: repeatedFanoutSteps,
  },
  {
    id: 'p2', type: 'peeling', confidence: 0.87, score: 0.82,
    observations: 89, transactions: 34, wallets: 8, time_window: '168h',
    description: 'Candidate peeling chain: sequential transactions removing small amounts from a large balance.',
    entities: [detAddress('bc1q', 700, 16), detAddress('bc1q', 701, 16)],
  },
  {
    id: 'p3', type: 'mixing', confidence: 0.78, score: 0.75,
    observations: 67, transactions: 28, wallets: 15, time_window: '48h',
    description: 'Candidate mixing behavior: multiple inputs consolidating and redistributing through common intermediaries.',
    entities: [detAddress('bc1q', 800, 16), detAddress('bc1q', 801, 16)],
  },
  {
    id: 'p4', type: 'fan_in', confidence: 0.71, score: 0.68,
    observations: 45, transactions: 18, wallets: 9, time_window: '24h',
    description: 'Fan-in candidate: multiple sources consolidating into single destination.',
    entities: [detAddress('bc1q', 900, 16), detAddress('bc1q', 901, 16)],
  },
  {
    id: 'p5', type: 'chain', confidence: 0.65, score: 0.61,
    observations: 34, transactions: 22, wallets: 6, time_window: '96h',
    description: 'Transaction chain candidate: sequential wallet-to-wallet transfers.',
    entities: [detAddress('bc1q', 1000, 16), detAddress('bc1q', 1001, 16)],
  },
];

// --- Analysis ---
export const mockAnalysisStages: AnalysisStage[] = [
  { id: 'ingestion', name: 'Ingestion & Validation', status: 'complete', progress: 100, description: 'Network observations parsed and validated', metrics: { observations: 48000, valid: 47856, rejected: 144 } },
  { id: 'features', name: 'Feature Engineering', status: 'complete', progress: 100, description: 'Entity features extracted from observations', metrics: { wallet_features: 10713, ip_features: 3800, temporal_features: 8934 } },
  { id: 'anomaly', name: 'Anomaly Detection', status: 'complete', progress: 100, description: 'ML models scored all entities', metrics: { entities_scored: 14513, anomalies_flagged: 1247 } },
  { id: 'clustering', name: 'Entity Clustering', status: 'complete', progress: 100, description: 'Behavioral clusters identified', metrics: { clusters: 8, silhouette_score: 0.72 } },
  { id: 'patterns', name: 'Pattern Detection', status: 'complete', progress: 100, description: 'Behavioral patterns matched', metrics: { patterns_detected: 24, candidate_patterns: 18 } },
  { id: 'leads', name: 'Lead Generation', status: 'complete', progress: 100, description: 'Investigation leads prioritized', metrics: { total_leads: 150, high_priority: 23, medium_priority: 67 } },
];

export const mockAnalysisStatus: AnalysisStatus = {
  status: 'completed',
  started_at: '2024-03-22T10:00:00Z',
  completed_at: '2024-03-22T10:45:00Z',
  stages: mockAnalysisStages,
};

// --- Dataset ---
export const mockDataset: DatasetInfo = {
  filename: 'synthetic_traffic_v1.0.0.csv',
  format: 'CSV',
  size: '284 MB',
  record_count: 48000,
  date_range: { start: '2024-01-15', end: '2024-03-22' },
  validation_state: 'valid',
  fields: [
    { name: 'timestamp', coverage: 100, status: 'valid' },
    { name: 'src_ip', coverage: 99.8, status: 'valid' },
    { name: 'dst_ip', coverage: 99.7, status: 'valid' },
    { name: 'src_port', coverage: 100, status: 'valid' },
    { name: 'dst_port', coverage: 100, status: 'valid' },
    { name: 'txid', coverage: 98.2, status: 'valid' },
    { name: 'input_addresses', coverage: 96.5, status: 'valid' },
    { name: 'output_addresses', coverage: 96.1, status: 'valid' },
    { name: 'input_amounts', coverage: 95.8, status: 'valid' },
    { name: 'output_amounts', coverage: 95.4, status: 'valid' },
    { name: 'geo_country', coverage: 87.3, status: 'warning' },
    { name: 'asn', coverage: 82.1, status: 'warning' },
    { name: 'fee', coverage: 94.2, status: 'valid' },
    { name: 'script_type', coverage: 91.7, status: 'valid' },
  ],
};

// --- Cases ---
export const mockCases: Case[] = [
  { id: 'CASE-001', primary_entity: 'bc1q7x2...f4a9', priority: 'high', status: 'in_progress', created: '2024-03-10T08:00:00Z', updated: '2024-03-22T14:30:00Z', analyst: 'Analyst-1', summary: 'High-volume wallet with mixing indicators and multi-jurisdiction IP spread', evidence_count: 12, pattern_count: 3, related_entities: ['bc1q8y3...g5b0', 'bc1q9z4...h6c1'] },
  { id: 'CASE-002', primary_entity: 'bc1q3m5...d2e7', priority: 'high', status: 'open', created: '2024-03-15T10:00:00Z', updated: '2024-03-21T09:15:00Z', analyst: 'Analyst-2', summary: 'Peeling-chain candidate with elevated temporal and graph signals', evidence_count: 8, pattern_count: 2, related_entities: ['bc1q4n6...e3f8'] },
  { id: 'CASE-003', primary_entity: '192.168.45.12', priority: 'medium', status: 'in_progress', created: '2024-03-12T14:00:00Z', updated: '2024-03-20T16:45:00Z', analyst: 'Analyst-1', summary: 'IP address correlated with multiple high-anomaly wallets', evidence_count: 6, pattern_count: 1, related_entities: ['bc1q5o7...f4g9', 'bc1q6p8...g5h0'] },
  { id: 'CASE-004', primary_entity: 'bc1q2r4...c1d6', priority: 'medium', status: 'resolved', created: '2024-03-08T09:00:00Z', updated: '2024-03-19T11:00:00Z', analyst: 'Analyst-3', summary: 'Fan-out pattern consistent with high-flow hub behavior', evidence_count: 15, pattern_count: 4, related_entities: [] },
];

// --- Graph ---
export const mockGraphData: GraphData = {
  nodes: [
    { id: 'w1', label: detAddress('bc1q', 1, 12), type: 'wallet', anomaly_score: 0.92 },
    { id: 'w2', label: detAddress('bc1q', 2, 12), type: 'wallet', anomaly_score: 0.78 },
    { id: 'w3', label: detAddress('bc1q', 3, 12), type: 'wallet', anomaly_score: 0.65 },
    { id: 'w4', label: detAddress('bc1q', 4, 12), type: 'wallet', anomaly_score: 0.88 },
    { id: 'w5', label: detAddress('bc1q', 5, 12), type: 'wallet', anomaly_score: 0.54 },
    { id: 'w6', label: detAddress('bc1q', 6, 12), type: 'wallet', anomaly_score: 0.71 },
    { id: 't1', label: 'tx:a4f2...8b1c', type: 'transaction', anomaly_score: 0.82 },
    { id: 't2', label: 'tx:b5g3...9c2d', type: 'transaction', anomaly_score: 0.67 },
    { id: 't3', label: 'tx:c6h4...0d3e', type: 'transaction', anomaly_score: 0.59 },
    { id: 't4', label: 'tx:d7i5...1e4f', type: 'transaction', anomaly_score: 0.73 },
    { id: 'ip1', label: '45.33.12.88', type: 'ip', anomaly_score: 0.85 },
    { id: 'ip2', label: '185.220.101.4', type: 'ip', anomaly_score: 0.79 },
    { id: 'ip3', label: '91.219.236.12', type: 'ip', anomaly_score: 0.62 },
    { id: 'c1', label: 'Cluster A', type: 'cluster', anomaly_score: 0.81 },
    { id: 'c2', label: 'Cluster B', type: 'cluster', anomaly_score: 0.69 },
  ],
  edges: [
    { source: 'w1', target: 't1', type: 'input', weight: 0.9 },
    { source: 't1', target: 'w2', type: 'output', weight: 0.8 },
    { source: 't1', target: 'w3', type: 'output', weight: 0.7 },
    { source: 'w2', target: 't2', type: 'input', weight: 0.6 },
    { source: 't2', target: 'w4', type: 'output', weight: 0.8 },
    { source: 'w4', target: 't3', type: 'input', weight: 0.5 },
    { source: 't3', target: 'w5', type: 'output', weight: 0.6 },
    { source: 't3', target: 'w6', type: 'output', weight: 0.4 },
    { source: 'w1', target: 'ip1', type: 'observed_at', weight: 0.9 },
    { source: 'w2', target: 'ip2', type: 'observed_at', weight: 0.7 },
    { source: 'w4', target: 'ip3', type: 'observed_at', weight: 0.6 },
    { source: 'w1', target: 'c1', type: 'member_of', weight: 0.8 },
    { source: 'w2', target: 'c1', type: 'member_of', weight: 0.7 },
    { source: 'w4', target: 'c2', type: 'member_of', weight: 0.6 },
    { source: 'w5', target: 'c2', type: 'member_of', weight: 0.5 },
    { source: 'w3', target: 't4', type: 'input', weight: 0.5 },
    { source: 't4', target: 'w6', type: 'output', weight: 0.6 },
  ],
};

export const mockGraphStatistics: GraphStatistics = {
  nodes: 15,
  edges: 17,
  wallets: 6,
  transactions: 4,
  ips: 3,
  clusters: 2,
};

// --- Transaction Flows ---
export const mockTransactionFlows: TransactionFlow[] = [
  {
    txid: 'a4f2c8b1d9e3f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4',
    timestamp: '2024-03-20T14:23:45Z',
    fee: 0.00012,
    inputs: [{ address: detAddress('bc1q', 1, 16), amount: 2.5 }],
    outputs: [
      { address: detAddress('bc1q', 2, 16), amount: 1.8 },
      { address: detAddress('bc1q', 3, 16), amount: 0.69988 },
    ],
    pattern: 'fan_out',
  },
  {
    txid: 'b5g3d9c2e0f4a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6',
    timestamp: '2024-03-20T14:45:12Z',
    fee: 0.00008,
    inputs: [{ address: detAddress('bc1q', 2, 16), amount: 1.8 }],
    outputs: [{ address: detAddress('bc1q', 4, 16), amount: 1.79992 }],
    pattern: 'peeling',
  },
  {
    txid: 'c6h4e0d3f1a5b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7',
    timestamp: '2024-03-20T15:02:33Z',
    fee: 0.00015,
    inputs: [
      { address: detAddress('bc1q', 4, 16), amount: 1.0 },
      { address: detAddress('bc1q', 5, 16), amount: 0.8 },
    ],
    outputs: [
      { address: detAddress('bc1q', 6, 16), amount: 0.9 },
      { address: detAddress('bc1q', 7, 16), amount: 0.75 },
      { address: detAddress('bc1q', 1, 16), amount: 0.14985 },
    ],
    pattern: 'mixing',
  },
];

// --- Search ---
export function mockSearch(query: string): SearchResult[] {
  const q = query.toLowerCase();
  const results: SearchResult[] = [];
  
  mockEntities.forEach(e => {
    if (e.address.toLowerCase().includes(q) || e.id.includes(q)) {
      results.push({ type: 'entity', id: e.id, label: e.address, sublabel: e.type });
    }
  });
  
  mockLeads.forEach(l => {
    if (l.entity_address.toLowerCase().includes(q) || l.id.includes(q)) {
      results.push({ type: 'lead', id: l.id, label: l.entity_address, sublabel: `Lead #${l.rank}` });
    }
  });

  mockPatterns.forEach(p => {
    if (p.type.includes(q) || p.id.includes(q)) {
      results.push({ type: 'pattern', id: p.id, label: p.type, sublabel: `Score: ${p.score}` });
    }
  });

  return results.slice(0, 20);
}

// --- Dataset Upload Simulation ---
export function simulateDatasetUpload(filename: string, fileSize: number): Promise<DatasetUploadResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const ext = filename.split('.').pop()?.toLowerCase();
      
      if (!ext || ext !== 'csv') {
        resolve({ success: false, error: `Unsupported file format: .${ext}. Supported format: CSV` });
        return;
      }
      
      if (fileSize === 0) {
        resolve({ success: false, error: 'Uploaded file is empty.' });
        return;
      }
      
      if (fileSize > 500 * 1024 * 1024) {
        resolve({ success: false, error: 'File exceeds maximum size of 500 MB.' });
        return;
      }

      // Simulate successful validation
      resolve({
        success: true,
        filename,
        record_count: Math.floor(fileSize / 6000),
        validation_state: 'valid',
        fields: mockDataset.fields,
      });
    }, 1500);
  });
}
