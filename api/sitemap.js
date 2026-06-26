// Vercel Serverless Function — генерирует sitemap.xml динамически,
// подтягивая список опубликованных статей блога из Supabase.
// Доступна по адресу /sitemap.xml (см. rewrite в vercel.json).

const SITE_URL = 'https://3d-prin.ru';

const STATIC_PAGES = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/studio', changefreq: 'weekly', priority: '0.9' },
  { path: '/pricing', changefreq: 'monthly', priority: '0.8' },
  { path: '/blog', changefreq: 'daily', priority: '0.8' },
  { path: '/about', changefreq: 'monthly', priority: '0.6' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/terms', changefreq: 'yearly', priority: '0.3' },
];

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]));
}

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  let posts = [];

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const endpoint =
        `${supabaseUrl}/rest/v1/blog_posts` +
        `?select=slug,updated_at,published_at&published=eq.true&order=published_at.desc`;

      const response = await fetch(endpoint, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      });

      if (response.ok) {
        posts = await response.json();
      }
    } catch {
      // If Supabase is unreachable, fall back to static pages only —
      // better to serve a partial sitemap than fail the whole request.
      posts = [];
    }
  }

  const urlEntries = [
    ...STATIC_PAGES.map(
      (page) => `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    ),
    ...posts.map((post) => {
      const lastmod = (post.updated_at || post.published_at || '').slice(0, 10);
      return `  <url>
    <loc>${SITE_URL}/blog/${escapeXml(post.slug)}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }),
  ].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
  res.status(200).send(xml);
}
