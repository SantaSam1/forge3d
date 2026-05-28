import { useCallback, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { LangProvider } from './lib/i18n';
import Header from './components/Header';
import Hero from './components/Hero';
import FeaturesSection from './components/FeaturesSection';
import PricingSection from './components/PricingSection';
import Footer from './components/Footer';
import Studio from './pages/Studio';
import Library from './pages/Library';
import AssetBrowser from './components/AssetBrowser';
import Toast, { ToastData } from './components/Toast';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import AboutPage from './pages/AboutPage';
import PricingPage from './pages/PricingPage';

function MainApp() {
  const navigate = useNavigate();
  const [studioOpen, setStudioOpen]   = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ url: string; name: string; format: string } | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((message: string, type: ToastData['type']) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleBrowserImport = useCallback((url: string, name: string, format: string) => {
    setBrowserOpen(false);
    setPendingImport({ url, name, format });
    setStudioOpen(true);
  }, []);

  if (studioOpen) {
    return (
      <>
        <Studio
          onClose={() => setStudioOpen(false)}
          addToast={addToast}
          onOpenBrowser={() => setBrowserOpen(true)}
          pendingImport={pendingImport}
          onPendingImportDone={() => setPendingImport(null)}
        />
        <AssetBrowser
          isOpen={browserOpen}
          onClose={() => setBrowserOpen(false)}
          onImport={handleBrowserImport}
        />
        <Toast toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  if (libraryOpen) {
    return (
      <>
        <Library
          onClose={() => setLibraryOpen(false)}
          onOpenInStudio={() => { setLibraryOpen(false); setStudioOpen(true); }}
        />
        <Toast toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  return (
    <div className="bg-gray-950 min-h-screen flex flex-col">
      <Header
        onOpenStudio={() => setStudioOpen(true)}
        onOpenLibrary={() => setBrowserOpen(true)}
        onNavigate={(path) => navigate(path)}
      />
      <main className="flex-1 pt-16">
        <Hero
          onOpenStudio={() => setStudioOpen(true)}
          onOpenBrowser={() => setBrowserOpen(true)}
        />
        <FeaturesSection />
        <PricingSection onOpenStudio={() => setStudioOpen(true)} />
      </main>
      <Footer />
      <Toast toasts={toasts} onRemove={removeToast} />
      <AssetBrowser
        isOpen={browserOpen}
        onClose={() => setBrowserOpen(false)}
        onImport={handleBrowserImport}
      />
    </div>
  );
}

function AppInner() {
  return (
    <Routes>
      <Route path="/" element={<MainApp />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LangProvider>
        <AppInner />
      </LangProvider>
    </BrowserRouter>
  );
}
