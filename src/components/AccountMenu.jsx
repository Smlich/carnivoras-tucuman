import { Component, lazy, Suspense, useEffect, useState } from 'react';

const AccountMenuPanel = lazy(() => import('./AccountMenuPanel.jsx'));

const providerLabels = {
  google: 'Google',
  facebook: 'Facebook',
};

class AccountMenuErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <p className="account-menu__error" role="alert">No pudimos cargar el acceso a tu cuenta. Recargá la página para volver a intentarlo.</p>;
    }

    return this.props.children;
  }
}

export default function AccountMenu() {
  const [providers, setProviders] = useState(null);
  const [accountName, setAccountName] = useState('Mi cuenta');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (import.meta.env.VITE_STATIC_PREVIEW === 'true') return undefined;

    const controller = new AbortController();
    let isActive = true;
    let retryTimer;

    async function loadAuthStatus() {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        try {
          const response = await fetch('/api/auth/status', { cache: 'no-store', signal: controller.signal });
          if (!response.ok) throw new Error('No se pudo consultar el inicio de sesión.');
          const status = await response.json();
          if (!isActive) return;
          setProviders(status.enabled && Array.isArray(status.providers)
            ? status.providers.filter((provider) => providerLabels[provider])
            : []);
          return;
        } catch (error) {
          if (!isActive || error.name === 'AbortError') return;
          if (attempt === 3) {
            setProviders([]);
            return;
          }
          await new Promise((resolve) => {
            retryTimer = window.setTimeout(resolve, 400 * (attempt + 1));
          });
        }
      }
    }

    loadAuthStatus();

    return () => {
      isActive = false;
      controller.abort();
      window.clearTimeout(retryTimer);
    };
  }, []);

  if (!providers?.length) return null;

  return (
    <details className="account-menu" onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary className="account-menu__trigger" aria-label={accountName}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="account-icon">
          <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M5.5 20c.5-3.4 2.7-5.2 6.5-5.2s6 1.8 6.5 5.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="account-menu__label">{accountName}</span>
      </summary>

      {isOpen && (
        <div className="account-menu__panel">
          <AccountMenuErrorBoundary>
            <Suspense fallback={<p className="account-menu__status" role="status">Cargando tu cuenta…</p>}>
              <AccountMenuPanel providers={providers} onAccountNameChange={setAccountName} />
            </Suspense>
          </AccountMenuErrorBoundary>
        </div>
      )}
    </details>
  );
}
