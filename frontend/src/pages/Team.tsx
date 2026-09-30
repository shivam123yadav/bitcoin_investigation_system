import { Linkedin, Github, Shield } from 'lucide-react';
import { GlassPanel } from '../components/ui';
import shivamImage from '../images/shivam.png';
import sabaImage from '../images/saba.png';
import yashImage from '../images/yash.jpeg';
import suryanshImage from '../images/suryansh.png';
import kanhaiyaImage from '../images/kanhaiya.png';
import sachinImage from '../images/sachin.png';

// ============================================================
// TEAM MEMBER DATA - Easy to edit
// Replace names, roles, descriptions, images, and social links
// ============================================================
const teamMembers = [
  {
    id: "M01",
    name: "Shivam Yadav",
    role: "Full Stack Developer",
    image: shivamImage,
    objectPosition: "center 35%",
    linkedin: "https://www.linkedin.com/feed/",
    github: "https://github.com/shivam123yadav"
  },
  {
    id: "M02",
    name: "Saba Arif",
    role: "UI/UX Developer",
    image: sabaImage,
    objectPosition: "center 35%",
    linkedin: "https://www.linkedin.com/in/saba-arif-9ba9b8362/",
    github: "https://github.com/"
  },
  {
    id: "M03",
    name: "Yash Kumar",
    role: "Full Stack Developer",
    image: yashImage,
    linkedin: "https://www.linkedin.com/in/yash-jaiswal-a9489a220/",
    github: "https://github.com/Asmodeus6260"
  },
  {
    id: "M04",
    name: "Suryansh Ghosh",
    role: "Full Stack Developer",
    image: suryanshImage,
    linkedin: "www.linkedin.com/in/suryansh-singh-ghosh-324829329",
    github: "https://github.com/Suryansh-sys"
  },
  {
    id: "M05",
    name: "Kanhaiya Partidar",
    role: "Full Stack Developer",
    image: kanhaiyaImage,
    linkedin: "https://www.linkedin.com/in/kanhaiya-patidar-814721329?utm_source=share_via&utm_content=profile&utm_medium=member_android",
    github: "https://share.google/RKLmjGCtxLdy3Kg0z"
  },
  {
    id: "M06",
    name: "Sachin Kumar",
    role: "Frontend Developer",
    image: sachinImage,
    linkedin: "https://www.linkedin.com/in/sachin-kumar-59627a339/",
    github: "https://github.com/"
  }
];

export default function Team() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-hidden">
      {/* Subtle background grid pattern */}
      <div className="absolute inset-0 bg-grid opacity-[0.03] pointer-events-none" />

      {/* Radial atmosphere */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px]"
        style={{ background: 'radial-gradient(ellipse, var(--home-atmosphere-primary) 0%, transparent 70%)' }} />

      <div className="relative max-w-7xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          {/* Technical Division Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20 mb-6">
            <Shield size={14} className="text-[var(--accent-cyan)]" />
            <span className="text-xs font-mono text-[var(--accent-cyan)] uppercase tracking-[0.2em]">
              Technical Division
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight text-[var(--text-primary)]">
            THE TEAM
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
              BEHIND THE INTELLIGENCE.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed">
            A multidisciplinary team building intelligent tools for Bitcoin network investigation,
            anomaly detection, and blockchain forensics.
          </p>

          {/* Technical labels */}
          <div className="flex items-center justify-center gap-6 mt-8 text-xs font-mono text-[var(--text-muted)]">
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[var(--accent-cyan)]" />
              BLOCKCHAIN INTELLIGENCE
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[var(--accent-blue)]" />
              SECURITY & ANALYTICS
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-[var(--accent-violet)]" />
              INVESTIGATION TOOLS
            </span>
          </div>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teamMembers.map((member) => (
            <TeamMemberCard key={member.id} member={member} />
          ))}
        </div>

        {/* Footer note */}
        <div className="text-center mt-16 pt-8 border-t border-[var(--border-subtle)]">
          <p className="text-sm text-[var(--text-muted)] font-mono">
            BTC SENTINEL • SIH 2026 • Blockchain & Cybersecurity
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TEAM MEMBER CARD COMPONENT
// ============================================================
function TeamMemberCard({ member }: { member: typeof teamMembers[0] }) {
  return (
    <GlassPanel className="group relative p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      {/* Member ID Badge */}
      <div className="absolute top-4 right-4 px-2 py-1 rounded bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/20">
        <span className="text-[10px] font-mono text-[var(--accent-cyan)] font-bold">
          {member.id}
        </span>
      </div>

      {/* Profile Image */}
      <div className="flex flex-col items-center mb-4">
        <div className="relative mb-4">
          <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-[var(--border-default)] group-hover:border-[var(--accent-cyan)]/50 transition-all duration-300">
            <img
              src={member.image}
              alt={member.name}
              className="w-full h-full object-cover"
              style={{ objectPosition: member.objectPosition || "center" }}
            />
          </div>
          {/* Status indicator */}
          <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[var(--accent-green)] border-2 border-[var(--bg-card)]" />
        </div>

        {/* Name and Role */}
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1 text-center">
          {member.name}
        </h3>
        <p className="text-sm font-medium text-[var(--accent-cyan)] mb-2 text-center">
          {member.role}
        </p>

      </div>

      {/* Social Links */}
      <div className="flex items-center justify-center gap-3 pt-4 border-t border-[var(--border-subtle)]">
        <a
          href={member.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--accent-cyan)]/50 hover:bg-[var(--accent-cyan)]/10 transition-all duration-200 group/link"
          aria-label={`${member.name} LinkedIn profile`}
        >
          <Linkedin size={16} className="text-[var(--text-muted)] group-hover/link:text-[var(--accent-cyan)] transition-colors" />
        </a>
        <a
          href={member.github}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--accent-cyan)]/50 hover:bg-[var(--accent-cyan)]/10 transition-all duration-200 group/link"
          aria-label={`${member.name} GitHub profile`}
        >
          <Github size={16} className="text-[var(--text-muted)] group-hover/link:text-[var(--accent-cyan)] transition-colors" />
        </a>
      </div>
    </GlassPanel>
  );
}
