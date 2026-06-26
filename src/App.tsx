import { useCallback, useState, createContext, useContext, lazy, Suspense } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { LangProvider } from './lib/i18n';
import Header from './components/Header';
import Hero from './components/Hero';
import FeaturesSection from './components/FeaturesSection';
import PricingSection from './components/PricingSection';
import Footer from './components/Footer';
const Studio = lazy(() => import('./pages/Studio'));
const AssetBrowser = lazy(() => import('./components/AssetBrowser'));
const Library = lazy(() => import('./pages/Library'));
const BlogListPage = lazy(() => import('./pages/BlogListPage'));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'));
const BlogAdminPage = lazy(() => import('./pages/BlogAdminPage'));
const BlogAdminLoginPage = lazy(() => import('./pages/BlogAdminLoginPage'));
import Toast, { ToastData } from './components/Toast';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import AboutPage from './pages/AboutPage';
import PricingPage from './pages/PricingPage';

// ── Global AssetBrowser context ───────────────────────────────────────────────
const BrowserCtx = createContext<{ open: () => void }>({ open: () => {} });
export const useAssetBrowser = () => useContext(BrowserCtx);

// ── Global AssetBrowser that renders on top of everything ─────────────────────
function GlobalAssetBrowser() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((message: string, type: ToastData['type']) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <BrowserCtx.Provider value={{ open: () => setIsOpen(true) }}>
      <AppRoutes addToast={addToast} />
      <Suspense fallback={null}>
        <AssetBrowser
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onImport={(url, name, format) => {
          setIsOpen(false);
          // Store in sessionStorage so Studio can pick it up
          sessionStorage.setItem('pendingImport', JSON.stringify({ url, name, format }));
          navigate('/studio');
          addToast(`${name} — открывается в студии`, 'info');
        }}
      />
      </Suspense>
      <Toast toasts={toasts} onRemove={removeToast} />
    </BrowserCtx.Provider>
  );
}

// ── Main landing page ─────────────────────────────────────────────────────────
function MainApp() {
  const navigate = useNavigate();
  const { open: openBrowser } = useAssetBrowser();

  return (
    <div className="bg-gray-950 min-h-screen flex flex-col">
      <Header
        onOpenStudio={() => navigate('/studio')}
        onOpenLibrary={openBrowser}
      />
      <main className="flex-1 pt-16">
        <Hero
          onOpenStudio={() => navigate('/studio')}
          onOpenBrowser={openBrowser}
        />
        <FeaturesSection />
        <PricingSection onOpenStudio={() => navigate('/studio')} />
      </main>
      <Footer />
    </div>
  );
}

// ── Studio route ──────────────────────────────────────────────────────────────
function StudioRoute() {
  const navigate = useNavigate();
  const { open: openBrowser } = useAssetBrowser();
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((message: string, type: ToastData['type']) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Pick up pending import from sessionStorage
  const pendingRaw = sessionStorage.getItem('pendingImport');
  const pendingImport = pendingRaw ? JSON.parse(pendingRaw) : null;
  if (pendingRaw) sessionStorage.removeItem('pendingImport');

  return (
    <>
      <ErrorBoundary>
      <Suspense fallback={<div className="flex items-center justify-center h-screen bg-gray-950"><div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" /></div>}>
        <Studio
          onClose={() => navigate('/')}
          addToast={addToast}
          onOpenBrowser={openBrowser}
          pendingImport={pendingImport}
          onPendingImportDone={() => {}}
        />
      </Suspense>
      </ErrorBoundary>
      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  );
}


// ── Library route ─────────────────────────────────────────────────────────────
function LibraryRoute() {
  const navigate = useNavigate();
  return (
    <div className="bg-gray-950 min-h-screen flex flex-col">
      <Header
        onOpenStudio={() => navigate('/studio')}
        onOpenLibrary={() => navigate('/library')}
      />
      <main className="flex-1 pt-16">
        <ErrorBoundary>
          <Suspense fallback={<div className="flex items-center justify-center h-screen bg-gray-950"><div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" /></div>}>
            <Library
              onClose={() => navigate('/')}
              onOpenInStudio={() => navigate('/studio')}
            />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Footer />
    </div>
  );
}

// ── Generic fallback for lazily-loaded routes ─────────────────────────────────
function RouteFallback() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-950">
      <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
    </div>
  );
}

// ── Routes ────────────────────────────────────────────────────────────────────
function AppRoutes({ addToast }: { addToast: (msg: string, type: ToastData['type']) => void }) {
  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/studio" element={<StudioRoute />} />
      <Route path="/library" element={<LibraryRoute />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/blog" element={
        <Suspense fallback={<RouteFallback />}><BlogListPage /></Suspense>
      } />
      <Route path="/blog/admin/login" element={
        <Suspense fallback={<RouteFallback />}><BlogAdminLoginPage /></Suspense>
      } />
      <Route path="/blog/admin" element={
        <Suspense fallback={<RouteFallback />}><BlogAdminPage /></Suspense>
      } />
      <Route path="/blog/:slug" element={
        <Suspense fallback={<RouteFallback />}><BlogPostPage /></Suspense>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LangProvider>
        <GlobalAssetBrowser />
      </LangProvider>
    </BrowserRouter>
  );
}
