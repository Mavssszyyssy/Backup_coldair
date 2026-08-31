import { Bell } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../../config/api';

const routeForNotification = (item = {}) => {
  if (String(item.route || '').startsWith('/superadmin/')) return item.route;
  const targetType = String(item.targetType || item.category || '').toLowerCase();
  if (['amp_pipeline', 'maintenance_pipeline'].includes(targetType)) return '/manager/amp';
  if (['contact', 'contact_message'].includes(targetType)) return '/superadmin/services?tab=customer-messages';
  if (['inventory', 'stock', 'reorder'].includes(targetType)) return '/superadmin/inventory';
  if (['warranty', 'claim', 'service', 'parts_request'].includes(targetType)) return '/superadmin/services?tab=service-requests';
  if (['task', 'technician'].includes(targetType)) return '/superadmin/services?tab=technicians';
  const text = `${item.title || ''} ${item.message || ''}`.toLowerCase();
  if (text.includes('complaint') || text.includes('refund') || text.includes('cancel')) return '/superadmin/alerts';
  if (text.includes('stock') || text.includes('inventory') || text.includes('reorder')) return '/superadmin/inventory?tab=reorders';
  if (text.includes('technician') || text.includes('task')) return '/superadmin/services?tab=technicians';
  if (item.type === 'order' || text.includes('order')) return '/superadmin/services?tab=orders';
  return '/superadmin/dashboard';
};

const timeLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const SuperAdminNotificationsBell = () => {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const result = await apiRequest('/notifications/me');
      setItems((result.notifications || []).map((item) => ({
        ...item,
        id: item.id || item._id,
        unread: Boolean(item.unread),
        to: routeForNotification(item),
      })));
    } catch (_error) {
      setItems([]);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const pollId = window.setInterval(refresh, 20000);
    return () => window.clearInterval(pollId);
  }, [refresh]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!open) return;
      if (panelRef.current?.contains(event.target) || buttonRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  const unreadCount = useMemo(() => items.filter((item) => item.unread).length, [items]);
  const markAllRead = async () => {
    try { await apiRequest('/notifications/me/read-all', { method: 'PATCH' }); } catch (_error) { /* Refresh will retry later. */ }
    setItems((current) => current.map((item) => ({ ...item, unread: false })));
  };
  const openNotification = async (item) => {
    if (item.unread && item.id) {
      try { await apiRequest(`/notifications/${item.id}/read`, { method: 'PATCH' }); } catch (_error) { /* Navigation remains available. */ }
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, unread: false } : entry));
    }
    setOpen(false);
    navigate(item.to);
  };

  return <div className="super-notifications">
    <button ref={buttonRef} type="button" className="super-notifications-button" onClick={() => setOpen((value) => !value)} aria-label="Open notifications">
      <Bell size={20} weight="bold" />
      {unreadCount ? <span>{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
    </button>
    {open ? <section ref={panelRef} className="super-notifications-panel" role="dialog" aria-label="Super Admin notifications">
      <header><div><strong>Notifications</strong><small>{unreadCount ? `${unreadCount} unread` : 'All caught up'}</small></div><div><button type="button" onClick={refresh} disabled={busy}>{busy ? 'Loading…' : 'Refresh'}</button><button type="button" onClick={markAllRead} disabled={!unreadCount}>Mark read</button></div></header>
      {items.length === 0 ? <p className="super-notifications-empty">No alerts right now.</p> : <div className="super-notifications-list">{items.map((item) => <button type="button" key={item.id} className={item.unread ? 'unread' : ''} onClick={() => openNotification(item)}><strong>{item.title || 'System notification'}</strong><span>{item.message || 'No additional details.'}</span><small>{timeLabel(item.createdAt)}</small></button>)}</div>}
    </section> : null}
  </div>;
};

export default SuperAdminNotificationsBell;
