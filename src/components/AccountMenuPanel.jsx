import { useEffect, useState } from 'react';
import { authClient } from '../services/auth-client';

const providerLabels = {
  google: 'Google',
  facebook: 'Facebook',
};

export default function AccountMenuPanel({ providers, onAccountNameChange }) {
  const { data: session, isPending, refetch } = authClient.useSession();
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    onAccountNameChange(session?.user?.name || 'Mi cuenta');
  }, [onAccountNameChange, session?.user?.name]);

  async function handleSignIn(provider) {
    setMessage('');
    setProgress(`Conectando con ${providerLabels[provider] || provider}…`);
    setIsSubmitting(true);

    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: window.location.origin,
      });

      if (result.error) throw new Error('Inicio de sesión rechazado.');
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
      const result = await authClient.signOut();
      if (result.error) throw new Error('Cierre de sesión rechazado.');
      await refetch();
    } catch {
      setMessage('No pudimos cerrar la sesión. Volvé a intentarlo.');
    } finally {
      setIsSubmitting(false);
      setProgress('');
    }
  }

  if (isPending) return <p className="account-menu__status" role="status">Cargando tu cuenta…</p>;

  if (session?.user) {
    return (
      <>
        <p className="account-menu__eyebrow">Sesión iniciada</p>
        <p className="account-menu__name">{session.user.name || 'Cliente'}</p>
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
      {progress && <p className="account-menu__status" role="status" aria-live="polite">{progress}</p>}
      {message && <p className="account-menu__error" role="alert">{message}</p>}
    </>
  );
}
