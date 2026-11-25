import { useEffect, useState } from 'react';
import { authClient } from '../services/auth-client';

const providerLabels = {
  google: 'Google',
  facebook: 'Facebook',
};

function SocialAccountMenu({ providers }) {
  const { data: session, isPending, refetch } = authClient.useSession();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn(provider) {
    setMessage('');
    setIsSubmitting(true);

    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: window.location.origin,
      });

      if (result.error) throw new Error('Inicio de sesión rechazado.');
    } catch {
      setMessage('No pudimos iniciar sesión. Volvé a intentarlo.');
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    setMessage('');
    setIsSubmitting(true);

    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error('Cierre de sesión rechazado.');
      await refetch();
    } catch {
      setMessage('No pudimos cerrar la sesión. Volvé a intentarlo.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const accountLabel = session?.user?.name || 'Mi cuenta';

  return (
    <details className="account-menu">
      <summary className="account-menu__trigger" aria-label={accountLabel}>
        <svg viewBox="0 0 24 24" aria-hidden="true" className="account-icon">
          <circle cx="12" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M5.5 20c.5-3.4 2.7-5.2 6.5-5.2s6 1.8 6.5 5.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="account-menu__label">{accountLabel}</span>
      </summary>

      <div className="account-menu__panel">
        {isPending ? (
          <p className="account-menu__status">Cargando tu cuenta…</p>
        ) : session?.user ? (
          <>
            <p className="account-menu__eyebrow">Sesión iniciada</p>
            <p className="account-menu__name">{session.user.name || 'Cliente'}</p>
            <button className="account-menu__secondary" type="button" onClick={handleSignOut} disabled={isSubmitting}>
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <p className="account-menu__eyebrow">Tu colección</p>
            <p className="account-menu__description">Creá una cuenta o iniciá sesión con el proveedor social disponible.</p>
            <div className="account-menu__providers">
              {providers.map((provider) => (
                <button
                  className="account-menu__provider"
                  key={provider}
                  type="button"
                  onClick={() => handleSignIn(provider)}
                  disabled={isSubmitting}
                >
                  Continuar con {providerLabels[provider] || provider}
                </button>
              ))}
            </div>
          </>
        )}
        {message && <p className="account-menu__error" role="alert">{message}</p>}
      </div>
    </details>
  );
}

export default function AccountMenu() {
  const [providers, setProviders] = useState(null);

  useEffect(() => {
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
  return <SocialAccountMenu providers={providers} />;
}
