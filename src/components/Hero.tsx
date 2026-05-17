import { ArrowRight, Sparkles, Cpu, Layers, Printer } from 'lucide-react';
import { useLang } from '../lib/i18n';

interface HeroProps {
  onOpenStudio: () => void;
}

const featureIcons = [Sparkles, Cpu, Layers, Printer];

export default function Hero({ onOpenStudio }: HeroProps) {
  const { t } = useLang();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gray-950 pt-16">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-sm font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              {t.hero.badge}
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              {t.hero.title}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                {t.hero.titleAccent}
              </span>
            </h1>

            <p className="text-lg text-gray-400 leading-relaxed mb-10 max-w-lg">
              {t.hero.subtitle}
            </p>

            <div className="flex flex-wrap gap-3 mb-12">
              <button
                onClick={onOpenStudio}
                className="flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5"
              >
                {t.hero.ctaPrimary}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={onOpenStudio}
                className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 hover:border-white/20 transition-all"
              >
                {t.hero.ctaSecondary}
              </button>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-3">
              {t.hero.features.map((feat, i) => {
                const Icon = featureIcons[i];
                return (
                  <div
                    key={feat}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300"
                  >
                    <Icon className="w-3.5 h-3.5 text-cyan-400" />
                    {feat}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: 3D preview mockup */}
          <div className="relative hidden lg:flex items-center justify-center">
            <div className="relative w-[480px] h-[480px]">
              {/* Glow rings */}
              <div className="absolute inset-0 rounded-full border border-cyan-500/10 animate-pulse" />
              <div className="absolute inset-8 rounded-full border border-cyan-500/10" style={{ animationDelay: '0.5s' }} />
              <div className="absolute inset-16 rounded-full border border-cyan-500/10" />

              {/* Center card */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center justify-center gap-4 backdrop-blur">
                  <div className="relative">
                    <div className="w-24 h-24 bg-gradient-to-br from-cyan-400/20 to-blue-600/20 rounded-xl flex items-center justify-center border border-cyan-500/20">
                      <Box3DIcon />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-white font-semibold text-sm">Spaceship.glb</div>
                    <div className="text-gray-500 text-xs mt-0.5">2.4 MB · GLB</div>
                  </div>
                  <div className="flex gap-1">
                    {['GLB', 'OBJ', 'STL', 'USDZ'].map((fmt) => (
                      <span key={fmt} className="px-1.5 py-0.5 bg-gray-700/50 text-gray-400 text-xs rounded">
                        {fmt}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating badges */}
              <div className="absolute top-8 left-4 bg-gray-800/80 backdrop-blur border border-white/10 rounded-xl px-3 py-2 shadow-xl animate-bounce" style={{ animationDuration: '3s' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-xs text-gray-300">AI Generated</span>
                </div>
              </div>
              <div className="absolute bottom-12 right-4 bg-gray-800/80 backdrop-blur border border-white/10 rounded-xl px-3 py-2 shadow-xl animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                <div className="flex items-center gap-2">
                  <Cpu className="w-3 h-3 text-cyan-400" />
                  <span className="text-xs text-gray-300">AR Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Box3DIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
      <path d="M32 8L56 20V44L32 56L8 44V20L32 8Z" stroke="rgb(34,211,238)" strokeWidth="1.5" fill="none" />
      <path d="M32 8L32 56" stroke="rgb(34,211,238)" strokeWidth="1" strokeDasharray="3 3" />
      <path d="M8 20L56 20" stroke="rgb(34,211,238)" strokeWidth="1" strokeDasharray="3 3" />
      <path d="M8 44L56 44" stroke="rgb(34,211,238)" strokeWidth="1" strokeDasharray="3 3" />
      <path d="M32 8L8 20" stroke="rgb(96,165,250)" strokeWidth="1.5" />
      <path d="M32 8L56 20" stroke="rgb(96,165,250)" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="4" fill="rgb(34,211,238)" opacity="0.6" />
    </svg>
  );
}
