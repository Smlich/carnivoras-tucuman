import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { loginAdmin } from '../../services/admin-api';
import CatalogImage from '../CatalogImage';

export default function AdminLogin() {
  const { adminConfigured, adminGoogleAllowed, enabled, providers, refreshAdminSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const googleAvailable = adminGoogleAllowed && enabled && providers.includes('google');

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await loginAdmin({ email, password });
      setPassword('');
      await refreshAdminSession();
    } catch (error) {
      setErrorMessage(error.message || 'No pudimos iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const { authClient } = await import('../../services/auth-client');
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: window.location.origin + '/admin.html',
      });
      if (result?.error) throw new Error('Acceso rechazado.');
    } catch {
      setErrorMessage('No pudimos conectar con Google.');
      setIsSubmitting(false);
    }
  }

  return (
    <main className="admin-login-stage hero-stage">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <div className="admin-login-card__brand">
          <CatalogImage src="/images/catalog/logo-light.png" alt="" className="brand__logo" sizes="48px" />
          <div>
            <span className="admin-badge">Control total del vivero</span>
            <h1 id="admin-login-title">Cuenta de Administrador</h1>
          </div>
        </div>

        <p className="admin-login-card__lead">
          Ingresá para editar el catálogo, precios, stock, textos del sitio, álbum del vivero, juegos en modo Admin y consultas recibidas.
        </p>

        {!adminConfigured && !adminGoogleAllowed && (
          <div className="admin-alert admin-alert--warning" role="alert">
            La cuenta de administración todavía no tiene variables configuradas en este entorno (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET`).
          </div>
        )}

        <form className="admin-form" onSubmit={handleSubmit}>
          <label className="admin-field">
            <span>Correo de administrador</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@carnivorastucuman.com"
            />
          </label>

          <label className="admin-field">
            <span>Contraseña</span>
            <div className="admin-password-row">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Ingresá tu contraseña"
              />
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
          </label>

          {errorMessage && (
            <p className="admin-alert admin-alert--error" role="alert">
              {errorMessage}
            </p>
          )}

          <button className="button button--dark button--full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Verificando acceso…' : 'Entrar al panel de administración'}
          </button>
        </form>

        {googleAvailable && (
          <div className="admin-login-divider">
            <span>O si usás el backend MERN</span>
            <button
              type="button"
              className="admin-btn-secondary admin-btn-secondary--full"
              disabled={isSubmitting}
              onClick={handleGoogleLogin}
            >
              Continuar con cuenta Google autorizada
            </button>
          </div>
        )}

        <p className="admin-login-card__back">
          <a href="/">← Volver al sitio público</a>
        </p>
      </section>
    </main>
  );
}
