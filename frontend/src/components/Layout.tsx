import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home, LayoutDashboard, Database, BarChart3, Search as SearchIcon,
  GitBranch, ArrowRightLeft, Brain, FolderKanban, Settings,
  Shield, ChevronDown, Bell, User, Radio, Cpu, HardDrive, CheckCircle2
} from 'lucide-react';
import { GlassPanel, SearchInput, StatusIndicator } from './ui';
import { systemService } from '../services';
import { useTheme } from '../contexts/ThemeContext';
import type { SystemStatus } from '../types';

// ============================================================
// NOTIFICATION DROPDOWN
// ============================================================
function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-md hover:bg-[var(--color-bg-tertiary)] transition-colors relative"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={15} className="text-[var(--color-text-muted)]" />
      </button>
      {open && (
        <div className="dropdown-menu right-0 top-full mt-2 w-72">
          <div className="p-3 border-b border-[var(--color-border-subtle)]">
            <p className="text-xs font-semibold text-[var(--color-text-primary)]">Notifications</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xs text-[var(--color-text-muted)]">No new notifications</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PROFILE DROPDOWN
// ============================================================
function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[var(--color-bg-tertiary)] transition-colors"
        aria-label="User menu"
        aria-expanded={open}
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/30 flex items-center justify-center">
          <User size={12} className="text-cyan-400" />
        </div>
        <ChevronDown size={10} className="text-[var(--color-text-muted)]" />
      </button>
      {open && (
        <div className="dropdown-menu right-0 top-full mt-2 w-48">
          <div className="p-3 border-b border-[var(--color-border-subtle)]">
            <p className="text-xs font-semibold text-[var(--color-text-primary)]">Analyst</p>
            <p className="text-[10px] text-[var(--color-text-muted)]">Local Session</p>
          </div>
          <div
            className="dropdown-item"
            onClick={() => { navigate('/settings'); setOpen(false); }}
          >
            Settings
          </div>
        </div>
      )}
    </div>
  );
}

const navGroups = [
  {
    label: 'COMMAND',
    items: [
      { path: '/overview', label: 'Overview', icon: LayoutDashboard },
      
    ],
  },
  {
    label: 'DATA',
    items: [
      { path: '/dataset', label: 'Dataset', icon: Database },
      { path: '/analysis', label: 'Analysis Monitor', icon: BarChart3 },
    ],
  },
  {
    label: 'INVESTIGATION',
    items: [
      { path: '/leads', label: 'Investigative Leads', icon: SearchIcon },
      { path: '/entity/:id', label: 'Entity Investigation', icon: Shield, hidden: true },
      { path: '/graph', label: 'Graph Investigation', icon: GitBranch },
      { path: '/flow', label: 'Transaction Flow', icon: ArrowRightLeft },
    ],
  },
  {
    label: 'INTELLIGENCE',
    items: [
      { path: '/clusters', label: 'Clusters', icon: Brain },
      { path: '/patterns', label: 'Patterns', icon: GitBranch },
      { path: '/cases', label: 'Cases & Reports', icon: FolderKanban },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { path: '/settings', label: 'Settings', icon: Settings },
    ],
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    systemService.getStatus().then(setSystemStatus);
  }, []);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/leads?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-primary)]">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-60'} flex flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)] transition-all duration-300 flex-shrink-0`}>
        {/* Brand */}
        <div className="p-4 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
              <Shield size={16} className="text-cyan-400" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <h1 className="text-sm font-bold tracking-tight text-[var(--color-text-primary)]">BTC SENTINEL</h1>
                <p className="text-[9px] uppercase tracking-widest text-[var(--color-text-muted)]">Network Intelligence</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
  {/* Home */}
  <button
    onClick={() => navigate('/')}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 mb-3 relative group
      ${
        location.pathname === '/'
          ? 'bg-cyan-500/8 text-cyan-400 border border-cyan-500/20'
          : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
      }`}
  >
    {location.pathname === '/' && (
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-cyan-400 rounded-r" />
    )}

    <Home
      size={15}
      className={
        location.pathname === '/'
          ? 'text-cyan-400'
          : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]'
      }
    />

    {!sidebarCollapsed && <span>Home</span>}
  </button>

  {navGroups.map(group => (
    <div key={group.label} className="mb-4">
      {!sidebarCollapsed && (
        <p className="px-3 mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
          {group.label}
        </p>
      )}

      {group.items.filter(item => !item.hidden).map(item => {
        const isActive =
          location.pathname === item.path ||
          (item.path !== '/' &&
            location.pathname.startsWith(item.path.split('/:')[0]));

        const Icon = item.icon;

        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 mb-0.5 relative group
              ${
                isActive
                  ? 'bg-cyan-500/8 text-cyan-400 border border-cyan-500/20'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]'
              }`}
          >
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-cyan-400 rounded-r" />
            )}

            <Icon
              size={15}
              className={
                isActive
                  ? 'text-cyan-400'
                  : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)]'
              }
            />

            {!sidebarCollapsed && <span>{item.label}</span>}
          </button>
        );
      })}
    </div>
  ))}
</nav>

        {/* System Status Footer */}
        {!sidebarCollapsed && systemStatus && (
          <div className="p-3 border-t border-[var(--color-border-subtle)] space-y-2.5">
            <div className="flex items-center gap-2">
              <Cpu size={11} className="text-[var(--color-text-muted)]" />
              <StatusIndicator status={systemStatus.engine_online ? 'online' : 'error'} label="LOCAL ENGINE" />
            </div>
            <div className="flex items-center gap-2">
              <HardDrive size={11} className="text-[var(--color-text-muted)]" />
              <span className="text-[10px] text-[var(--color-text-muted)] truncate font-mono">{systemStatus.dataset_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Radio size={11} className="text-[var(--color-text-muted)]" />
              <span className="text-[10px] text-[var(--color-text-muted)] flex items-center gap-1">
                {systemStatus?.analysis_complete ? (
                  <><CheckCircle2 size={10} className="text-green-400" /> ANALYSIS COMPLETE</>
                ) : (
                  <><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> ANALYSIS PENDING</>
                )}
              </span>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-12 flex items-center justify-between px-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-secondary)]/80 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1.5 rounded hover:bg-[var(--color-bg-tertiary)] transition-colors">
              <div className="flex flex-col gap-0.5">
                <div className="w-3.5 h-0.5 bg-[var(--color-text-muted)] rounded" />
                <div className="w-3.5 h-0.5 bg-[var(--color-text-muted)] rounded" />
                <div className="w-3.5 h-0.5 bg-[var(--color-text-muted)] rounded" />
              </div>
            </button>
            <div className="text-xs text-[var(--color-text-muted)]">
              <span className="text-[var(--color-text-secondary)] font-medium">
                {navGroups.flatMap(g => g.items).find(i => location.pathname === i.path || (i.path !== '/' && location.pathname.startsWith(i.path.split('/:')[0])))?.label || 'BTC Sentinel'}
              </span>
            </div>
            {import.meta.env.VITE_USE_MOCK !== 'false' && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-[9px] font-semibold text-amber-400 uppercase tracking-wider">Demo Mode</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Global Search */}
            <div className="relative w-64">
              <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search entities, leads..." onKeyDown={handleSearch} />
            </div>

            {/* System Status */}
            {systemStatus && (
              <div className="flex items-center gap-3 pl-3 border-l border-[var(--color-border-subtle)]">
                <StatusIndicator status={systemStatus.engine_online ? 'online' : 'error'} />
                <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums">{systemStatus.total_observations.toLocaleString()} obs</span>
              </div>
            )}

            {/* Notifications */}
            <NotificationDropdown />

            {/* User */}
            <ProfileDropdown />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-atmosphere bg-grid">
          <div className="p-6 max-w-[1600px] mx-auto animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
