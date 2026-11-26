import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import '../admin-page.css';
import AdminDashboard from '../components/admin/AdminDashboard';
import AdminLogin from '../components/admin/AdminLogin';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { SiteContentProvider } from '../context/SiteContentContext';

function AdminGate() {
  const { isAdmin, isAdminLoading } = useAuth();

  if (isAdminLoading) {
    return (
      <main className="admin-login-stage hero-stage">
        <p className="admin-loading-light" role="status">Comprobando sesión de administrador…</p>
      </main>
    );
  }

  return isAdmin ? <AdminDashboard /> : <AdminLogin />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <SiteContentProvider>
        <AdminGate />
      </SiteContentProvider>
    </AuthProvider>
  </StrictMode>,
);
