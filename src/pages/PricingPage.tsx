import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Box, Check } from 'lucide-react';
import { useLang } from '../lib/i18n';

export default function PricingPage() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const isRu = lang === 'ru';

  const plans = [
    {
      name: isRu ? 'Бесплатно' : 'Free',
      price: isRu ? '₽0' : '$0',
      period: isRu ? '/месяц' : '/month',
      highlight: false,
      features: isRu
        ? ['5 генераций ИИ/месяц', '3D-просмотрщик', 'Конвертация форматов', 'Доступ к библиотеке', 'Экспорт GLB / OBJ']
        : ['5 AI generations/month', '3D viewer', 'Format conversion', 'Library access', 'GLB / OBJ export'],
      cta: isRu ? 'Начать бесплатно' : 'Get started free',
      ctaAction: () => navigate('/'),
    },
    {
      name: 'Pro',
      price: isRu ? '₽1 490' : '$16',
      period: isRu ? '/месяц' : '/month',
      highlight: true,
      badge: isRu ? 'Популярный' : 'Popular',
      features: isRu
        ? ['Безлимитные генерации', 'AR / VR-превью', 'Все форматы экспорта', 'Приоритетный рендеринг', 'Доступ к API']
        : ['Unlimited generations', 'AR / VR preview', 'All export formats', 'Priority rendering', 'API access'],
      cta: isRu ? 'Начать Pro' : 'Start Pro',
      ctaAction: () => alert(isRu ? 'Оплата скоро будет доступна' : 'Payment coming soon'),
    },
    {
      name: isRu ? 'Команда' : 'Team',
      price: isRu ? '₽3 990' : '$44',
      period: isRu ? '/месяц' : '/month',
      highlight: false,
      features: isRu
        ? ['Всё из Pro', 'До 10 участников', 'Общая библиотека', 'Пользовательские текстуры', 'Приоритетная поддержка']
        : ['Everything in Pro', 'Up to 10 members', 'Shared library', 'Custom textures', 'Priority support'],
      cta: isRu ? 'Написать нам' : 'Contact us',
      ctaAction: () => navigate('/about'),
    },
  ];

  return (
    <div className="bg-gray-950 min-h-screen text-gray-300">
      <div className="border-b border-white/5 bg-gray-950 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center">
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <Box className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold text-white">3D-Prin</span>
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">{t.pricing.title}</h1>
          <p className="text-gray-400 text-lg">{t.pricing.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.name} className={`relative rounded-2xl p-6 flex flex-col gap-6 transition-all ${
              plan.highlight
                ? 'bg-gradient-to-b from-cyan-500/10 to-blue-600/5 border-2 border-cyan-500/40 shadow-xl shadow-cyan-500/10'
                : 'bg-gray-900/80 border border-white/10'
            }`}>
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
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-300">
                    <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={plan.ctaAction}
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

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="text-2xl font-bold text-white text-center mb-10">
            {isRu ? 'Часто задаваемые вопросы' : 'Frequently Asked Questions'}
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {(isRu ? [
              { q: 'Можно ли отменить подписку?', a: 'Да, в любое время. Доступ сохраняется до конца оплаченного периода.' },
              { q: 'Что значит "безлимитные генерации"?', a: 'На тарифе Pro нет ограничений на количество AI-генераций в месяц.' },
              { q: 'Какие форматы поддерживаются?', a: 'GLB, GLTF, OBJ, STL, FBX, USDZ. Все форматы доступны на Pro.' },
              { q: 'Есть ли пробный период?', a: 'Бесплатный тариф доступен всегда — попробуйте сервис без ограничений по времени.' },
            ] : [
              { q: 'Can I cancel my subscription?', a: 'Yes, at any time. Access is retained until the end of the paid period.' },
              { q: 'What does "unlimited generations" mean?', a: 'Pro plan has no limits on AI generations per month.' },
              { q: 'What formats are supported?', a: 'GLB, GLTF, OBJ, STL, FBX, USDZ. All formats available on Pro.' },
              { q: 'Is there a trial period?', a: 'The free plan is always available — try the service with no time limit.' },
            ]).map(({ q, a }) => (
              <div key={q} className="bg-gray-900/50 border border-white/5 rounded-xl p-5">
                <h3 className="text-white font-medium mb-2 text-sm">{q}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
