import { Code2, Cpu, Wifi } from 'lucide-react';

const THEMES = {
  indigo: { text: 'text-indigo-400', border: 'border-indigo-100', code: 'text-indigo-500' },
  emerald: { text: 'text-emerald-500', border: 'border-emerald-100', code: 'text-emerald-500' },
};

export default function AppFooter({ color = 'indigo' }) {
  const t = THEMES[color] ?? THEMES.indigo;

  return (
    <footer className={`mt-14 pt-5 border-t ${t.border}`}>
      {/* Circuit SVG decoration */}
      <div className="mb-4 opacity-20">
        <svg viewBox="0 0 600 30" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-full text-gray-400">
          <line x1="0" y1="15" x2="80" y2="15" />
          <circle cx="80" cy="15" r="3" fill="currentColor" />
          <line x1="80" y1="15" x2="80" y2="5" />
          <line x1="80" y1="5" x2="160" y2="5" />
          <circle cx="160" cy="5" r="2" />
          <line x1="160" y1="5" x2="160" y2="15" />
          <line x1="160" y1="15" x2="240" y2="15" />
          <rect x="240" y="9" width="30" height="12" rx="2" />
          <line x1="270" y1="15" x2="340" y2="15" />
          <circle cx="340" cy="15" r="3" fill="currentColor" />
          <line x1="340" y1="15" x2="340" y2="25" />
          <line x1="340" y1="25" x2="420" y2="25" />
          <circle cx="420" cy="25" r="2" />
          <line x1="420" y1="25" x2="420" y2="15" />
          <line x1="420" y1="15" x2="520" y2="15" />
          <circle cx="520" cy="15" r="3" fill="currentColor" />
          <line x1="520" y1="15" x2="520" y2="5" />
          <line x1="520" y1="5" x2="600" y2="5" />
          <line x1="255" y1="9" x2="255" y2="2" />
          <line x1="265" y1="9" x2="265" y2="2" />
          <line x1="255" y1="21" x2="255" y2="28" />
          <line x1="265" y1="21" x2="265" y2="28" />
        </svg>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4 text-xs text-gray-400">
        {/* Left: brand */}
        <div className="flex items-center gap-2">
          <span className={`font-mono font-bold ${t.code}`}>{'<EcoleNet />'}</span>
          <span className="text-gray-300">·</span>
          <span>© {new Date().getFullYear()}</span>
          <span className="text-gray-300">·</span>
          <span>Cours d'informatique</span>
        </div>

        {/* Right: tech badges */}
        <div className="flex items-center gap-3 text-gray-300">
          <div className="flex items-center gap-1.5 bg-gray-50 rounded px-2 py-1 border border-gray-100">
            <Code2 size={12} className={t.text} />
            <span className="font-mono text-gray-500">PHP / Laravel</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 rounded px-2 py-1 border border-gray-100">
            <Cpu size={12} className={t.text} />
            <span className="font-mono text-gray-500">React 19</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 rounded px-2 py-1 border border-gray-100">
            <Wifi size={12} className={t.text} />
            <span className="font-mono text-gray-500">REST API</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
