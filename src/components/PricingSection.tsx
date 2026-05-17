import { Check } from 'lucide-react';
import { useLang } from '../lib/i18n';

export default function PricingSection() {
  const { t } = useLang();
  const plans = [
    { ...t.pricing.free, highlight: false },
    { ...t.pricing.pro, highlight: true },
    { ...t.pricing.team, highlight: false },
  ];

  return (
    <section className="bg-gray-900/50 py-24" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">{t.pricing.title}</h2>
          <p className="text-gray-400 text-lg">{t.pricing.subtitle}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-6 flex flex-col gap-6 transition-all ${
                plan.highlight
                  ? 'bg-gradient-to-b from-cyan-500/10 to-blue-600/5 border-2 border-cyan-500/40 shadow-xl shadow-cyan-500/10'
                  : 'bg-gray-900/80 border border-white/10'
              }`}
            >
              {'badge' in plan && plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-cyan-500 text-white text-xs font-semibold rounded-full">
                  {plan.badge}
                </div>
              )}
              <div>
                <div className="text-gray-400 text-sm font-medium mb-1">{plan.name}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-500 text-sm">{plan.period}</span>
                </div>
              </div>
              <ul className="flex flex-col gap-2 flex-1">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
              <button
                className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all ${
                  plan.highlight
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-md shadow-cyan-500/20'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
