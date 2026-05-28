import { Box } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLang } from '../lib/i18n';

export default function Footer() {
  const { t, lang } = useLang();

  const productLinks = [
    { label: t.footer.links.studio,  href: null,       action: 'studio'   },
    { label: t.footer.links.library, href: null,       action: 'library'  },
    { label: t.footer.links.pricing, href: '/pricing', action: null       },
    { label: 'API',                  href: '/about',   action: null       },
  ];

  const companyLinks = [
    { label: t.footer.links.about,   href: '/about'   },
    { label: lang === 'ru' ? 'Блог' : 'Blog',         href: '/about'   },
    { label: t.footer.links.privacy, href: '/privacy' },
    { label: t.footer.links.terms,   href: '/terms'   },
  ];

  return (
    <footer className="bg-gray-950 border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-3 w-fit">
              <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                <Box className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-white font-semibold">{t.appName}</span>
            </Link>
            <p className="text-gray-500 text-sm max-w-xs">{t.footer.tagline}</p>
          </div>

          <div>
            <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
              {t.footer.product}
            </div>
            <ul className="flex flex-col gap-2">
              {productLinks.map((link) => (
                <li key={link.label}>
                  {link.href ? (
                    <Link to={link.href} className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
                      {link.label}
                    </Link>
                  ) : (
                    <span className="text-gray-500 text-sm hover:text-gray-300 transition-colors cursor-pointer">
                      {link.label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">
              {t.footer.company}
            </div>
            <ul className="flex flex-col gap-2">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6">
          <p className="text-gray-600 text-xs text-center">{t.footer.copy}</p>
        </div>
      </div>
    </footer>
  );
}
