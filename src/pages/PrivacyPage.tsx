import { Link } from 'react-router-dom';
import { useSEO } from '../lib/useSEO';
import { ArrowLeft, Box } from 'lucide-react';
import { useLang } from '../lib/i18n';

export default function PrivacyPage() {
  const { lang } = useLang();
  const isRu = lang === 'ru';

  return (
    <div className="bg-gray-950 min-h-screen text-gray-300">
      {/* Header */}
      <div className="border-b border-white/5 bg-gray-950 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <Box className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold text-white">3D-Prin</span>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">
          {isRu ? 'Политика конфиденциальности' : 'Privacy Policy'}
        </h1>
        <p className="text-gray-500 text-sm mb-12">
          {isRu ? 'Последнее обновление: январь 2026' : 'Last updated: January 2026'}
        </p>

        {[
          {
            title: isRu ? '1. Какие данные мы собираем' : '1. What data we collect',
            text: isRu
              ? 'Мы собираем данные, которые вы предоставляете при регистрации: адрес электронной почты, имя пользователя. При использовании сервиса мы автоматически фиксируем технические данные: IP-адрес, тип браузера, страницы которые вы посещаете.'
              : 'We collect data you provide when registering: email address and username. When using the service, we automatically collect technical data: IP address, browser type, and pages you visit.',
          },
          {
            title: isRu ? '2. Как мы используем данные' : '2. How we use your data',
            text: isRu
              ? 'Ваши данные используются для: предоставления и улучшения сервиса, аутентификации, отправки важных уведомлений о сервисе. Мы не продаём ваши данные третьим лицам.'
              : 'Your data is used to: provide and improve the service, authenticate you, and send important service notifications. We do not sell your data to third parties.',
          },
          {
            title: isRu ? '3. Хранение данных' : '3. Data storage',
            text: isRu
              ? 'Данные хранятся на серверах Supabase, расположенных в ЕС (Германия). Мы применяем стандартные меры безопасности для защиты ваших данных.'
              : 'Data is stored on Supabase servers located in the EU (Germany). We apply standard security measures to protect your data.',
          },
          {
            title: isRu ? '4. Файлы cookie' : '4. Cookies',
            text: isRu
              ? 'Мы используем только необходимые файлы cookie для аутентификации и сохранения ваших настроек. Мы не используем рекламные или аналитические cookie третьих сторон.'
              : 'We only use essential cookies for authentication and saving your preferences. We do not use third-party advertising or analytics cookies.',
          },
          {
            title: isRu ? '5. Ваши права' : '5. Your rights',
            text: isRu
              ? 'Вы вправе: запросить копию своих данных, исправить неточные данные, удалить свою учётную запись и все связанные данные. Для этого напишите нам на support@3d-prin.ru.'
              : 'You have the right to: request a copy of your data, correct inaccurate data, delete your account and all associated data. To do this, write to us at support@3d-prin.ru.',
          },
          {
            title: isRu ? '6. Контакты' : '6. Contact',
            text: isRu
              ? 'По вопросам конфиденциальности: support@3d-prin.ru'
              : 'For privacy questions: support@3d-prin.ru',
          },
        ].map((section) => (
          <div key={section.title} className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-3">{section.title}</h2>
            <p className="text-gray-400 leading-relaxed">{section.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
