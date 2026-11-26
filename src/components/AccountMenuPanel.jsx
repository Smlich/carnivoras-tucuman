import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const providerLabels = {
  google: 'Google',
  facebook: 'Facebook',
};

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.82-.07-1.64-.22-2.44H12v4.62h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.8Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.76-2.11-6.7-4.95H1.3v3.09A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.3 14.28A7.22 7.22 0 0 1 4.92 12c0-.79.14-1.56.38-2.28V6.63H1.3A12 12 0 0 0 0 12c0 1.94.46 3.77 1.3 5.37l4-3.09Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.3 6.63l4 3.09c.94-2.84 3.58-4.95 6.7-4.95Z" />
    </svg>
  );
}

export default function AccountMenuPanel({ providers }) {
  const { user, isAdmin, isLoading, signInWithProvider, signOut } = useAuth();
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn(provider) {
    setMessage('');
    setProgress(`Conectando con ${providerLabels[provider] || provider}…`);
    setIsSubmitting(true);

    try {
      await signInWithProvider(provider);
    } catch {
      setMessage('No pudimos iniciar sesión. Volvé a intentarlo.');
      setProgress('');
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    setMessage('');
    setProgress('Cerrando sesión…');
    setIsSubmitting(true);

    try {
      await signOut();
    } catch {
      setMessage('No pudimos cerrar la sesión. Volvé a intentarlo.');
    } finally {
      setIsSubmitting(false);
      setProgress('');
    }
  }

  if (isLoading) return <p className="account-menu__status" role="status">Cargando tu cuenta…</p>;

  if (user) {
    return (
      <>
        <p className="account-menu__eyebrow">Registrado con Google</p>
        <div className="account-menu__profile">
          {user.image && (
            <img
              className="account-menu__avatar"
              src={user.image}
              alt=""
              width="38"
              height="38"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="account-menu__profile-text">
            <p className="account-menu__name">{user.name || 'Cliente'}</p>
            {user.email && <p className="account-menu__email">{user.email}</p>}
          </div>
        </div>
        {isAdmin && (
          <a className="account-menu__admin-link" href="/admin.html">
            Panel de administración ↗
          </a>
        )}
        <button className="account-menu__secondary" type="button" onClick={handleSignOut} disabled={isSubmitting}>
          Cerrar sesión
        </button>
        {progress && <p className="account-menu__status" role="status" aria-live="polite">{progress}</p>}
        {message && <p className="account-menu__error" role="alert">{message}</p>}
      </>
    );
  }

  return (
    <>
      <p className="account-menu__eyebrow">Cuenta de cliente</p>
      <p className="account-menu__description">
        Registrate o iniciá sesión con Google para jugar gratis y agilizar tus pedidos por WhatsApp.
      </p>
      <div className="account-menu__providers">
        {providers.map((provider) => (
          <button
            className="account-menu__provider"
            key={provider}
            type="button"
            onClick={() => handleSignIn(provider)}
            disabled={isSubmitting}
          >
            {provider === 'google' && <GoogleIcon />}
            <span>Continuar con {providerLabels[provider] || provider}</span>
          </button>
        ))}
      </div>
      {progress && <p className="account-menu__status" role="status" aria-live="polite">{progress}</p>}
      {message && <p className="account-menu__error" role="alert">{message}</p>}
    </>
  );
}
