import { Link } from 'react-router-dom';
import { useSEO } from '../lib/useSEO';
import { ArrowLeft, Box, Sparkles, Globe, Zap, Users } from 'lucide-react';
import { useLang } from '../lib/i18n';

export default function AboutPage() {
  const { lang } = useLang();
  const isRu = lang === 'ru';

  return (
    <div className="bg-gray-950 min-h-screen text-gray-300">
      <div className="border-b border-white/5 bg-gray-950 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center">
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <Box className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold text-white">3D-Prin</span>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-cyan-500/20">
            <Box className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            {isRu ? 'О платформе 3D-Prin' : 'About 3D-Prin'}
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
            {isRu
              ? 'Мы создаём инструменты для генерации, просмотра и публикации 3D-моделей с помощью искусственного интеллекта.'
              : 'We build tools for generating, viewing, and publishing 3D models using artificial intelligence.'}
          </p>
        </div>

        {/* Values */}
        <div className="grid sm:grid-cols-2 gap-6 mb-16">
          {[
            { icon: Sparkles, title: isRu ? 'ИИ-генерация' : 'AI Generation',
              text: isRu ? 'Создавайте 3D-модели из текстового описания за секунды.' : 'Create 3D models from text descriptions in seconds.' },
            { icon: Globe, title: isRu ? 'Доступность' : 'Accessibility',
              text: isRu ? 'Без установки. Работает в браузере на любом устройстве.' : 'No installation. Works in browser on any device.' },
            { icon: Zap, title: isRu ? 'Скорость' : 'Speed',
              text: isRu ? 'Мгновенный просмотр, конвертация и экспорт в популярные форматы.' : 'Instant preview, conversion and export to popular formats.' },
            { icon: Users, title: isRu ? 'Сообщество' : 'Community',
              text: isRu ? 'Библиотека тысяч готовых моделей от Sketchfab и Poly Pizza.' : 'Library of thousands of ready-made models from Sketchfab and Poly Pizza.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="bg-gray-900/50 border border-white/5 rounded-2xl p-6">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">{title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        {/* Contact */}
        <div className="bg-gray-900/50 border border-white/5 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-3">
            {isRu ? 'Связаться с нами' : 'Get in touch'}
          </h2>
          <p className="text-gray-400 text-sm mb-4">
            {isRu ? 'Вопросы, предложения, партнёрство:' : 'Questions, suggestions, partnerships:'}
          </p>
          <a href="mailto:support@3d-prin.ru"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 rounded-xl text-sm transition-all">
            support@3d-prin.ru
          </a>
        </div>
      </div>
    </div>
  );
}
