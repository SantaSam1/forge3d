import { Link } from 'react-router-dom';
import { useSEO } from '../lib/useSEO';
import { ArrowLeft, Box } from 'lucide-react';
import { useLang } from '../lib/i18n';

export default function TermsPage() {
  const { lang } = useLang();
  const isRu = lang === 'ru';

  return (
    <div className="bg-gray-950 min-h-screen text-gray-300">
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
          {isRu ? 'Условия использования' : 'Terms of Service'}
        </h1>
        <p className="text-gray-500 text-sm mb-12">
          {isRu ? 'Последнее обновление: январь 2026' : 'Last updated: January 2026'}
        </p>

        {[
          {
            title: isRu ? '1. Принятие условий' : '1. Acceptance of Terms',
            text: isRu
              ? 'Используя платформу 3D-Prin, вы соглашаетесь с настоящими условиями. Если вы не согласны с условиями, пожалуйста, не используйте сервис.'
              : 'By using the 3D-Prin platform, you agree to these terms. If you do not agree, please do not use the service.',
          },
          {
            title: isRu ? '2. Использование сервиса' : '2. Use of Service',
            text: isRu
              ? 'Вы обязуетесь использовать сервис только в законных целях. Запрещается создавать модели, нарушающие авторские права, содержащие насилие или другой запрещённый контент.'
              : 'You agree to use the service for lawful purposes only. Creating models that infringe copyrights, contain violence, or other prohibited content is not allowed.',
          },
          {
            title: isRu ? '3. Интеллектуальная собственность' : '3. Intellectual Property',
            text: isRu
              ? '3D-модели, созданные вами на платформе, принадлежат вам. Вы предоставляете 3D-Prin неисключительную лицензию на хранение и отображение ваших моделей в рамках сервиса.'
              : '3D models you create on the platform belong to you. You grant 3D-Prin a non-exclusive license to store and display your models within the service.',
          },
          {
            title: isRu ? '4. Платные тарифы' : '4. Paid Plans',
            text: isRu
              ? 'Платные тарифы оплачиваются ежемесячно. Вы можете отменить подписку в любое время. Возврат средств за текущий период не производится.'
              : 'Paid plans are billed monthly. You can cancel your subscription at any time. Refunds for the current period are not provided.',
          },
          {
            title: isRu ? '5. Ограничение ответственности' : '5. Limitation of Liability',
            text: isRu
              ? 'Сервис предоставляется "как есть". Мы не несём ответственности за потерю данных или убытки, возникшие в результате использования сервиса.'
              : 'The service is provided "as is". We are not liable for data loss or damages resulting from use of the service.',
          },
          {
            title: isRu ? '6. Изменения условий' : '6. Changes to Terms',
            text: isRu
              ? 'Мы можем обновлять условия использования. При существенных изменениях мы уведомим вас по электронной почте.'
              : 'We may update these terms. For significant changes, we will notify you by email.',
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
