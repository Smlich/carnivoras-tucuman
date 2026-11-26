import { useState } from 'react';
import {
  deleteAdminOrder,
  updateAdminAccount,
  updateAdminOrder,
} from '../../services/admin-api';
import { formatPrice } from '../../utils/format-price';

const ORDER_STATUSES = [
  { id: 'nuevo', label: 'Nuevo' },
  { id: 'en-proceso', label: 'En proceso' },
  { id: 'confirmado', label: 'Confirmado' },
  { id: 'entregado', label: 'Entregado' },
  { id: 'cancelado', label: 'Cancelado' },
];

function OrderRow({ order, onChanged, onStatus }) {
  const [status, setStatus] = useState(order.status || 'nuevo');
  const [adminNotes, setAdminNotes] = useState(order.adminNotes || '');
  const [busy, setBusy] = useState(false);

  async function savePatch() {
    setBusy(true);
    try {
      await updateAdminOrder(order.id, { status, adminNotes });
      onStatus({ type: 'success', text: `Consulta ${order.id} actualizada.` });
      await onChanged();
    } catch (error) {
      onStatus({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function removeOrder() {
    if (!window.confirm(`¿Eliminar el registro ${order.id}?`)) return;
    setBusy(true);
    try {
      await deleteAdminOrder(order.id);
      onStatus({ type: 'success', text: `Registro ${order.id} eliminado.` });
      await onChanged();
    } catch (error) {
      onStatus({ type: 'error', text: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="admin-order-card">
      <div className="admin-order-card__top">
        <div>
          <strong>{order.id}</strong>
          <span>{order.customerName ? ` · ${order.customerName}` : ''}</span>
          <small> · {new Date(order.createdAt).toLocaleString('es-AR')}</small>
        </div>
        <strong>{formatPrice(order.totalARS)}</strong>
      </div>
      <ul className="admin-order-card__items">
        {(order.items || []).map((item) => (
          <li key={item.id}>{item.name} × {item.quantity} ({formatPrice(item.price * item.quantity)})</li>
        ))}
      </ul>
      <div className="admin-order-card__controls">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={'Estado de ' + order.id}>
          {ORDER_STATUSES.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          placeholder="Notas internas (ej. coordina entrega jueves)"
        />
        <button type="button" className="admin-btn-secondary" onClick={savePatch} disabled={busy}>Guardar</button>
        <button type="button" className="admin-btn-danger" onClick={removeOrder} disabled={busy}>Borrar</button>
      </div>
    </article>
  );
}

export default function AdminOrdersAccountTab({ adminUser, orders, onChanged, onAccountChanged, onStatus }) {
  const [email, setEmail] = useState(adminUser?.email || '');
  const [name, setName] = useState(adminUser?.name || 'Administrador');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingAccount, setSavingAccount] = useState(false);

  async function handleAccountSubmit(event) {
    event.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      onStatus({ type: 'error', text: 'La nueva contraseña y su confirmación no coinciden.' });
      return;
    }

    setSavingAccount(true);
    try {
      await updateAdminAccount({
        email,
        name,
        currentPassword,
        newPassword: newPassword || undefined,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onStatus({ type: 'success', text: 'Datos y seguridad de la cuenta de administrador actualizados.' });
      await onAccountChanged();
    } catch (error) {
      onStatus({ type: 'error', text: error.message });
    } finally {
      setSavingAccount(false);
    }
  }

  return (
    <div className="admin-split">
      <section className="admin-panel">
        <h2>Consultas y pedidos recibidos ({orders.length})</h2>
        <p>Cada consulta enviada desde «Mi pedido → WhatsApp» queda registrada acá para hacer seguimiento.</p>

        {orders.length === 0 ? (
          <p className="admin-empty">Todavía no hay consultas registradas.</p>
        ) : (
          <div className="admin-orders-list">
            {orders.map((order) => (
              <OrderRow key={order.id} order={order} onChanged={onChanged} onStatus={onStatus} />
            ))}
          </div>
        )}
      </section>

      <section className="admin-panel">
        <h2>Cuenta y Seguridad</h2>
        <p>Cambiá el correo de administrador, el nombre visible o tu contraseña cuando quieras.</p>

        <form className="admin-form" onSubmit={handleAccountSubmit}>
          <label className="admin-field">
            <span>Correo de administrador</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="admin-field">
            <span>Nombre visible</span>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="admin-field">
            <span>Contraseña actual (para confirmar)</span>
            <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </label>
          <label className="admin-field">
            <span>Nueva contraseña (opcional, mínimo 8 caracteres)</span>
            <input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Dejá vacío para mantener la actual" />
          </label>
          <label className="admin-field">
            <span>Confirmar nueva contraseña</span>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </label>

          <button type="submit" className="button button--dark" disabled={savingAccount}>
            {savingAccount ? 'Actualizando…' : 'Actualizar cuenta de administrador'}
          </button>
        </form>
      </section>
    </div>
  );
}
