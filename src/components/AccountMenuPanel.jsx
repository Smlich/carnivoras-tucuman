import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const providerLabels = {
  google: 'Google',
  facebook: 'Facebook',
  email: 'Correo',
};

const providerEyebrows = {
  google: 'Registrado con Google',
  facebook: 'Registrado con Facebook',
  email: 'Cuenta con correo',
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

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#1877F2" />
      <path
        fill="#FFFFFF"
        d="M15.1 12.9l.45-2.85h-2.74V8.2c0-.78.38-1.54 1.6-1.54h1.24V4.23s-1.12-.19-2.2-.19c-2.25 0-3.72 1.36-3.72 3.83v2.18H7.2v2.85h2.53v6.89a10.2 10.2 0 0 0 3.08 0v-6.89h2.29z"
      />
    </svg>
  );
}

export default function AccountMenuPanel({ providers }) {
  const { user, isAdmin, isLoading, signInWithProvider, signInWithEmail, registerWithEmail, signOut } = useAuth();
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailMode, setEmailMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const oauthProviders = providers.filter((provider) => provider === 'google' || provider === 'facebook');
  const hasEmailAuth = providers.includes('email');

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

  async function handleEmailSubmit(event) {
    event.preventDefault();
    setMessage('');
    setProgress(emailMode === 'register' ? 'Creando tu cuenta…' : 'Ingresando…');
    setIsSubmitting(true);

    try {
      if (emailMode === 'register') {
        await registerWithEmail({ name, email, password });
      } else {
        await signInWithEmail({ email, password });
      }
      setProgress('');
    } catch (error) {
      setMessage(error?.message || 'No pudimos completar el ingreso con correo.');
      setProgress('');
    } finally {
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
    const eyebrow = providerEyebrows[user.provider] || 'Cuenta activa';
    return (
      <>
        <p className="account-menu__eyebrow">{eyebrow}</p>
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
        Registrate o iniciá sesión para jugar gratis y agilizar tus pedidos por WhatsApp.
      </p>
      {oauthProviders.length > 0 && (
        <div className="account-menu__providers">
          {oauthProviders.map((provider) => (
            <button
              className="account-menu__provider"
              key={provider}
              type="button"
              onClick={() => handleSignIn(provider)}
              disabled={isSubmitting}
            >
              {provider === 'google' && <GoogleIcon />}
              {provider === 'facebook' && <FacebookIcon />}
              <span>Continuar con {providerLabels[provider] || provider}</span>
            </button>
          ))}
        </div>
      )}

      {oauthProviders.length > 0 && hasEmailAuth && (
        <div className="account-menu__divider" aria-hidden="true">
          <span>o con tu correo</span>
        </div>
      )}

      {hasEmailAuth && (
        <div className="account-menu__email-auth">
          <div className="account-menu__tabs" role="tablist" aria-label="Acceso con correo">
            <button
              className={`account-menu__tab${emailMode === 'login' ? ' is-active' : ''}`}
              type="button"
              role="tab"
              aria-selected={emailMode === 'login'}
              onClick={() => {
                setEmailMode('login');
                setMessage('');
              }}
              disabled={isSubmitting}
            >
              Ingresar
            </button>
            <button
              className={`account-menu__tab${emailMode === 'register' ? ' is-active' : ''}`}
              type="button"
              role="tab"
              aria-selected={emailMode === 'register'}
              onClick={() => {
                setEmailMode('register');
                setMessage('');
              }}
              disabled={isSubmitting}
            >
              Crear cuenta
            </button>
          </div>

          <form className="account-menu__form" onSubmit={handleEmailSubmit}>
            {emailMode === 'register' && (
              <label className="account-menu__field">
                <span>Nombre</span>
                <input
                  type="text"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Tu nombre"
                  autoComplete="name"
                  minLength={2}
                  maxLength={80}
                  required
                  disabled={isSubmitting}
                />
              </label>
            )}
            <label className="account-menu__field">
              <span>Correo</span>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
                maxLength={160}
                required
                disabled={isSubmitting}
              />
            </label>
            <label className="account-menu__field">
              <span>Contraseña</span>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={emailMode === 'register' ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
                autoComplete={emailMode === 'register' ? 'new-password' : 'current-password'}
                minLength={emailMode === 'register' ? 8 : 1}
                maxLength={200}
                required
                disabled={isSubmitting}
              />
            </label>
            <button className="account-menu__submit" type="submit" disabled={isSubmitting}>
              {emailMode === 'register' ? 'Crear cuenta gratis' : 'Entrar con correo'}
            </button>
          </form>
        </div>
      )}

      {progress && <p className="account-menu__status" role="status" aria-live="polite">{progress}</p>}
      {message && <p className="account-menu__error" role="alert">{message}</p>}
    </>
  );
}
