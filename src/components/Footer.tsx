import { Box } from 'lucide-react';
import { useLang } from '../lib/i18n';

export default function Footer() {
  const { t } = useLang();

  return (
    <footer className="bg-gray-950 border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
                <Box className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-white font-semibold">{t.appName}</span>
            </div>
            <p className="text-gray-500 text-sm max-w-xs">{t.footer.tagline}</p>
          </div>

          {/* Product links */}
          <div>
            <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">{t.footer.product}</div>
            <ul className="flex flex-col gap-2">
              {[t.footer.links.studio, t.footer.links.library, t.footer.links.api, t.footer.links.pricing].map((link) => (
                <li key={link}>
                  <a href="#" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company links */}
          <div>
            <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">{t.footer.company}</div>
            <ul className="flex flex-col gap-2">
              {[t.footer.links.about, t.footer.links.blog, t.footer.links.privacy, t.footer.links.terms].map((link) => (
                <li key={link}>
                  <a href="#" className="text-gray-500 text-sm hover:text-gray-300 transition-colors">{link}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-gray-600 text-xs">{t.footer.copy}</p>
          <div className="flex items-center gap-1 text-gray-600 text-xs">
            <span>Built with</span>
            <span className="text-cyan-500">Three.js</span>
            <span>·</span>
            <span className="text-cyan-500">Replicate AI</span>
            <span>·</span>
            <span className="text-cyan-500">Supabase</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
