// Vercel Edge Middleware.
// SPA-роутинг (vercel.json rewrites) отдаёт код 200 на любой путь, включая
// несуществующие — это сбивает поисковых роботов (см. предупреждение Яндекса
// про отсутствие 404). Здесь мы явно проверяем путь на соответствие списку
// реально существующих маршрутов и, если он не подходит ни под один —
// отдаём настоящий статус 404 с тем же HTML-каркасом приложения.
// React Router внутри увидит несовпавший путь и сам покажет компонент
// NotFoundPage — на экране всё выглядит так же, просто сервер теперь
// честно говорит ботам "этой страницы нет".

// Vercel Routing Middleware.
// SPA-роутинг (vercel.json rewrites) отдаёт код 200 на любой путь, включая
// несуществующие — это сбивает поисковых роботов (см. предупреждение Яндекса
// про отсутствие 404). Здесь мы явно проверяем путь на соответствие списку
// реально существующих маршрутов и, если он не подходит ни под один —
// отдаём настоящий статус 404 с тем же HTML-каркасом приложения.
// React Router внутри увидит несовпавший путь и сам покажет компонент
// NotFoundPage — на экране всё выглядит так же, просто сервер теперь
// честно говорит ботам "этой страницы нет".

export const config = {
  // Применяем middleware ко всем путям, КРОМЕ файлов с расширением
  // (картинки, js, css, sitemap.xml, robots.txt и т.п.) и /api/*.
  matcher: ['/((?!api/|.*\\..*).*)'],
};

// Точные статические пути
const STATIC_PATHS = new Set([
  '/', '/studio', '/library', '/pricing', '/about', '/privacy', '/terms',
  '/blog', '/blog/admin', '/blog/admin/login',
]);

function isKnownPath(pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (STATIC_PATHS.has(clean)) return true;
  // /blog/:slug — один уровень вложенности, кроме /blog/admin (уже учтён выше)
  const blogSlugMatch = clean.match(/^\/blog\/([^/]+)$/);
  if (blogSlugMatch) return true;
  return false;
}

export default async function middleware(request) {
  const { pathname } = new URL(request.url);

  if (isKnownPath(pathname)) {
    return; // путь известен — пропускаем дальше как обычно
  }

  // Путь не входит в известные маршруты — отдаём 404, но с тем же index.html,
  // чтобы React Router отрендерил NotFoundPage с нормальным внешним видом.
  const res = await fetch(new URL('/', request.url));
  const body = await res.text();
  return new Response(body, {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
