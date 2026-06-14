import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#030712',
          padding: '2rem',
        }}>
          <div style={{
            maxWidth: 480,
            width: '100%',
            textAlign: 'center',
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              fontSize: 28,
            }}>⚠</div>

            <h1 style={{
              fontSize: 22,
              fontWeight: 500,
              color: '#f9fafb',
              margin: '0 0 0.75rem',
            }}>
              Что-то пошло не так
            </h1>

            <p style={{
              fontSize: 14,
              color: '#6b7280',
              lineHeight: 1.6,
              margin: '0 0 2rem',
            }}>
              Произошла неожиданная ошибка. Попробуйте обновить страницу — обычно это помогает.
            </p>

            {this.state.error && (
              <details style={{
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: '0.75rem 1rem',
                marginBottom: '1.5rem',
                textAlign: 'left',
              }}>
                <summary style={{
                  fontSize: 12,
                  color: '#6b7280',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}>
                  Подробности ошибки
                </summary>
                <pre style={{
                  fontSize: 11,
                  color: '#ef4444',
                  marginTop: 8,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace',
                }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 20px',
                  background: '#06b6d4',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Обновить страницу
              </button>
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
                style={{
                  padding: '10px 20px',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#9ca3af',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                На главную
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
