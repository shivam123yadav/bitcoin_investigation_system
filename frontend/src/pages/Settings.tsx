import { useState, useEffect } from 'react';
import {
  Server,
  Database,
  Palette,
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  Sun,
  Moon,
} from 'lucide-react';

import {
  GlassPanel,
  SectionHeader,
  StatusIndicator,
} from '../components/ui';

import {
  healthService,
  systemService,
  datasetService,
} from '../services';

import { useTheme } from '../contexts/ThemeContext';

import type {
  HealthStatus,
  SystemStatus,
  DatasetInfo,
} from '../types';

export default function Settings() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [dataset, setDataset] = useState<DatasetInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const { theme, setTheme } = useTheme();

  /*
   * IMPORTANT:
   * Keep this logic identical to src/services/index.ts
   *
   * VITE_USE_MOCK=true  -> MOCK
   * anything else       -> LIVE
   */
  const useMock = import.meta.env.VITE_USE_MOCK === 'true';

  /*
   * This is the configured backend origin.
   * The service layer automatically normalizes it to /api/v1.
   */
  const configuredApiUrl =
    import.meta.env.VITE_API_BASE_URL || '/api/v1';

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      setLoading(true);

      const [healthResult, systemResult, datasetResult] =
        await Promise.all([
          healthService.check().catch(() => null),
          systemService.getStatus().catch(() => null),
          datasetService.getInfo().catch(() => null),
        ]);

      if (!mounted) return;

      setHealth(healthResult);
      setSystem(systemResult);
      setDataset(datasetResult);
      setLoading(false);
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ============================================================
          HEADER
      ============================================================ */}
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">
          Settings
        </h1>

        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          System configuration and runtime status
        </p>
      </div>

      {/* ============================================================
          BACKEND CONNECTION
      ============================================================ */}
      <GlassPanel className="p-5">
        <SectionHeader
          title="Backend Connection"
          subtitle="FastAPI endpoint configuration"
          icon={Server}
        />

        <div className="space-y-4 mt-4">

          {/* API URL */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] block mb-1.5">
              API Base URL
            </label>

            <div className="px-3 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]">
              <span className="text-xs font-mono text-[var(--color-text-primary)]">
                {configuredApiUrl}
              </span>
            </div>

            <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
              Configured through{' '}
              <code className="px-1 py-0.5 rounded bg-[var(--color-bg-tertiary)]">
                VITE_API_BASE_URL
              </code>
            </p>
          </div>

          {/* DATA MODE */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Data Mode
              </p>

              <p className="text-[10px] text-[var(--color-text-muted)]">
                {useMock
                  ? 'Using deterministic mock data for development'
                  : 'Connected to live FastAPI backend'}
              </p>
            </div>

            <span
              className={`text-[10px] px-2 py-0.5 rounded border ${
                useMock
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                  : 'text-green-400 bg-green-500/10 border-green-500/20'
              }`}
            >
              {useMock ? 'MOCK' : 'LIVE'}
            </span>
          </div>

          {/* ENGINE HEALTH */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-subtle)]">
            <span className="text-xs text-[var(--color-text-secondary)]">
              Engine Health
            </span>

            {loading ? (
              <div className="flex items-center gap-1.5">
                <Loader2
                  size={14}
                  className="text-[var(--color-text-muted)] animate-spin"
                />

                <span className="text-xs text-[var(--color-text-muted)]">
                  Checking...
                </span>
              </div>
            ) : health?.status === 'healthy' ? (
              <div className="flex items-center gap-1.5">
                <CheckCircle2
                  size={12}
                  className="text-green-400"
                />

                <span className="text-xs text-green-400">
                  Connected
                </span>
              </div>
            ) : health?.status === 'degraded' ? (
              <div className="flex items-center gap-1.5">
                <XCircle
                  size={12}
                  className="text-amber-400"
                />

                <span className="text-xs text-amber-400">
                  Degraded
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <XCircle
                  size={12}
                  className="text-red-400"
                />

                <span className="text-xs text-red-400">
                  Unreachable
                </span>
              </div>
            )}
          </div>

          {/* BACKEND VERSION */}
          {health?.version && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-secondary)]">
                Backend Version
              </span>

              <span className="text-xs font-mono text-[var(--color-text-muted)]">
                {health.version}
              </span>
            </div>
          )}

        </div>
      </GlassPanel>

      {/* ============================================================
          DATASET CONFIGURATION
      ============================================================ */}
      <GlassPanel className="p-5">
        <SectionHeader
          title="Dataset Configuration"
          subtitle="Current data source"
          icon={Database}
        />

        <div className="space-y-4 mt-4">

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] block mb-1.5">
              Active Dataset
            </label>

            <div className="px-3 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]">
              <span className="text-xs font-mono text-[var(--color-text-primary)]">
                {dataset?.filename || 'No dataset loaded'}
              </span>
            </div>
          </div>

          {dataset && (
            <>
              {/* RECORDS */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Records
                </span>

                <span className="text-xs font-mono text-[var(--color-text-primary)]">
                  {dataset.record_count.toLocaleString()}
                </span>
              </div>

              {/* DATE RANGE */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Date Range
                </span>

                <span className="text-xs font-mono text-[var(--color-text-primary)]">
                  {dataset.date_range.start} → {dataset.date_range.end}
                </span>
              </div>

              {/* VALIDATION */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Validation
                </span>

                <span
                  className={`text-xs ${
                    dataset.validation_state === 'valid'
                      ? 'text-green-400'
                      : dataset.validation_state === 'warning'
                        ? 'text-amber-400'
                        : 'text-red-400'
                  }`}
                >
                  {dataset.validation_state}
                </span>
              </div>
            </>
          )}

        </div>
      </GlassPanel>

      {/* ============================================================
          SYSTEM STATUS
      ============================================================ */}
      <GlassPanel className="p-5">
        <SectionHeader
          title="System Status"
          subtitle="Runtime information"
          icon={Shield}
        />

        <div className="space-y-4 mt-4">

          {system ? (
            <>
              {/* ENGINE */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Engine Online
                </span>

                <StatusIndicator
                  status={system.engine_online ? 'online' : 'error'}
                  label={system.engine_online ? 'Yes' : 'No'}
                />
              </div>

              {/* ANALYSIS */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Analysis Complete
                </span>

                <StatusIndicator
                  status={
                    system.analysis_complete
                      ? 'online'
                      : 'warning'
                  }
                  label={
                    system.analysis_complete
                      ? 'Yes'
                      : 'Pending'
                  }
                />
              </div>

              {/* OBSERVATIONS */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Total Observations
                </span>

                <span className="text-xs font-mono text-[var(--color-text-primary)]">
                  {system.total_observations.toLocaleString()}
                </span>
              </div>

              {/* ENTITIES */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Total Entities
                </span>

                <span className="text-xs font-mono text-[var(--color-text-primary)]">
                  {system.total_entities.toLocaleString()}
                </span>
              </div>

              {/* LEADS */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)]">
                  Investigation Leads
                </span>

                <span className="text-xs font-mono text-[var(--color-text-primary)]">
                  {system.total_leads}
                </span>
              </div>
            </>
          ) : (
            <p className="text-xs text-[var(--color-text-muted)]">
              Runtime status unavailable.
            </p>
          )}

        </div>
      </GlassPanel>

      {/* ============================================================
          APPEARANCE
      ============================================================ */}
      <GlassPanel className="p-5">
        <SectionHeader
          title="Appearance"
          subtitle="Choose your preferred theme"
          icon={Palette}
        />

        <div className="space-y-4 mt-4">

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] block mb-2">
              Theme
            </label>

            <div className="theme-selector">

              <button
                type="button"
                aria-label="Switch to day theme"
                className={`theme-option ${
                  theme === 'day' ? 'active' : ''
                }`}
                onClick={() => setTheme('day')}
              >
                <Sun size={13} />
                Day
              </button>

              <button
                type="button"
                aria-label="Switch to night theme"
                className={`theme-option ${
                  theme === 'night' ? 'active' : ''
                }`}
                onClick={() => setTheme('night')}
              >
                <Moon size={13} />
                Night
              </button>

            </div>

            <p className="text-[10px] text-[var(--color-text-muted)] mt-2">
              Theme preference is saved automatically and persists across sessions.
            </p>
          </div>

        </div>
      </GlassPanel>

      {/* ============================================================
          CONFIGURATION INFO
      ============================================================ */}
      <div className="px-4 py-3 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]">

        <p className="text-[10px] text-[var(--color-text-muted)]">
          Configuration is managed through environment variables.
          Changes require rebuilding the frontend.
        </p>

        <p className="text-[10px] text-[var(--color-text-muted)] mt-1">
          Use{' '}
          <code className="px-1 py-0.5 rounded bg-[var(--color-bg-primary)]">
            VITE_USE_MOCK=true
          </code>{' '}
          for development mock data, or{' '}
          <code className="px-1 py-0.5 rounded bg-[var(--color-bg-primary)]">
            VITE_USE_MOCK=false
          </code>{' '}
          with a running FastAPI backend.
        </p>

      </div>

    </div>
  );
}