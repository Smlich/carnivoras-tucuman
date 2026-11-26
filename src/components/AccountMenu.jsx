import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

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
  const { enabled, providers: availableProviders, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const detailsRef = useRef(null);

  const providers = availableProviders.filter((provider) => providerLabels[provider]);
  const accountName = user?.name || 'Ingresar';

  useEffect(() => {
    if (!isOpen) return undefined;

    function closeMenu() {
      if (detailsRef.current) detailsRef.current.open = false;
    }

    function handlePointerDown(event) {
      if (detailsRef.current && !detailsRef.current.contains(event.target)) closeMenu();
    }

    function handleKeyDown(event) {
      if (event.key !== 'Escape') return;
      closeMenu();
      detailsRef.current?.querySelector('summary')?.focus();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!enabled || providers.length === 0) return null;

  return (
    <details ref={detailsRef} className="account-menu" onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary className="account-menu__trigger" aria-label={user?.name ? `Cuenta de ${user.name}` : 'Ingresar o registrarse con Google'}>
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
              <AccountMenuPanel providers={providers} />
            </Suspense>
          </AccountMenuErrorBoundary>
        </div>
      )}
    </details>
  );
}
