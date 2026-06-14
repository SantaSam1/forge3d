import { Sparkles, Glasses, Download, RefreshCw, Monitor, Star } from 'lucide-react';
import { useLang } from '../lib/i18n';

const icons = [Sparkles, Glasses, Download, RefreshCw, Monitor, Star];

export default function FeaturesSection() {
  const { t } = useLang();

  return (
    <section className="bg-gray-950 py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">{t.features.title}</h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">{t.features.subtitle}</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {t.features.items.map((item, i) => {
            const Icon = icons[i];
            return (
              <div
                key={item.title}
                className="group relative bg-gray-900/50 border border-white/5 hover:border-cyan-500/20 rounded-2xl p-6 transition-all hover:bg-gray-900/80 hover:-translate-y-1"
              >
                <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-cyan-500/20 transition-colors">
                  <Icon className="w-5 h-5 text-cyan-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
