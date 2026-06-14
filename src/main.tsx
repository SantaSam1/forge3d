import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import './index.css';
import { initSentry } from './lib/sentry';

// Инициализируем Sentry до рендера приложения
initSentry();

const container = document.getElementById('root')!;
const root = createRoot(container);

root.render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', background: '#030712', padding: '2rem',
        }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>⚠️</div>
            <h1 style={{ fontSize: 22, color: '#f9fafb', marginBottom: '0.75rem' }}>
              Что-то пошло не так
            </h1>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: '1.5rem' }}>
              Ошибка отправлена в систему мониторинга. Попробуйте обновить страницу.
            </p>
            <p style={{ fontSize: 12, color: '#4b5563', marginBottom: '2rem', fontFamily: 'monospace' }}>
              {String(error)}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => window.location.reload()}
                style={{ padding: '10px 20px', background: '#06b6d4', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
                Обновить страницу
              </button>
              <button onClick={resetError}
                style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}>
                Попробовать снова
              </button>
            </div>
          </div>
        </div>
      )}
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);
