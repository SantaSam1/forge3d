import { useState, useEffect } from 'react';
import { Box, Menu, X, Globe, User, LogOut, ChevronDown } from 'lucide-react';
import { useLang, Lang } from '../lib/i18n';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import AuthModal from './AuthModal';

interface HeaderProps {
  onOpenStudio: () => void;
  onOpenLibrary: () => void;
  onNavigate?: (path: string) => void;
}

export default function Header({ onOpenStudio, onOpenLibrary, onNavigate }: HeaderProps) {
  const { t, lang, setLang } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => { await supabase.auth.signOut(); setUserMenuOpen(false); };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const userInitial = userName.charAt(0).toUpperCase();

  const navItems = [
    { label: t.nav.studio,  action: () => { onOpenStudio(); setMenuOpen(false); } },
    { label: t.nav.library, action: () => { onOpenLibrary(); setMenuOpen(false); } },
    { label: t.nav.pricing, action: () => { onNavigate?.('/pricing'); setMenuOpen(false); } },
    { label: t.nav.docs,    action: () => { onNavigate?.('/about'); setMenuOpen(false); } },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-950 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button onClick={() => { setMenuOpen(false); onNavigate?.('/'); }} className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Box className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold text-lg tracking-tight">3D-Prin</span>
            </button>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <button key={item.label} onClick={item.action}
                  className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                <Globe className="w-3.5 h-3.5 text-gray-400 ml-1" />
                {(['en', 'ru'] as Lang[]).map((l) => (
                  <button key={l} onClick={() => setLang(l)}
                    className={`px-2 py-0.5 text-xs font-medium rounded transition-all ${lang === l ? 'bg-cyan-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>

              {user ? (
                <div className="relative hidden md:block">
                  <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all">
                    <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-white text-xs font-bold">{userInitial}</div>
                    <span className="text-sm text-gray-300 max-w-[100px] truncate">{userName}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-white/5">
                        <p className="text-xs text-gray-500">{lang === 'ru' ? 'Вы вошли как' : 'Signed in as'}</p>
                        <p className="text-sm text-white truncate">{user.email}</p>
                      </div>
                      <button onClick={() => { onOpenStudio(); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                        <User className="w-4 h-4" />{lang === 'ru' ? 'Открыть студию' : 'Open Studio'}
                      </button>
                      <button onClick={() => { onOpenLibrary(); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                        <Box className="w-4 h-4" />{lang === 'ru' ? 'Библиотека' : 'Library'}
                      </button>
                      <button onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors">
                        <LogOut className="w-4 h-4" />{lang === 'ru' ? 'Выйти' : 'Sign out'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button onClick={() => setAuthModal('login')} className="hidden md:block px-3 py-1.5 text-sm text-gray-300 hover:text-white transition-colors">
                    {t.nav.signIn}
                  </button>
                  <button onClick={() => setAuthModal('register')} className="hidden md:block px-4 py-1.5 text-sm font-medium bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-all">
                    {t.nav.signUp}
                  </button>
                </>
              )}

              <button className="md:hidden p-2 text-gray-400 hover:text-white" onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-white/5 bg-gray-950">
            <div className="px-4 py-3 flex flex-col gap-1">
              {navItems.map((item) => (
                <button key={item.label} onClick={item.action}
                  className="text-left px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                  {item.label}
                </button>
              ))}
              <div className="pt-2 border-t border-white/5 mt-1">
                {user ? (
                  <div>
                    <div className="px-3 py-2 text-xs text-gray-500 truncate">{user.email}</div>
                    <button onClick={handleSignOut} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/5 rounded-lg">
                      {lang === 'ru' ? 'Выйти' : 'Sign out'}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setAuthModal('login'); setMenuOpen(false); }}
                      className="flex-1 px-3 py-2.5 text-sm text-gray-300 border border-white/10 rounded-lg text-center">
                      {t.nav.signIn}
                    </button>
                    <button onClick={() => { setAuthModal('register'); setMenuOpen(false); }}
                      className="flex-1 px-3 py-2.5 text-sm font-medium bg-cyan-500 text-white rounded-lg text-center">
                      {t.nav.signUp}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {authModal && (
        <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} onSuccess={() => setAuthModal(null)} />
      )}
    </>
  );
}
