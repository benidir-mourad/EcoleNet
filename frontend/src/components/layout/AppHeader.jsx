import { Code2, Cpu, Terminal, Wifi, Database, Binary } from 'lucide-react';

const ICONS = [
  { Icon: Code2,    cls: 'anim-float',   title: 'Code' },
  { Icon: Cpu,      cls: 'anim-float-2', title: 'CPU' },
  { Icon: Terminal, cls: 'anim-float-3', title: 'Terminal' },
  { Icon: Database, cls: 'anim-float-4', title: 'Base de données' },
];

const THEMES = {
  indigo: {
    gradient:  'from-indigo-950 via-indigo-900 to-violet-950',
    accent:    'text-indigo-300',
    separator: 'from-indigo-500 via-violet-500 to-purple-400',
    dot:       'bg-green-400',
  },
  emerald: {
    gradient:  'from-emerald-950 via-emerald-900 to-teal-950',
    accent:    'text-emerald-300',
    separator: 'from-emerald-500 via-teal-400 to-cyan-400',
    dot:       'bg-green-400',
  },
};

export default function AppHeader({ color = 'indigo' }) {
  const t = THEMES[color] ?? THEMES.indigo;

  return (
    <header className={`relative bg-gradient-to-r ${t.gradient} overflow-hidden shrink-0`}>
      {/* Dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.07) 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
      />

      {/* Animated scan line */}
      <div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent anim-scan pointer-events-none"
      />

      <div className="relative flex items-center justify-between px-6 py-3">
        {/* ── Left: brand ── */}
        <div className="flex items-center gap-4">
          {/* Status dot */}
          <div className={`w-2 h-2 rounded-full shrink-0 ${t.dot} anim-pulse-dot`} />

          {/* Logo text */}
          <div className="flex items-baseline gap-0 font-mono">
            <span className={`text-sm font-bold ${t.accent}`}>{'{ '}</span>
            <span className="text-sm font-bold text-white tracking-wide">EcoleNet</span>
            <span className={`text-sm font-bold ${t.accent}`}>{' }'}</span>
            <span className={`text-sm font-semibold ${t.accent} anim-blink ml-0.5`}>_</span>
          </div>

          {/* Subtitle */}
          <span className="hidden md:block text-xs text-white/30 font-mono border-l border-white/10 pl-4">
            // Plateforme d'apprentissage informatique
          </span>
        </div>

        {/* ── Right: floating tech icons ── */}
        <div className="flex items-center gap-4">
          {ICONS.map(({ Icon, cls, title }) => (
            <div
              key={title}
              className={`${cls} text-white/25 hover:text-white/60 transition-colors cursor-default`}
              title={title}
            >
              <Icon size={15} />
            </div>
          ))}

          {/* Binary badge */}
          <div className="hidden sm:flex items-center gap-1 bg-white/5 border border-white/10 rounded px-2 py-0.5">
            <Binary size={11} className={`${t.accent}`} />
            <span className={`text-xs font-mono ${t.accent}`}>v1.0</span>
          </div>
        </div>
      </div>

      {/* Gradient separator */}
      <div className={`h-px bg-gradient-to-r ${t.separator} opacity-70`} />
    </header>
  );
}
