import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
}

const BASE = 'https://3d-prin.ru';
const DEFAULT_IMAGE = `${BASE}/og-image.svg`;

export function useSEO({ title, description, canonical, ogImage, noindex }: SEOProps) {
  useEffect(() => {
    const fullTitle = title.includes('3D-Prin') ? title : `${title} | 3D-Prin`;
    const url = canonical ? `${BASE}${canonical}` : BASE;
    const image = ogImage || DEFAULT_IMAGE;

    document.title = fullTitle;

    const set = (sel: string, attr: string, val: string) => {
      let el = document.querySelector<HTMLMetaElement>(sel);
      if (!el) {
        el = document.createElement('meta');
        document.head.appendChild(el);
      }
      el.setAttribute(attr, val);
    };

    set('meta[name="description"]', 'content', description);
    set('meta[name="robots"]', 'content', noindex ? 'noindex, nofollow' : 'index, follow');

    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = url;

    set('meta[property="og:title"]', 'content', fullTitle);
    set('meta[property="og:description"]', 'content', description);
    set('meta[property="og:url"]', 'content', url);
    set('meta[property="og:image"]', 'content', image);

    set('meta[name="twitter:title"]', 'content', fullTitle);
    set('meta[name="twitter:description"]', 'content', description);
    set('meta[name="twitter:image"]', 'content', image);

    return () => {
      document.title = '3D-Prin — ИИ Генератор 3D Моделей | Бесплатно онлайн';
      set('meta[name="robots"]', 'content', 'index, follow');
    };
  }, [title, description, canonical, ogImage, noindex]);
}
