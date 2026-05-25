import { useState, useCallback } from 'react';
import { LangProvider } from './lib/i18n';
import Header from './components/Header';
import Hero from './components/Hero';
import FeaturesSection from './components/FeaturesSection';
import PricingSection from './components/PricingSection';
import Footer from './components/Footer';
import Studio from './pages/Studio';
import Library from './pages/Library';
import Toast, { ToastData } from './components/Toast';

function AppInner() {
  const [studioOpen, setStudioOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((message: string, type: ToastData['type']) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (studioOpen) {
    return (
      <>
        <Studio onClose={() => setStudioOpen(false)} addToast={addToast} />
        <Toast toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  if (libraryOpen) {
    return (
      <>
        <Library onClose={() => setLibraryOpen(false)} onOpenInStudio={() => setStudioOpen(true)} />
        <Toast toasts={toasts} onRemove={removeToast} />
      </>
    );
  }

  return (
    <div className="bg-gray-950 min-h-screen">
      <Header onOpenStudio={() => setStudioOpen(true)} onOpenLibrary={() => setLibraryOpen(true)} />
      <main>
        <Hero onOpenStudio={() => setStudioOpen(true)} />
        <FeaturesSection />
        <PricingSection />
      </main>
      <Footer />
      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <AppInner />
    </LangProvider>
  );
}
