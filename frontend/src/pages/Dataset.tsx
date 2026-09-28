import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Upload, FileText, Calendar, HardDrive, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { GlassPanel, SectionHeader, ValidationBadge, ProgressBar, LoadingState, ErrorState, CommandButton } from '../components/ui';
import { datasetService, analysisService } from '../services';
import type { DatasetInfo, DatasetUploadResult } from '../types';

type UploadState = 'idle' | 'dragging' | 'uploading' | 'validating' | 'success' | 'error';

export default function Dataset() {
  const navigate = useNavigate();
  const [dataset, setDataset] = useState<DatasetInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadResult, setUploadResult] = useState<DatasetUploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDataset = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await datasetService.getInfo();
      setDataset(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dataset information.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDataset(); }, [loadDataset]);

  const handleFile = async (file: File) => {
    if (!file) return;

    // Client-side validation
    const ext = file.name.split('.').pop()?.toLowerCase();
    const supportedFormats = ['csv', 'json', 'xml'];

    if (!ext || !supportedFormats.includes(ext)) {
      setUploadState('error');
      setUploadError(`Unsupported format: .${ext}. Supported: CSV, JSON, XML`);
      return;
    }

    if (file.size === 0) {
      setUploadState('error');
      setUploadError('File is empty.');
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setUploadState('error');
      setUploadError('File exceeds 500 MB limit.');
      return;
    }

    setUploadState('uploading');
    setUploadError(null);
    setUploadResult(null);

    try {
      setUploadState('validating');
      const result = await datasetService.upload(file);

      if (result.success) {
        setUploadResult(result);
        setUploadState('success');
        await loadDataset();
      } else {
        setUploadState('error');
        setUploadError(result.error || 'Upload failed validation.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setUploadState('error');
      setUploadError(message);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState('idle');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState('dragging');
  }, []);

  const handleDragLeave = useCallback(() => {
    setUploadState('idle');
  }, []);

  const handleRunAnalysis = async () => {
    if (!uploadResult?.dataset_id) {
      setUploadError('No uploaded dataset ID is available. Please upload the dataset again.');
      setUploadState('error');
      return;
    }

    setUploadState('validating');
    setUploadError(null);

    try {
      const run = await analysisService.trigger(uploadResult.dataset_id);
      localStorage.setItem('activeFlexibleDatasetId', uploadResult.dataset_id);
      localStorage.setItem('activeFlexibleAnalysisRunId', run.run_id ?? '');
      navigate('/analysis');
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Failed to start analysis');
      setUploadState('error');
    }
  };

  if (loading) return <LoadingState message="Loading dataset information..." />;
  if (error) return <ErrorState message={error} onRetry={loadDataset} />;
  if (!dataset) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">Dataset Inspector</h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">Upload, validate, and inspect Bitcoin network metadata</p>
      </div>

      {/* Upload Area */}
      <GlassPanel className="p-6">
        <SectionHeader title="Dataset Ingestion" subtitle="Upload Bitcoin network / blockchain metadata" icon={Upload} />

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`mt-4 border-2 border-dashed rounded-lg p-8 text-center transition-all ${uploadState === 'dragging'
            ? 'border-cyan-400 bg-cyan-500/5'
            : uploadState === 'uploading' || uploadState === 'validating'
              ? 'border-cyan-500/30 bg-[var(--color-bg-tertiary)]'
              : uploadState === 'success'
                ? 'border-green-500/30 bg-green-500/5'
                : uploadState === 'error'
                  ? 'border-red-500/30 bg-red-500/5'
                  : 'border-[var(--color-border-subtle)] hover:border-[var(--color-border-active)]'
            }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.xml"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          {uploadState === 'idle' || uploadState === 'dragging' ? (
            <>
              <Upload size={32} className="mx-auto text-[var(--color-text-muted)] mb-3" />
              <p className="text-sm text-[var(--color-text-secondary)] mb-2">
                {uploadState === 'dragging' ? 'Drop file here' : 'Drag and drop your dataset file'}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mb-4">or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-medium hover:bg-cyan-500/20 transition-all"
              >
                Select Dataset
              </button>
              <p className="text-[10px] text-[var(--color-text-muted)] mt-4">
                Supported: CSV • JSON • XML • Max: 500 MB
              </p>
            </>
          ) : uploadState === 'uploading' ? (
            <>
              <Loader2 size={32} className="mx-auto text-cyan-400 animate-spin mb-3" />
              <p className="text-sm text-cyan-400">Uploading dataset...</p>
              <div className="mt-4 max-w-xs mx-auto">
                <ProgressBar value={0} color="cyan" />
              </div>
            </>
          ) : uploadState === 'validating' ? (
            <>
              <Loader2 size={32} className="mx-auto text-cyan-400 animate-spin mb-3" />
              <p className="text-sm text-cyan-400">Validating dataset...</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-2">Checking schema and data integrity</p>
            </>
          ) : uploadState === 'success' ? (
            <>
              <CheckCircle2 size={32} className="mx-auto text-green-400 mb-3" />
              <p className="text-sm text-green-400 font-medium">Upload Complete</p>
              {uploadResult && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    <span className="text-[var(--color-text-muted)]">File:</span> {uploadResult.filename}
                  </p>
                  {uploadResult.record_count && (
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      <span className="text-[var(--color-text-muted)]">Records:</span> {uploadResult.record_count.toLocaleString()}
                    </p>
                  )}
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    <span className="text-[var(--color-text-muted)]">Validation:</span>{' '}
                    <ValidationBadge status={uploadResult.validation_state || 'valid'} />
                  </p>
                  {((uploadResult as DatasetUploadResult & { analysis_mode?: string }).analysis_mode) && (
                    <div className="mt-4 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20 text-left">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                        Detected Analysis Mode
                      </p>

                      <p className="text-sm font-semibold text-cyan-400 mt-1">
                        {((uploadResult as DatasetUploadResult & { analysis_mode?: string }).analysis_mode ?? '')
                          .replace(/_/g, ' ')
                          .toUpperCase()}
                      </p>
                    </div>
                  )}
                  <div className="pt-3">
                    <CommandButton variant="primary" onClick={handleRunAnalysis}>
                      Run Analysis
                    </CommandButton>
                  </div>
                </div>
              )}
              {(uploadResult as DatasetUploadResult & { missing_canonical_fields?: string[] }).missing_canonical_fields?.length ? (
                  <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-left">
                    <p className="text-[10px] uppercase tracking-wider text-amber-400">
                      Missing Canonical Fields
                    </p>

                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                      {(uploadResult as DatasetUploadResult & { missing_canonical_fields?: string[] }).missing_canonical_fields!.join(', ')}
                    </p>
                  </div>
                ) : null}

              {(uploadResult as (DatasetUploadResult & { warnings?: string[] }) | null)?.warnings &&
                (uploadResult as DatasetUploadResult & { warnings?: string[] }).warnings!.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-left">
                    <p className="text-[10px] uppercase tracking-wider text-amber-400">
                      Ingestion Warnings
                    </p>

                    <ul className="mt-1 space-y-1">
                      {(uploadResult as DatasetUploadResult & { warnings?: string[] }).warnings?.map((warning, index) => (
                        <li
                          key={index}
                          className="text-xs text-[var(--color-text-secondary)]"
                        >
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </>
          ) : uploadState === 'error' ? (
            <>
              <XCircle size={32} className="mx-auto text-red-400 mb-3" />
              <p className="text-sm text-red-400 font-medium">Upload Failed</p>
              {uploadError && <p className="text-xs text-[var(--color-text-muted)] mt-2">{uploadError}</p>}
              <div className="mt-4">
                <CommandButton onClick={() => { setUploadState('idle'); setUploadError(null); }}>
                  Try Again
                </CommandButton>
              </div>
            </>
          ) : null}
        </div>
      </GlassPanel>

      {/* Active Dataset */}
      <GlassPanel className="p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="Active Dataset" subtitle="Currently loaded dataset" icon={Database} />
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-green-500/10 border border-green-500/20">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-[10px] text-green-400 font-medium">ACTIVE</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10"><FileText size={16} className="text-cyan-400" /></div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Filename</p>
              <p className="text-xs font-mono text-[var(--color-text-primary)] truncate">{dataset.filename}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10"><Database size={16} className="text-violet-400" /></div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Format</p>
              <p className="text-xs font-mono text-[var(--color-text-primary)]">{dataset.format}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><HardDrive size={16} className="text-amber-400" /></div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Size</p>
              <p className="text-xs font-mono text-[var(--color-text-primary)]">{dataset.size}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10"><Calendar size={16} className="text-green-400" /></div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">Date Range</p>
              <p className="text-xs font-mono text-[var(--color-text-primary)]">{dataset.date_range.start} → {dataset.date_range.end}</p>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Record Count & Validation */}
      <div className="grid grid-cols-3 gap-4">
        <GlassPanel className="p-5">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Total Records</p>
          <p className="text-3xl font-bold tabular-nums text-cyan-400">{dataset.record_count.toLocaleString()}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">observations ingested</p>
        </GlassPanel>
        <GlassPanel className="p-5">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Validation State</p>
          <div className="flex items-center gap-2">
            <ValidationBadge status={dataset.validation_state} />
            <span className="text-xs text-[var(--color-text-secondary)] capitalize">{dataset.validation_state}</span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">all critical fields verified</p>
        </GlassPanel>
        <GlassPanel className="p-5">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Field Coverage</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tabular-nums text-green-400">
              {Math.round(dataset.fields.reduce((sum, f) => sum + f.coverage, 0) / dataset.fields.length)}%
            </span>
            <span className="text-xs text-[var(--color-text-muted)]">avg coverage</span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">across {dataset.fields.length} fields</p>
        </GlassPanel>
      </div>

      {/* Field Coverage Table */}
      <GlassPanel className="overflow-hidden">
        <div className="p-4 border-b border-[var(--color-border-subtle)]">
          <SectionHeader title="Field Coverage Analysis" subtitle="Per-field validation and completeness" icon={Database} />
        </div>
        <div className="overflow-x-auto">
          <table className="intel-table w-full">
            <thead>
              <tr>
                <th>Field Name</th>
                <th>Coverage</th>
                <th>Status</th>
                <th>Visual</th>
              </tr>
            </thead>
            <tbody>
              {dataset.fields.map(field => (
                <tr key={field.name}>
                  <td>
                    <span className="text-xs font-mono text-[var(--color-text-primary)]">{field.name}</span>
                  </td>
                  <td>
                    <span className="text-xs font-mono tabular-nums text-[var(--color-text-secondary)]">{field.coverage.toFixed(1)}%</span>
                  </td>
                  <td>
                    <ValidationBadge status={field.status} />
                  </td>
                  <td className="w-48">
                    <ProgressBar value={field.coverage} color={field.status === 'valid' ? 'green' : field.status === 'warning' ? 'amber' : 'red'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
}
