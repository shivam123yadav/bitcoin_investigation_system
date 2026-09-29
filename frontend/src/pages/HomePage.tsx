import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Activity, Network, ArrowLeftRight, Share2, ScanSearch, Target,
  Database, Cpu, Globe, Lock, Eye, Zap, Users, Menu, X, GitBranch,
  Sun, Moon
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function HomePage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'night' ? 'day' : 'night');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-x-hidden transition-colors duration-300">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]' : 'bg-transparent'
        }`}>
        <div className="w-full px-6 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center">
              <Shield size={16} className="text-[var(--accent-cyan)]" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight block text-[var(--text-primary)]">BTC SENTINEL</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
                <span className="text-[9px] font-mono text-[var(--accent-green)] uppercase tracking-wider">System Online</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection('overview')} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Overview
            </button>
            <button onClick={() => scrollToSection('capabilities')} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Capabilities
            </button>
            <button onClick={() => scrollToSection('technology')} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              Technology
            </button>
            <button
              onClick={() => navigate('/team')}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Team
            </button>

            {/* Theme Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
              <button
                onClick={() => setTheme('day')}
                className={`p-1.5 rounded transition-all ${theme === 'day'
                  ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                aria-label="Switch to day theme"
              >
                <Sun size={14} />
              </button>
              <button
                onClick={() => setTheme('night')}
                className={`p-1.5 rounded transition-all ${theme === 'night'
                  ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                aria-label="Switch to night theme"
              >
                <Moon size={14} />
              </button>
            </div>

            <button
              onClick={() => navigate('/overview')}
              className="group px-5 py-2 rounded-md bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] text-sm font-medium hover:bg-[var(--accent-cyan)]/20 transition-all flex items-center gap-2"
            >
              LAUNCH PLATFORM
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[var(--bg-primary)]/95 backdrop-blur-xl border-t border-[var(--border-subtle)]">
            <div className="px-6 py-4 space-y-4">
              <button onClick={() => scrollToSection('overview')} className="block w-full text-left text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Overview
              </button>
              <button onClick={() => scrollToSection('capabilities')} className="block w-full text-left text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Capabilities
              </button>
              <button onClick={() => scrollToSection('technology')} className="block w-full text-left text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Technology
              </button>
              <button onClick={() => navigate('/team')} className="block w-full text-left text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Team
              </button>

              {/* Mobile Theme Toggle */}
              <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-xs text-[var(--text-muted)]">Theme:</span>
                <div className="flex items-center gap-1 p-1 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                  <button
                    onClick={() => setTheme('day')}
                    className={`p-1.5 rounded transition-all ${theme === 'day'
                      ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                      }`}
                    aria-label="Switch to day theme"
                  >
                    <Sun size={14} />
                  </button>
                  <button
                    onClick={() => setTheme('night')}
                    className={`p-1.5 rounded transition-all ${theme === 'night'
                      ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                      }`}
                    aria-label="Switch to night theme"
                  >
                    <Moon size={14} />
                  </button>
                </div>
              </div>

              <button
                onClick={() => navigate('/overview')}
                className="block w-full px-4 py-2 rounded-md bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] text-sm font-medium hover:bg-[var(--accent-cyan)]/20 transition-all text-center"
              >
                Launch Platform
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[calc(100vh-72px)] flex items-center justify-center pt-24 pb-16 px-6 overflow-hidden">
        {/* Sophisticated Background */}
        <div className="absolute inset-0">
          {/* Grid */}
          <div className="absolute inset-0 bg-grid opacity-20" />

          {/* Radial atmosphere */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px]"
            style={{
              background: 'radial-gradient(circle, var(--home-atmosphere-primary) 0%, var(--home-atmosphere-secondary) 40%, transparent 70%)',
              opacity: 'var(--graph-glow-opacity)'
            }} />

          {/* Coordinate marks */}
          <div className="absolute top-20 left-20 text-[10px] font-mono text-[var(--accent-cyan)]/20">X:0000</div>
          <div className="absolute top-20 right-20 text-[10px] font-mono text-[var(--accent-cyan)]/20">X:9999</div>

          {/* Tiny data points */}
          <div className="absolute top-1/4 left-1/4 w-1 h-1 rounded-full bg-[var(--accent-cyan)]/30 animate-pulse-slow" />
          <div className="absolute top-1/3 right-1/3 w-1 h-1 rounded-full bg-[var(--accent-blue)]/30 animate-pulse-slow" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/3 left-1/3 w-1 h-1 rounded-full bg-[var(--accent-violet)]/30 animate-pulse-slow" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative w-full max-w-[1400px] mx-auto grid md:grid-cols-[minmax(0,1.05fr)_minmax(520px,0.95fr)] gap-8 lg:gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-6 animate-fade-in max-w-[680px]">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] animate-pulse" />
              <span className="text-xs font-medium text-[var(--accent-cyan)] uppercase tracking-wider">
                SIH 2026 • Blockchain & Cybersecurity
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold leading-[0.9] tracking-tight text-[var(--text-primary)]">
              BITCOIN<br />
              NETWORK<br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                INTELLIGENCE.
              </span>
            </h1>

            <p className="text-lg text-[var(--text-secondary)] max-w-xl leading-relaxed">
              BTC Sentinel is an offline-capable intelligence platform designed to analyze Bitcoin transaction and network data, identify anomalous behavior, correlate entities, and support investigators in tracing suspicious transaction activity.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/overview')}
                className="group px-6 py-3 rounded-md bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] font-medium hover:bg-[var(--accent-cyan)]/20 transition-all flex items-center justify-center gap-2"
              >
                Launch Investigation Platform
                <Shield size={16} className="group-hover:scale-110 transition-transform" />
              </button>
              <button
                onClick={() => navigate('/team')}
                className="px-6 py-3 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-medium hover:bg-[var(--bg-hover)] transition-all flex items-center justify-center gap-2"
              >
                Our Team
                <Users size={16} />
              </button>
            </div>

            <div className="flex items-center gap-6 pt-4 text-xs text-[var(--text-muted)] uppercase tracking-wider">
              <span className="flex items-center gap-2">
                <Lock size={12} className="text-[var(--accent-cyan)]" />
                Offline Capable
              </span>
              <span className="flex items-center gap-2">
                <Cpu size={12} className="text-[var(--accent-cyan)]" />
                ML Powered
              </span>
              <span className="flex items-center gap-2">
                <Eye size={12} className="text-[var(--accent-cyan)]" />
                Evidence Driven
              </span>
            </div>
          </div>

          {/* Right Visualization - Investigation Intelligence Map */}
          <div className="relative hidden md:flex h-[560px] w-full items-center justify-center">
            <div className="relative w-[520px] h-[520px] max-w-full max-h-full">
              <InvestigationGraph />
            </div>
          </div>
        </div>
      </section>

      {/* Cinematic Statement - Visual Signature */}
      <section className="relative py-40 px-6 overflow-hidden">
        {/* Sophisticated background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)] via-[var(--bg-secondary)] to-[var(--bg-primary)]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px]"
            style={{ background: 'radial-gradient(circle, var(--home-atmosphere-primary) 0%, var(--home-atmosphere-secondary) 30%, transparent 70%)' }} />

          {/* Subtle grid overlay */}
          <div className="absolute inset-0 bg-grid opacity-[0.03]" />

          {/* Horizontal accent lines */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-cyan)]/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-cyan)]/20 to-transparent" />
        </div>

        <div className="max-w-6xl mx-auto text-center relative">
          {/* Technical label */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-cyan)]/5 border border-[var(--accent-cyan)]/20 mb-12">
            <div className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-pulse" />
            <span className="text-xs font-mono text-[var(--accent-cyan)] uppercase tracking-[0.2em]">
              Core Principle
            </span>
          </div>

          {/* Main statement */}
          <div className="space-y-6 mb-12">
            <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight">
              <span className="block text-[var(--text-primary)]/90">THE BLOCKCHAIN</span>
              <span className="block text-[var(--text-primary)]/90">IS PUBLIC.</span>
            </h2>

            <div className="flex items-center justify-center gap-4 py-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-[var(--accent-cyan)]/50" />
              <div className="w-2 h-2 rounded-full bg-[var(--accent-cyan)]" />
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-[var(--accent-cyan)]/50" />
            </div>

            <h2 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                THE INTELLIGENCE
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                IS NOT.
              </span>
            </h2>
          </div>

          {/* Supporting text */}
          <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed">
            BTC Sentinel transforms complex transaction and network observations into structured relationships, anomalies and investigative leads.
          </p>

          {/* Technical metadata */}
          <div className="mt-12 flex items-center justify-center gap-8 text-xs font-mono text-[var(--text-muted)]">
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[var(--accent-cyan)]" />
              TRANSACTION ANALYSIS
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[var(--accent-blue)]" />
              ENTITY CORRELATION
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[var(--accent-violet)]" />
              PATTERN DETECTION
            </span>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section id="overview" className="relative py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-[var(--text-primary)]">
              THE SIGNAL IS THERE.<br />
              <span className="text-[var(--text-muted)]">THE CHALLENGE IS FINDING IT.</span>
            </h2>
            <p className="text-lg text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed">
              Bitcoin investigations can involve large volumes of transaction activity and fragmented network evidence. Relationships between wallets, transactions, network observations and behavioral patterns can be difficult to analyze manually.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                title: 'FRAGMENTED',
                subtitle: 'EVIDENCE',
                desc: 'Transaction and network observations may exist across different sources.'
              },
              {
                num: '02',
                title: 'COMPLEX',
                subtitle: 'TRANSACTION FLOWS',
                desc: 'Multi-hop transfers, fan-out behavior and dense transaction relationships can make investigation difficult.'
              },
              {
                num: '03',
                title: 'SCALE',
                subtitle: '& VOLUME',
                desc: 'Large datasets require automated analysis to surface meaningful candidates for analyst review.'
              }
            ].map((item, i) => (
              <div
                key={i}
                className="group relative p-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--accent-cyan)]/30 transition-all duration-300 hover:bg-[var(--bg-hover)] overflow-hidden"
              >
                {/* Huge background number */}
                <div className="absolute -top-8 -right-4 text-[180px] font-bold text-[var(--accent-cyan)]/[0.03] leading-none select-none pointer-events-none group-hover:text-[var(--accent-cyan)]/[0.06] transition-colors">
                  {item.num}
                </div>

                <div className="relative">
                  <div className="text-xs font-mono text-[var(--accent-cyan)]/60 mb-4 tracking-wider">
                    {item.num}
                  </div>
                  <h3 className="text-2xl font-bold mb-1 tracking-tight text-[var(--text-primary)]">{item.title}</h3>
                  <h4 className="text-lg font-medium text-[var(--text-secondary)] mb-4">{item.subtitle}</h4>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section — Intelligence Core */}
      <section className="relative py-32 px-6 bg-gradient-to-b from-transparent via-[var(--accent-cyan)]/[0.02] to-transparent overflow-hidden">
        {/* Background atmosphere */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full"
          style={{ background: 'radial-gradient(circle, var(--home-atmosphere-primary) 0%, transparent 60%)' }} />

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20 mb-6">
              <Cpu size={12} className="text-[var(--accent-cyan)]" />
              <span className="text-xs font-medium text-[var(--accent-cyan)] uppercase tracking-wider">
                Intelligence Engine
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-[var(--text-primary)]">
              FROM RAW DATA<br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                TO INVESTIGATIVE INTELLIGENCE.
              </span>
            </h2>
            <p className="text-lg text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed">
              BTC Sentinel brings transaction intelligence, network observations, machine learning and graph-based investigation into one offline-capable environment.
            </p>
          </div>

          {/* Radial Layout — Responsive */}
          <div className="relative w-full flex items-center justify-center" style={{ minHeight: 'clamp(500px, 60vw, 700px)' }}>
            {/* Concentric rings - responsive sizing */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-[min(500px,80vw)] h-[min(500px,80vw)] rounded-full border border-[var(--accent-cyan)]/10 animate-pulse-slow" />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-[min(600px,90vw)] h-[min(600px,90vw)] rounded-full border border-[var(--accent-blue)]/5 animate-pulse-slow" style={{ animationDelay: '1s' }} />
            </div>

            {/* Center Node — Enhanced */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              {/* Outer glow ring */}
              <div className="absolute inset-0 -m-8 rounded-full bg-gradient-to-br from-[var(--accent-cyan)]/20 to-[var(--accent-blue)]/20 blur-xl animate-pulse-slow" />

              {/* Rotating border */}
              <div className="absolute inset-0 -m-4">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-2 border-dashed border-[var(--accent-cyan)]/30 animate-spin-slow" />
              </div>

              {/* Core */}
              <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-[var(--accent-cyan)]/30 to-[var(--accent-blue)]/30 border-2 border-[var(--accent-cyan)]/50 flex items-center justify-center backdrop-blur-sm shadow-2xl shadow-[var(--accent-cyan)]/20">
                <div className="text-center">
                  <Shield size={28} className="md:hidden text-[var(--accent-cyan)] mx-auto mb-1" />
                  <Shield size={36} className="hidden md:block text-[var(--accent-cyan)] mx-auto mb-2" />
                  <div className="text-[10px] md:text-xs font-bold text-[var(--accent-cyan)] tracking-wider">BTC SENTINEL</div>
                  <div className="text-[9px] md:text-[10px] text-[var(--text-muted)] mt-0.5">CORE ENGINE</div>
                </div>
              </div>
            </div>

            {/* Surrounding Nodes — Responsive */}
            {[
              { label: 'TRANSACTION\nINTELLIGENCE', angle: 0, icon: ArrowLeftRight, color: 'cyan' },
              { label: 'NETWORK\nCORRELATION', angle: 60, icon: Network, color: 'blue' },
              { label: 'MACHINE\nLEARNING', angle: 120, icon: Cpu, color: 'violet' },
              { label: 'ENTITY\nANALYSIS', angle: 180, icon: Share2, color: 'amber' },
              { label: 'GRAPH\nINVESTIGATION', angle: 240, icon: GitBranch, color: 'green' },
              { label: 'INVESTIGATIVE\nLEADS', angle: 300, icon: Target, color: 'red' }
            ].map((node, i) => {
              // Responsive radius based on viewport
              const radius = typeof window !== 'undefined' ? Math.min(240, window.innerWidth * 0.18) : 240;
              const x = Math.cos((node.angle * Math.PI) / 180) * radius;
              const y = Math.sin((node.angle * Math.PI) / 180) * radius;

              const colorClasses = {
                cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/30 text-cyan-400',
                blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/30 text-blue-400',
                violet: 'from-violet-500/10 to-violet-500/5 border-violet-500/30 text-violet-400',
                amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/30 text-amber-400',
                green: 'from-green-500/10 to-green-500/5 border-green-500/30 text-green-400',
                red: 'from-red-500/10 to-red-500/5 border-red-500/30 text-red-400'
              };

              const Icon = node.icon;

              return (
                <div
                  key={i}
                  className="absolute top-1/2 left-1/2 group"
                  style={{
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`
                  }}
                >
                  <div className={`w-24 h-24 md:w-32 md:h-32 rounded-xl bg-gradient-to-br ${colorClasses[node.color as keyof typeof colorClasses]} border backdrop-blur-sm flex flex-col items-center justify-center hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <Icon size={20} className="md:hidden mb-1 opacity-80" />
                    <Icon size={24} className="hidden md:block mb-2 opacity-80" />
                    <div className="text-[8px] md:text-[10px] font-bold text-[var(--text-primary)] whitespace-pre-line leading-tight text-center px-2">
                      {node.label}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Connection Lines — Enhanced with animated particles */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                // Responsive radius based on viewport
                const radius = typeof window !== 'undefined' ? Math.min(240, window.innerWidth * 0.18) : 240;
                const x = Math.cos((angle * Math.PI) / 180) * radius;
                const y = Math.sin((angle * Math.PI) / 180) * radius;

                return (
                  <g key={i}>
                    <line
                      x1="50%"
                      y1="50%"
                      x2={`calc(50% + ${x}px)`}
                      y2={`calc(50% + ${y}px)`}
                      stroke="url(#lineGradient)"
                      strokeWidth="1.5"
                      strokeDasharray="6 4"
                      opacity="0.4"
                    />
                    {/* Animated particle */}
                    <circle r="3" fill="var(--accent-cyan)" opacity="0.8">
                      <animateMotion
                        dur={`${4 + i * 0.5}s`}
                        repeatCount="indefinite"
                        path={`M0,0 L${x},${y}`}
                      />
                    </circle>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </section>

      {/* Capabilities Section */}
      <section id="capabilities" className="relative py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-[var(--text-primary)]">
              BUILT FOR<br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                INVESTIGATION.
              </span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Activity,
                title: 'ANOMALY DETECTION',
                techLabel: 'ML / BEHAVIORAL ANALYSIS',
                desc: 'Machine-learning-based analysis surfaces unusual behavioral patterns for analyst review.'
              },
              {
                icon: Network,
                title: 'ENTITY CLUSTERING',
                techLabel: 'DBSCAN / GRAPH ANALYSIS',
                desc: 'Group related entities and identify behavioral communities within transaction activity.'
              },
              {
                icon: ArrowLeftRight,
                title: 'TRANSACTION ANALYSIS',
                techLabel: 'FLOW / VOLUME CORRELATION',
                desc: 'Examine transaction flows, amounts, inputs, outputs and behavioral relationships.'
              },
              {
                icon: Share2,
                title: 'GRAPH INVESTIGATION',
                techLabel: 'NETWORK / RELATIONSHIP MAPPING',
                desc: 'Explore relationships between wallets, transactions and network entities through graph-based analysis.'
              },
              {
                icon: ScanSearch,
                title: 'PATTERN DETECTION',
                techLabel: 'REPEATED FAN-OUT / PEELING',
                desc: 'Identify recurring behaviors such as fan-out and other candidate transaction patterns.'
              },
              {
                icon: Target,
                title: 'INVESTIGATIVE LEADS',
                techLabel: 'EVIDENCE / PRIORITY SCORING',
                desc: 'Prioritize evidence-backed entities and patterns that require further investigation.'
              }
            ].map((item, i) => (
              <div
                key={i}
                className="group relative p-6 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--accent-cyan)]/30 transition-all duration-300 hover:bg-[var(--bg-hover)] overflow-hidden"
              >
                {/* Subtle data line animation on hover */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-cyan)]/0 to-transparent group-hover:via-[var(--accent-cyan)]/50 transition-all duration-500" />

                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20 group-hover:bg-[var(--accent-cyan)]/20 group-hover:scale-110 transition-all duration-300">
                    <item.icon size={20} className="text-[var(--accent-cyan)]" />
                  </div>
                  <span className="text-3xl font-bold text-[var(--text-primary)]/5 group-hover:text-[var(--accent-cyan)]/20 group-hover:translate-x-1 transition-all duration-300">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="text-sm font-bold mb-1 tracking-tight text-[var(--text-primary)]">{item.title}</h3>
                <div className="text-[10px] font-mono text-[var(--accent-cyan)]/60 mb-3 tracking-wider">
                  {item.techLabel}
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Intelligence Visualization Section */}
      <section className="relative py-32 px-6 bg-gradient-to-b from-transparent via-[var(--accent-cyan)]/[0.02] to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-[var(--text-primary)]">
              SEE THE CONNECTIONS.<br />
              <span className="text-[var(--text-muted)]">FOLLOW THE EVIDENCE.</span>
            </h2>
          </div>

          <div className="relative min-h-[400px] md:min-h-[500px] rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] overflow-visible">
            {/* Investigation Path Visualization */}
            <div className="absolute inset-0 flex items-center justify-center py-16">
              <div className="flex items-center gap-4 md:gap-8 overflow-x-auto px-4 w-full justify-center">
                {[
                  { label: 'IP', bgClass: 'bg-amber-500/10', borderClass: 'border-amber-500/30' },
                  { label: 'ENTITY', bgClass: 'bg-cyan-500/10', borderClass: 'border-cyan-500/30' },
                  { label: 'WALLET', bgClass: 'bg-blue-500/10', borderClass: 'border-blue-500/30' },
                  { label: 'TRANSACTION', bgClass: 'bg-violet-500/10', borderClass: 'border-violet-500/30' },
                  { label: 'WALLET', bgClass: 'bg-blue-500/10', borderClass: 'border-blue-500/30' },
                  { label: 'PATTERN', bgClass: 'bg-green-500/10', borderClass: 'border-green-500/30' }
                ].map((node, i) => (
                  <div key={i} className="flex items-center gap-4 md:gap-8 flex-shrink-0">
                    <div className={`w-16 h-16 md:w-20 md:h-20 rounded-lg ${node.bgClass} border-2 ${node.borderClass} flex items-center justify-center`}>
                      <span className="text-[10px] md:text-xs font-bold text-[var(--text-primary)]">{node.label}</span>
                    </div>
                    {i < 5 && (
                      <div className="w-8 md:w-12 h-0.5 bg-gradient-to-r from-[var(--accent-cyan)]/50 to-[var(--accent-blue)]/50 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Floating Labels */}
            <div className="absolute top-4 left-4 md:top-8 md:left-8 px-3 py-1.5 rounded-md bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20">
              <span className="text-[10px] font-mono text-[var(--accent-cyan)]">ANOMALY SCORE: 0.92</span>
            </div>
            <div className="absolute top-4 right-4 md:top-8 md:right-8 px-3 py-1.5 rounded-md bg-[var(--accent-violet)]/10 border border-[var(--accent-violet)]/20">
              <span className="text-[10px] font-mono text-[var(--accent-violet)]">ENTITY CLUSTER: C-3</span>
            </div>
            <div className="absolute bottom-4 left-4 md:bottom-8 md:left-8 px-3 py-1.5 rounded-md bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/20">
              <span className="text-[10px] font-mono text-[var(--accent-blue)]">TRANSACTION FLOW</span>
            </div>
            <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 px-3 py-1.5 rounded-md bg-[var(--accent-green)]/10 border border-[var(--accent-green)]/20">
              <span className="text-[10px] font-mono text-[var(--accent-green)]">PATTERN DETECTED</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why BTC Sentinel Section - Specification Sheet */}
      <section className="relative py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-[var(--text-primary)]">
              PLATFORM SPECIFICATIONS
            </h2>
          </div>

          <div className="space-y-0">
            {[
              {
                icon: Lock,
                title: 'OFFLINE CAPABLE',
                spec: 'CONTROLLED ENVIRONMENTS',
                desc: 'Designed to support analysis in controlled environments without requiring cloud-based investigation.'
              },
              {
                icon: Cpu,
                title: 'ML POWERED',
                spec: 'ANOMALY ANALYSIS',
                desc: 'Uses machine-learning techniques to identify anomalous behavior and support prioritization.'
              },
              {
                icon: Eye,
                title: 'EVIDENCE DRIVEN',
                spec: 'TRACEABLE FINDINGS',
                desc: 'Investigation views connect findings back to observable transaction and network evidence.'
              },
              {
                icon: Zap,
                title: 'EXPLAINABLE',
                spec: 'ANALYST REVIEW',
                desc: 'Surface the signals and patterns behind investigative leads rather than presenting unexplained predictions.'
              },
              {
                icon: Database,
                title: 'SCALABLE',
                spec: 'LARGE DATASETS',
                desc: 'Designed to process structured datasets and support large-scale investigation workflows.'
              }
            ].map((item, i) => (
              <div key={i} className="group flex items-start gap-6 py-6 border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--bg-hover)] transition-colors px-4 -mx-4 rounded">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-lg bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20 group-hover:bg-[var(--accent-cyan)]/20 transition-colors">
                    <item.icon size={20} className="text-[var(--accent-cyan)]" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-4 mb-1">
                    <h3 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">{item.title}</h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-[var(--accent-cyan)]/30 to-transparent" />
                    <span className="text-xs font-mono text-[var(--accent-cyan)]/60 tracking-wider">{item.spec}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Section - Architecture Layers */}
      <section id="technology" className="relative py-32 px-6 bg-gradient-to-b from-transparent via-[var(--accent-cyan)]/[0.02] to-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-[var(--text-primary)]">
              ENGINEERED AS AN<br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                INVESTIGATION PLATFORM.
              </span>
            </h2>
          </div>

          <div className="space-y-6">
            {/* Data Layer */}
            <div className="relative p-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="text-xs font-mono text-[var(--accent-cyan)]/60 tracking-wider mb-2">LAYER 01</div>
                  <h3 className="text-lg font-bold text-[var(--accent-cyan)] uppercase tracking-wider">DATA</h3>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {['CSV', 'JSON', 'XML'].map(tech => (
                      <div key={tech} className="px-3 py-1 rounded bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20 text-xs font-mono text-[var(--accent-cyan)]">{tech}</div>
                    ))}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">Bitcoin transaction data, Network metadata</p>
                </div>
              </div>
              {/* Connection line */}
              <div className="absolute left-1/2 -bottom-6 w-px h-6 bg-gradient-to-b from-[var(--accent-cyan)]/30 to-transparent" />
            </div>

            {/* Analysis Layer */}
            <div className="relative p-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="text-xs font-mono text-[var(--accent-cyan)]/60 tracking-wider mb-2">LAYER 02</div>
                  <h3 className="text-lg font-bold text-[var(--accent-cyan)] uppercase tracking-wider">ANALYSIS</h3>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {['Python', 'Pandas', 'Scikit-learn', 'NetworkX', 'DuckDB', 'Parquet'].map(tech => (
                      <div key={tech} className="px-3 py-1 rounded bg-[var(--accent-blue)]/10 border border-[var(--accent-blue)]/20 text-xs font-mono text-[var(--accent-blue)]">{tech}</div>
                    ))}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">Machine learning, Graph analysis, Pattern detection</p>
                </div>
              </div>
              {/* Connection line */}
              <div className="absolute left-1/2 -bottom-6 w-px h-6 bg-gradient-to-b from-[var(--accent-cyan)]/30 to-transparent" />
            </div>

            {/* Platform Layer */}
            <div className="p-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)]">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="text-xs font-mono text-[var(--accent-cyan)]/60 tracking-wider mb-2">LAYER 03</div>
                  <h3 className="text-lg font-bold text-[var(--accent-cyan)] uppercase tracking-wider">PLATFORM</h3>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {['FastAPI', 'React', 'TypeScript', 'Vite', 'Tailwind'].map(tech => (
                      <div key={tech} className="px-3 py-1 rounded bg-[var(--accent-violet)]/10 border border-[var(--accent-violet)]/20 text-xs font-mono text-[var(--accent-violet)]">{tech}</div>
                    ))}
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">Web interface, API services, Real-time visualization</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Project at a Glance — Technical Telemetry */}
      <section className="relative py-32 px-6 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)] via-[var(--bg-secondary)] to-[var(--bg-primary)]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px]"
            style={{ background: 'radial-gradient(circle, var(--home-atmosphere-primary) 0%, transparent 60%)' }} />
          <div className="absolute inset-0 bg-grid opacity-[0.03]" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-cyan)]/5 border border-[var(--accent-cyan)]/20 mb-6">
              <div className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-pulse" />
              <span className="text-xs font-mono text-[var(--accent-cyan)] uppercase tracking-[0.2em]">
                System Telemetry
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-[var(--text-primary)]">
              INTELLIGENCE AT SCALE
            </h2>
            <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
              Processing and analyzing Bitcoin network data to surface investigative leads
            </p>
          </div>

          {/* Central hero stat */}
          <div className="relative mb-12">
            <div className="max-w-2xl mx-auto text-center p-12 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-cyan)]/20 backdrop-blur-sm relative overflow-hidden">
              {/* Background grid */}
              <div className="absolute inset-0 bg-grid opacity-[0.05]" />

              {/* Glow effect */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full"
                style={{ background: 'radial-gradient(circle, var(--home-atmosphere-primary) 0%, transparent 70%)' }} />

              <div className="relative">
                {/* Technical label */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20 mb-6">
                  <span className="text-[10px] font-mono text-[var(--accent-cyan)] uppercase tracking-wider">
                    Total Records
                  </span>
                </div>

                <div className="text-7xl md:text-8xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent mb-3 tabular-nums">
                  48,000+
                </div>
                <div className="text-sm text-[var(--text-secondary)] uppercase tracking-widest mb-6">
                  Records Analyzed
                </div>

                {/* Technical breakdown */}
                <div className="flex items-center justify-center gap-6 text-xs font-mono text-[var(--text-muted)]">
                  <span className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-[var(--accent-cyan)]" />
                    TX: 46,977
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-[var(--accent-blue)]" />
                    IP: 3,800
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-[var(--accent-violet)]" />
                    ENTITY: 10,713
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Surrounding stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { value: '46,977', label: 'Transactions', code: 'TX', icon: ArrowLeftRight, color: 'cyan' },
              { value: '10,713', label: 'Wallet Entities', code: 'WALLET', icon: Network, color: 'blue' },
              { value: '3,800', label: 'Network IPs', code: 'IP', icon: Globe, color: 'amber' },
              { value: '8', label: 'Clusters', code: 'CLUSTER', icon: Share2, color: 'violet' },
              { value: '24', label: 'Patterns', code: 'PATTERN', icon: ScanSearch, color: 'green' },
              { value: '150', label: 'Leads', code: 'LEAD', icon: Target, color: 'red' }
            ].map((stat, i) => {
              const Icon = stat.icon;
              const colorClasses = {
                cyan: 'border-cyan-500/20 text-cyan-400',
                blue: 'border-blue-500/20 text-blue-400',
                amber: 'border-amber-500/20 text-amber-400',
                violet: 'border-violet-500/20 text-violet-400',
                green: 'border-green-500/20 text-green-400',
                red: 'border-red-500/20 text-red-400'
              };

              return (
                <div
                  key={i}
                  className={`group relative p-6 rounded-lg bg-[var(--bg-card)] border ${colorClasses[stat.color as keyof typeof colorClasses]} backdrop-blur-sm transition-all duration-300 hover:bg-[var(--bg-hover)]`}
                >
                  {/* Technical code label */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">
                      {stat.code}
                    </span>
                    <Icon size={14} className="opacity-40" />
                  </div>

                  {/* Value */}
                  <div className="text-3xl font-bold text-[var(--text-primary)] mb-1 tabular-nums">
                    {stat.value}
                  </div>

                  {/* Label */}
                  <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                    {stat.label}
                  </div>

                  {/* Mini sparkline */}
                  <div className="absolute bottom-2 right-2 opacity-20 group-hover:opacity-40 transition-opacity">
                    <svg width="40" height="20" viewBox="0 0 40 20">
                      <polyline
                        points="0,15 5,12 10,14 15,8 20,10 25,6 30,9 35,5 40,7"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        className={colorClasses[stat.color as keyof typeof colorClasses].split(' ').pop()}
                      />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA - Cinematic */}
      <section className="relative py-32 px-6 overflow-hidden">
        {/* Subtle network visualization background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-grid opacity-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px]"
            style={{ background: 'radial-gradient(circle, var(--home-atmosphere-primary) 0%, transparent 60%)' }} />

          {/* Animated particles */}
          <div className="absolute top-1/4 left-1/4 w-1 h-1 rounded-full bg-[var(--accent-cyan)]/40 animate-pulse-slow" />
          <div className="absolute top-1/3 right-1/3 w-1 h-1 rounded-full bg-[var(--accent-blue)]/40 animate-pulse-slow" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-1/3 left-1/3 w-1 h-1 rounded-full bg-[var(--accent-violet)]/40 animate-pulse-slow" style={{ animationDelay: '2s' }} />
        </div>

        <div className="max-w-4xl mx-auto text-center relative">
          <h2 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight leading-[0.9] text-[var(--text-primary)]">
            INVESTIGATE.<br />
            CORRELATE.<br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              DISCOVER.
            </span>
          </h2>
          <p className="text-xl text-[var(--text-secondary)] mb-10 max-w-2xl mx-auto leading-relaxed">
            Turn complex Bitcoin transaction and network data into structured investigative intelligence.
          </p>
          <button
            onClick={() => navigate('/overview')}
            className="group px-10 py-5 rounded-md bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] font-medium hover:bg-[var(--accent-cyan)]/20 transition-all text-lg flex items-center gap-3 mx-auto"
          >
            ENTER BTC SENTINEL
            <span className="group-hover:translate-x-2 transition-transform text-xl">→</span>
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-[var(--border-subtle)] py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center">
                  <Shield size={16} className="text-[var(--accent-cyan)]" />
                </div>
                <div>
                  <span className="text-sm font-bold tracking-tight block text-[var(--text-primary)]">BTC SENTINEL</span>
                  <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-wider">v1.0.0</span>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
                Bitcoin Network Intelligence & Investigation Platform
              </p>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)] animate-pulse" />
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider">System Online</span>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-4 text-[var(--text-secondary)]">Platform</h4>
              <div className="space-y-2">
                <button onClick={() => navigate('/overview')} className="block text-xs text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors font-mono">
                  → Dashboard
                </button>
                <button onClick={() => navigate('/leads')} className="block text-xs text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors font-mono">
                  → Investigation
                </button>
                <button onClick={() => navigate('/graph')} className="block text-xs text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors font-mono">
                  → Graph Analysis
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-4 text-[var(--text-secondary)]">Capabilities</h4>
              <div className="space-y-2">
                <button onClick={() => scrollToSection('capabilities')} className="block text-xs text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors font-mono">
                  → Anomaly Detection
                </button>
                <button onClick={() => scrollToSection('capabilities')} className="block text-xs text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors font-mono">
                  → Pattern Detection
                </button>
                <button onClick={() => scrollToSection('capabilities')} className="block text-xs text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors font-mono">
                  → Entity Clustering
                </button>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] mb-4 text-[var(--text-secondary)]">Project</h4>
              <div className="space-y-2">
                <button onClick={() => scrollToSection('technology')} className="block text-xs text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors font-mono">
                  → Technology
                </button>
                <button onClick={() => navigate('/team')} className="block text-xs text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors font-mono">
                  → Team
                </button>
                <div className="text-xs text-[var(--text-secondary)] font-mono">
                  SIH 2026
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-[var(--border-subtle)] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-xs text-[var(--text-muted)] font-mono">
              Built for investigation. Designed for intelligence.
            </div>
            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] font-mono">
              <span>SIH 2026</span>
              <span className="w-1 h-1 rounded-full bg-[var(--text-disabled)]" />
              <span>Blockchain & Cybersecurity</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Hero Network Visualization — Bitcoin forensic investigation graph
function InvestigationGraph() {
  // Asymmetric node positions for Bitcoin investigation map
  const nodes = [
    // Central core - Bitcoin Intelligence Core
    { id: 'core', x: 250, y: 250, size: 'large', type: 'core', label: 'BTC SENTINEL', sublabel: 'INTELLIGENCE CORE', meta: 'v1.0.0' },

    // Primary investigation path - Bitcoin forensic chain
    { id: 'wallet1', x: 150, y: 120, size: 'medium', type: 'wallet', label: 'WALLET', meta: 'bc1q7x2...f4a9' },
    { id: 'tx1', x: 320, y: 180, size: 'medium', type: 'tx', label: 'TX', meta: 'TX 9A72...F3B1' },
    { id: 'entity1', x: 380, y: 320, size: 'medium', type: 'entity', label: 'ENTITY', meta: 'E-041' },
    { id: 'wallet2', x: 200, y: 380, size: 'medium', type: 'wallet', label: 'WALLET', meta: 'bc1q9z4...h6c1' },
    { id: 'pattern1', x: 100, y: 280, size: 'medium', type: 'pattern', label: 'PATTERN', meta: 'REPEATED FAN-OUT' },
    { id: 'ip1', x: 420, y: 150, size: 'medium', type: 'ip', label: 'IP', meta: '185.220.101.4' },

    // Secondary nodes - Supporting intelligence
    { id: 'cluster1', x: 300, y: 80, size: 'small', type: 'cluster', label: 'CLUSTER', meta: 'C-007' },
    { id: 'wallet3', x: 80, y: 380, size: 'small', type: 'wallet', label: 'WALLET', meta: 'bc1q3m5...d2e7' },
    { id: 'entity2', x: 400, y: 400, size: 'small', type: 'entity', label: 'ENTITY', meta: 'E-087' },
    { id: 'lead1', x: 180, y: 200, size: 'small', type: 'lead', label: 'LEAD', meta: 'ANOMALY 82.4' },
  ];

  // Investigation path connections - Bitcoin forensic chain
  const edges = [
    // Primary investigation path (highlighted)
    { from: 'core', to: 'wallet1', highlighted: true, label: 'OBSERVED' },
    { from: 'wallet1', to: 'tx1', highlighted: true, label: 'TX 9A72' },
    { from: 'tx1', to: 'entity1', highlighted: true, label: 'LINKED' },
    { from: 'entity1', to: 'wallet2', highlighted: true, label: 'CONTROLLED' },
    { from: 'wallet2', to: 'pattern1', highlighted: true, label: 'DETECTED' },
    { from: 'pattern1', to: 'ip1', highlighted: true, label: 'ORIGIN' },

    // Secondary connections (supporting intelligence)
    { from: 'core', to: 'cluster1', highlighted: false },
    { from: 'core', to: 'lead1', highlighted: false },
    { from: 'wallet1', to: 'wallet3', highlighted: false },
    { from: 'tx1', to: 'entity2', highlighted: false },
    { from: 'entity1', to: 'entity2', highlighted: false },
    { from: 'pattern1', to: 'core', highlighted: false },
  ];

  const getNodeById = (id: string) => nodes.find(n => n.id === id);

  const getNodeSize = (size: string) => {
    switch (size) {
      case 'large': return 'w-20 h-20';
      case 'medium': return 'w-14 h-14';
      case 'small': return 'w-10 h-10';
      default: return 'w-12 h-12';
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'core': return 'from-cyan-500/30 to-blue-600/30 border-cyan-500/60';
      case 'wallet': return 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/30';
      case 'entity': return 'from-blue-500/10 to-blue-500/5 border-blue-500/30';
      case 'tx': return 'from-violet-500/10 to-violet-500/5 border-violet-500/30';
      case 'ip': return 'from-amber-500/10 to-amber-500/5 border-amber-500/30';
      case 'pattern': return 'from-green-500/10 to-green-500/5 border-green-500/30';
      case 'lead': return 'from-red-500/10 to-red-500/5 border-red-500/30';
      case 'cluster': return 'from-violet-500/10 to-violet-500/5 border-violet-500/30';
      default: return 'from-gray-500/10 to-gray-500/5 border-gray-500/30';
    }
  };

  return (
    <div className="relative w-[520px] h-[520px] max-w-full max-h-full overflow-visible">
      {/* Background */}
      <div className="absolute inset-0 bg-grid opacity-10" />

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[460px] h-[460px]"
        style={{ background: 'radial-gradient(circle, var(--home-atmosphere-primary) 0%, transparent 60%)' }} />

      {/* SVG Connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="var(--graph-connection-opacity)" />
            <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="edgeGradientHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {edges.map((edge, i) => {
          const from = getNodeById(edge.from);
          const to = getNodeById(edge.to);
          if (!from || !to) return null;

          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;

          return (
            <g key={i}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={edge.highlighted ? 'url(#edgeGradientHighlight)' : 'url(#edgeGradient)'}
                strokeWidth={edge.highlighted ? 2 : 1}
                opacity={edge.highlighted ? 0.8 : 0.3}
                strokeDasharray={edge.highlighted ? '0' : '4 4'}
              />
              {/* Edge label on highlighted path */}
              {edge.highlighted && edge.label && (
                <g>
                  <rect
                    x={midX - 20}
                    y={midY - 6}
                    width="40"
                    height="12"
                    rx="2"
                    fill="var(--graph-label-bg)"
                    stroke="var(--graph-label-border)"
                    strokeWidth="0.5"
                  />
                  <text
                    x={midX}
                    y={midY + 3}
                    textAnchor="middle"
                    style={{ fontSize: '7px', fontFamily: 'monospace', fill: 'var(--graph-label-meta)' }}
                  >
                    {edge.label}
                  </text>
                </g>
              )}
              {/* Animated particle on highlighted edges */}
              {edge.highlighted && (
                <circle r="3" fill="var(--accent-cyan)" opacity="0.9">
                  <animateMotion
                    dur={`${3 + i * 0.5}s`}
                    repeatCount="indefinite"
                    path={`M${from.x},${from.y} L${to.x},${to.y}`}
                  />
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      {/* Nodes */}
      {nodes.map((node) => {
        const sizeClass = getNodeSize(node.size);
        const colorClass = getNodeColor(node.type);

        return (
          <div
            key={node.id}
            className="absolute animate-float"
            style={{
              left: `${node.x}px`,
              top: `${node.y}px`,
              transform: 'translate(-50%, -50%)',
              animationDelay: `${parseInt(node.id.replace(/\D/g, '') || '0') * 0.3}s`
            }}
          >
            <div className={`relative ${sizeClass} rounded-lg bg-gradient-to-br ${colorClass} border backdrop-blur-sm flex items-center justify-center`}>
              {node.type === 'core' && (
                <>
                  <div className="absolute inset-0 rounded-lg border-2 border-dashed border-cyan-500/30 animate-spin-slow" />
                  <Shield size={24} className="text-[var(--accent-cyan)]" />
                </>
              )}
              {node.type !== 'core' && (
                <span className="text-[8px] font-bold" style={{ color: 'var(--graph-node-text)' }}>{node.label}</span>
              )}
            </div>

            {/* Metadata labels */}
            {node.meta && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <div className="px-2 py-0.5 rounded backdrop-blur-sm" style={{
                  backgroundColor: 'var(--graph-label-bg)',
                  border: '1px solid var(--graph-label-border)'
                }}>
                  <span className="text-[8px] font-mono" style={{ color: 'var(--graph-label-meta)' }}>{node.meta}</span>
                </div>
              </div>
            )}

            {/* Core label */}
            {node.type === 'core' && (
              <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 text-center">
                <div className="text-[10px] font-bold tracking-wider" style={{ color: 'var(--accent-cyan)' }}>{node.label}</div>
                <div className="text-[8px]" style={{ color: 'var(--graph-node-meta)' }}>{node.sublabel}</div>
              </div>
            )}
          </div>
        );
      })}

      {/* Active Intelligence Network label */}
      <div className="absolute top-4 left-4 px-3 py-1.5 rounded-md backdrop-blur-sm" style={{
        backgroundColor: 'var(--graph-label-bg)',
        border: '1px solid var(--graph-label-border)'
      }}>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-cyan)' }} />
          <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--accent-cyan)' }}>Active Intelligence Network</span>
        </div>
      </div>

      {/* Scan line */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-0 right-0 h-px animate-scan" style={{
          background: 'linear-gradient(to right, transparent, var(--accent-cyan), transparent)',
          opacity: 'var(--graph-glow-opacity)'
        }} />
      </div>
    </div>
  );
}
