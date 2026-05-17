import { useState } from 'react';
import { Box, Menu, X, Globe } from 'lucide-react';
import { useLang, Lang } from '../lib/i18n';

interface HeaderProps {
  onOpenStudio: () => void;
}

export default function Header({ onOpenStudio }: HeaderProps) {
  const { t, lang, setLang } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={() => { setMenuOpen(false); }} className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Box className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">{t.appName}</span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: t.nav.studio, action: onOpenStudio },
              { label: t.nav.library, action: onOpenStudio },
              { label: t.nav.pricing, action: undefined },
              { label: t.nav.docs, action: undefined },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <Globe className="w-3.5 h-3.5 text-gray-400 ml-1" />
              {(['en', 'ru'] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 py-0.5 text-xs font-medium rounded transition-all ${
                    lang === l
                      ? 'bg-cyan-500 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            <button className="hidden md:block px-3 py-1.5 text-sm text-gray-300 hover:text-white transition-colors">
              {t.nav.signIn}
            </button>
            <button
              onClick={onOpenStudio}
              className="hidden md:block px-4 py-1.5 text-sm font-medium bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-all shadow-sm shadow-cyan-500/20"
            >
              {t.nav.signUp}
            </button>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 text-gray-400 hover:text-white"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/5 bg-gray-950/95 backdrop-blur-md">
          <div className="px-4 py-3 flex flex-col gap-1">
            {[t.nav.studio, t.nav.library, t.nav.pricing, t.nav.docs].map((label) => (
              <button
                key={label}
                onClick={() => { onOpenStudio(); setMenuOpen(false); }}
                className="text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                {label}
              </button>
            ))}
            <div className="flex gap-2 pt-2 border-t border-white/5 mt-1">
              <button className="flex-1 px-3 py-2 text-sm text-gray-300 hover:text-white border border-white/10 rounded-lg">
                {t.nav.signIn}
              </button>
              <button
                onClick={() => { onOpenStudio(); setMenuOpen(false); }}
                className="flex-1 px-3 py-2 text-sm font-medium bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg"
              >
                {t.nav.signUp}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
