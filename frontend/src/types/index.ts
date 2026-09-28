// Core entity types
export interface Entity {
  id: string;
  address: string;
  type: 'wallet' | 'ip' | 'transaction' | 'cluster';
  first_seen: string;
  last_seen: string;
  tx_count: number;
  total_volume: number;
  anomaly_score: number;
  priority: 'high' | 'medium' | 'low';
  cluster_id?: string;
  countries?: string[];
  asns?: string[];
  observed_ips?: string[];
  tags?: string[];
}

export interface InvestigationLead {
  id: string;
  rank: number;
  entity_id: string;
  entity_address: string;
  entity_type: string;
  priority: 'high' | 'medium' | 'low';
  anomaly_score: number;
  evidence_channels: string[];
  cluster_id?: number;
  last_activity: string;
  pattern_matches?: string[];
  description?: string;
}

export interface Cluster {
  id: string;
  name: string;
  wallet_count: number;
  ip_count: number;
  countries: string[];
  total_volume: number;
  avg_anomaly: number;
  behavioral_tags: string[];
  wallets: string[];
  ips: string[];
}

export interface TransactionFlow {
  txid: string;
  timestamp: string;
  fee: number;
  inputs: { address: string; amount: number }[];
  outputs: { address: string; amount: number }[];
  pattern?: string;
}

export interface Pattern {
  id: string;
  type: 'peeling' | 'mixing' | 'fan_out' | 'fan_in' | 'chain' | 'repeated-fanout';
  confidence: number;
  score: number;
  observations: number;
  transactions: number;
  wallets: number;
  time_window: string;
  description: string;
  entities: string[];
  // repeated-fanout specific fields
  repeated_tx_count?: number;
  output_set_reuse?: number;
  median_gap?: number;
  observation_span?: string;
  output_similarity?: number;
  value_conservation?: number;
  pattern_steps?: PatternStep[];
}

export interface PatternStep {
  txid: string;
  timestamp: string;
  source: string;
  outputs: string[];
  amount: number;
}

export interface AnalysisStage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  progress: number;
  description: string;
  metrics?: Record<string, number | string>;
}

export interface AnalysisStatus {
  status: 'not_run' | 'running' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  stages: AnalysisStage[];
  error?: string;
}

export interface DatasetInfo {
  filename: string;
  format: string;
  size: string;
  record_count: number;
  date_range: { start: string; end: string };
  validation_state: 'valid' | 'warning' | 'invalid';
  fields: { name: string; coverage: number; status: 'valid' | 'warning' | 'invalid' }[];
}

export interface DatasetUploadResult {
  success: boolean;
  filename?: string;
  record_count?: number;
  validation_state?: 'valid' | 'warning' | 'invalid';
  error?: string;
  fields?: { name: string; coverage: number; status: 'valid' | 'warning' | 'invalid' }[];
}

export interface Case {
  id: string;
  primary_entity: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved' | 'archived';
  created: string;
  updated: string;
  analyst: string;
  summary: string;
  evidence_count: number;
  pattern_count: number;
  related_entities: string[];
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'wallet' | 'transaction' | 'ip' | 'cluster';
  clusterId?: string;
  anomaly_score?: number;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  weight?: number;
}

export interface GraphStatistics {
  nodes: number;
  edges: number;
  wallets: number;
  transactions: number;
  ips: number;
  clusters: number;
}

export interface SystemStatus {
  engine_online: boolean;
  analysis_complete: boolean;
  dataset_loaded: boolean;
  dataset_name: string;
  total_observations: number;
  total_entities: number;
  total_leads: number;
}

export interface DashboardStats {
  transactions: number;
  wallets: number;
  ip_observations: number;
  clusters: number;
  leads: number;
  high_priority: number;
  medium_priority: number;
  low_priority: number;
}

export interface DashboardTimeline {
  timestamp: string;
  observations: number;
  anomalies: number;
}

export interface DashboardGeo {
  country: string;
  count: number;
  percentage: number;
}

export interface EntityEvidence {
  channel: string;
  score: number;
  indicators: string[];
}

export interface EntityFinding {
  id: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  evidence: string[];
}

export interface EntityTimelineEntry {
  txid: string;
  timestamp: string;
  direction: 'in' | 'out';
  amount: number;
  related_entity: string;
  fee: number;
}

export interface SearchResult {
  type: 'entity' | 'lead' | 'transaction' | 'ip' | 'cluster' | 'pattern';
  id: string;
  label: string;
  sublabel: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version?: string;
  uptime?: number;
}
