import { Link } from 'react-router-dom';
import { Box, Home, Search } from 'lucide-react';
import { useLang } from '../lib/i18n';
import { useSEO } from '../lib/useSEO';

export default function NotFoundPage() {
  const { lang } = useLang();
  const isRu = lang === 'ru';

  useSEO({
    title: isRu ? 'Страница не найдена' : 'Page not found',
    description: '',
    noindex: true,
  });

  return (
    <div className="bg-gray-950 min-h-screen flex flex-col">
      <div className="border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center">
          <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <Box className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold text-white">3D-Prin</span>
          </Link>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <div className="text-7xl font-bold text-white/10 mb-4">404</div>
        <h1 className="text-2xl font-bold text-white mb-3">
          {isRu ? 'Страница не найдена' : 'Page not found'}
        </h1>
        <p className="text-gray-400 max-w-md mb-8 leading-relaxed">
          {isRu
            ? 'Такой страницы не существует — возможно, она была перемещена или удалена.'
            : "This page doesn't exist — it may have been moved or removed."}
        </p>
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-xl text-sm transition-all"
          >
            <Home className="w-4 h-4" />
            {isRu ? 'На главную' : 'Go home'}
          </Link>
          <Link
            to="/blog"
            className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 font-medium rounded-xl text-sm transition-all"
          >
            <Search className="w-4 h-4" />
            {isRu ? 'Блог' : 'Blog'}
          </Link>
        </div>
      </div>
    </div>
  );
}
