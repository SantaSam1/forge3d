import * as Sentry from '@sentry/react';

export function initSentry() {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: 'https://1499b392dfb3d73229b5b5d687c18d1d@o4511562746757120.ingest.us.sentry.io/4511562756128768',
      environment: 'production',
      release: import.meta.env.VITE_APP_VERSION || '1.0.0',
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      tracesSampleRate: 0.2,        // 20% запросов трассируем
      replaysSessionSampleRate: 0.05, // 5% сессий записываем
      replaysOnErrorSampleRate: 1.0,  // 100% сессий с ошибками записываем
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'Non-Error promise rejection captured',
        /^Loading chunk \d+ failed/,
      ],
    });
  }
}
