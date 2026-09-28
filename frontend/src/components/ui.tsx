import React from 'react';
import { AlertTriangle, CheckCircle, XCircle, Loader2, Shield, Activity, Database, Brain, GitBranch, FileText, Search, ChevronRight, ExternalLink } from 'lucide-react';

// --- Glass Panel ---
export function GlassPanel({ children, className = '', elevated = false, onClick }: { children: React.ReactNode; className?: string; elevated?: boolean; onClick?: () => void }) {
  return (
    <div className={`${elevated ? 'glass-panel-elevated' : 'glass-panel'} rounded-lg ${onClick ? 'cursor-pointer hover:border-[var(--color-border-active)] transition-all duration-200' : ''} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

// --- Section Header ---
export function SectionHeader({ title, subtitle, icon: Icon, action }: { title: string; subtitle?: string; icon?: React.ElementType; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && <div className="p-2 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]"><Icon size={18} className="text-[var(--color-accent-cyan)]" /></div>}
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// --- Metric Card ---
export function MetricCard({ label, value, icon: Icon, trend, color = 'cyan' }: { label: string; value: string | number; icon: React.ElementType; trend?: { value: number; positive: boolean }; color?: string }) {
  const colorMap: Record<string, string> = {
    cyan: 'text-[var(--color-accent-cyan)]',
    violet: 'text-[var(--color-accent-violet)]',
    amber: 'text-[var(--color-accent-amber)]',
    green: 'text-[var(--color-accent-green)]',
    red: 'text-[var(--color-accent-red)]',
    blue: 'text-[var(--color-accent-blue)]',
  };
  return (
    <GlassPanel className="p-4 hover:glow-cyan transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)] font-medium">{label}</p>
          <p className={`text-2xl font-bold mt-1 tabular-nums ${colorMap[color] || colorMap.cyan}`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
        </div>
        <div className={`p-2 rounded-lg bg-[var(--color-bg-tertiary)] ${colorMap[color] || colorMap.cyan}`}>
          <Icon size={18} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          <span className={`text-xs ${trend.positive ? 'text-[var(--color-accent-green)]' : 'text-[var(--color-accent-red)]'}`}>
            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-[10px] text-[var(--color-text-muted)]">vs previous</span>
        </div>
      )}
    </GlassPanel>
  );
}

// --- Risk Badge ---
export function RiskBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const styles = {
    high: 'bg-red-500/10 text-red-400 border-red-500/30',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    low: 'bg-green-500/10 text-green-400 border-green-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${styles[priority]}`}>
      {priority}
    </span>
  );
}

// --- Status Indicator ---
export function StatusIndicator({ status, label }: { status: 'online' | 'warning' | 'error' | 'offline'; label?: string }) {
  const dotClass = status === 'online' ? 'status-online' : status === 'warning' ? 'status-warning' : 'status-error';
  return (
    <div className="flex items-center gap-2">
      <span className={`status-dot ${dotClass}`} />
      {label && <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>}
    </div>
  );
}

// --- Evidence Card ---
export function EvidenceCard({ channel, count }: { channel: string; count?: number }) {
  const iconMap: Record<string, React.ElementType> = {
    ml: Brain, temporal: Activity, network: Shield, graph: GitBranch, pattern: FileText,
  };
  const Icon = iconMap[channel] || Activity;
  const colorMap: Record<string, string> = {
    ml: 'text-[var(--color-accent-violet)]', temporal: 'text-[var(--color-accent-cyan)]',
    network: 'text-[var(--color-accent-blue)]', graph: 'text-[var(--color-accent-amber)]',
    pattern: 'text-[var(--color-accent-green)]',
  };
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]">
      <Icon size={14} className={colorMap[channel] || 'text-[var(--color-text-muted)]'} />
      <span className="text-xs font-medium text-[var(--color-text-secondary)] capitalize">{channel}</span>
      {count !== undefined && <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">{count}</span>}
    </div>
  );
}

// --- Intelligence Tag ---
export function IntelligenceTag({ label, color = 'cyan' }: { label: string; color?: string }) {
  const colorMap: Record<string, string> = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border ${colorMap[color] || colorMap.cyan}`}>
      {label}
    </span>
  );
}

// --- Score Ring ---
export function ScoreRing({ score, size = 48, strokeWidth = 3 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score * circumference);
  const color = score >= 0.8 ? 'var(--color-accent-red)' : score >= 0.5 ? 'var(--color-accent-amber)' : 'var(--color-accent-green)';
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="score-ring" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(56,189,248,0.1)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <span className="absolute text-[10px] font-bold tabular-nums" style={{ color }}>{Math.round(score * 100)}</span>
    </div>
  );
}

// --- Loading State ---
export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 size={32} className="text-[var(--color-accent-cyan)] animate-spin" />
      <p className="text-sm text-[var(--color-text-muted)]">{message}</p>
    </div>
  );
}

// --- Empty State ---
export function EmptyState({ title, description, icon: Icon = Search }: { title: string; description?: string; icon?: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="p-4 rounded-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]">
        <Icon size={24} className="text-[var(--color-text-muted)]" />
      </div>
      <p className="text-sm font-medium text-[var(--color-text-secondary)]">{title}</p>
      {description && <p className="text-xs text-[var(--color-text-muted)] max-w-sm text-center">{description}</p>}
    </div>
  );
}

// --- Error State ---
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20">
        <XCircle size={24} className="text-red-400" />
      </div>
      <p className="text-sm text-[var(--color-text-secondary)]">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border-default)] text-xs font-medium text-[var(--color-text-primary)] hover:border-[var(--color-border-active)] transition-colors">
          Retry
        </button>
      )}
    </div>
  );
}

// --- Skeleton ---
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

// --- Command Button ---
export function CommandButton({ children, onClick, variant = 'default', size = 'md', disabled = false }: { children: React.ReactNode; onClick?: () => void; variant?: 'default' | 'primary' | 'danger'; size?: 'sm' | 'md'; disabled?: boolean }) {
  const variants = {
    default: 'bg-[var(--color-bg-tertiary)] border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-active)] hover:text-[var(--color-text-primary)]',
    primary: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/50',
    danger: 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20',
  };
  const sizes = { sm: 'px-2.5 py-1 text-[11px]', md: 'px-3.5 py-1.5 text-xs' };
  return (
    <button onClick={onClick} disabled={disabled} className={`inline-flex items-center gap-1.5 rounded-md border font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]}`}>
      {children}
    </button>
  );
}

// --- Breadcrumb ---
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="flex items-center gap-1 text-xs">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight size={12} className="text-[var(--color-text-muted)]" />}
          <span className={i === items.length - 1 ? 'text-[var(--color-text-primary)] font-medium' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] cursor-pointer'}>
            {item.label}
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
}

// --- Mini Metric ---
export function MiniMetric({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {unit && <span className="text-[10px] text-[var(--color-text-muted)] ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

// --- Insight Card ---
export function InsightCard({ title, value, description, icon: Icon, color = 'cyan' }: { title: string; value: string; description?: string; icon: React.ElementType; color?: string }) {
  const colorMap: Record<string, string> = { cyan: 'text-cyan-400 bg-cyan-500/10', violet: 'text-violet-400 bg-violet-500/10', amber: 'text-amber-400 bg-amber-500/10', green: 'text-green-400 bg-green-500/10' };
  return (
    <GlassPanel className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}><Icon size={16} /></div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--color-text-muted)]">{title}</p>
          <p className="text-lg font-bold tabular-nums">{value}</p>
          {description && <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{description}</p>}
        </div>
      </div>
    </GlassPanel>
  );
}

// --- Timeline Item ---
export function TimelineItem({ timestamp, title, description, icon: Icon, color = 'cyan' }: { timestamp: string; title: string; description?: string; icon?: React.ElementType; color?: string }) {
  const colorMap: Record<string, string> = { cyan: 'border-cyan-500/40 bg-cyan-500/10', violet: 'border-violet-500/40 bg-violet-500/10', amber: 'border-amber-500/40 bg-amber-500/10', green: 'border-green-500/40 bg-green-500/10' };
  return (
    <div className="flex gap-4 group">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center ${colorMap[color]}`}>
          {Icon ? <Icon size={12} /> : <div className="w-2 h-2 rounded-full bg-current" />}
        </div>
        <div className="w-px flex-1 bg-[var(--color-border-subtle)] mt-1" />
      </div>
      <div className="pb-6 flex-1 min-w-0">
        <p className="text-[10px] font-mono text-[var(--color-text-muted)]">{timestamp}</p>
        <p className="text-sm font-medium text-[var(--color-text-primary)] mt-0.5">{title}</p>
        {description && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

// --- Data Table Wrapper ---
export function DataTable({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-[var(--color-border-subtle)] ${className}`}>
      <table className="intel-table">{children}</table>
    </div>
  );
}

// --- Search Input ---
export function SearchInput({ value, onChange, placeholder = 'Search...', onKeyDown }: { value: string; onChange: (v: string) => void; placeholder?: string; onKeyDown?: (e: React.KeyboardEvent) => void }) {
  return (
    <div className="relative">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 rounded-md bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-active)] transition-colors"
      />
    </div>
  );
}

// --- External Link ---
export function ExternalLinkButton({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[var(--color-accent-cyan)] hover:text-cyan-300 transition-colors">
      {label} <ExternalLink size={10} />
    </a>
  );
}

// --- Validation Badge ---
export function ValidationBadge({ status }: { status: 'valid' | 'warning' | 'invalid' }) {
  const config = {
    valid: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
    warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    invalid: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  };
  const { icon: Icon, color, bg } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${color} ${bg}`}>
      <Icon size={10} /> {status}
    </span>
  );
}

// --- Progress Bar ---
export function ProgressBar({ value, color = 'cyan' }: { value: number; color?: string }) {
  const colorMap: Record<string, string> = { cyan: 'bg-cyan-500', violet: 'bg-violet-500', green: 'bg-green-500', amber: 'bg-amber-500', red: 'bg-red-500' };
  return (
    <div className="w-full h-1.5 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${colorMap[color]}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}
