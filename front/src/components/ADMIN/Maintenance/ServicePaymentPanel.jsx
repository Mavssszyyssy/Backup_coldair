import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../../config/api';
export default function ServicePaymentPanel({ request, onUpdated }) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const payment = request.servicePayment;
  useEffect(() => { setAmount(payment?.baseAmount == null ? payment?.amount == null ? '' : String(payment.amount) : String(payment.baseAmount)); setError(''); }, [request.id, payment?.amount, payment?.baseAmount]);
  const closed = ['Completed', 'Cancelled'].includes(request.status);
  const locked = closed || ['paid', 'warranty_covered'].includes(payment?.status);
  const save = async () => {
    setBusy(true); setError('');
    try {
      const result = await apiRequest(`/service-requests/${request.id}/quote`, { method: 'PATCH', body: JSON.stringify({ amount }) });
      onUpdated({ ...request, servicePayment: result.servicePayment });
    } catch (err) { setError(err.message || 'Unable to save quote.'); }
    finally { setBusy(false); }
  };
  return <section className="maintenance-detail-section">
    <h3>Service payment</h3>
    <p>{payment?.status === 'warranty_covered' ? 'Approved warranty coverage — no cash due.' : payment?.amount == null ? closed ? 'Payment amount not recorded for this closed visit.' : 'Admin quote required. The technician cannot collect or finish a paid visit until its amount is set.' : `Final service price: PHP ${Number(payment.amount).toFixed(2)} · ${payment.status === 'paid' ? 'Cash collected' : payment.status === 'no_charge' ? 'No charge' : closed ? 'No collection recorded' : 'Cash due after GPS arrival'}`}</p>
    {payment?.amount != null ? <p>Base service: PHP {Number(payment.baseAmount || 0).toFixed(2)} · Labor: PHP {Number(payment.laborCost || 0).toFixed(2)} · Parts: PHP {Number(payment.partsCost || 0).toFixed(2)}</p> : null}
    {payment?.collectedAt ? <p>Collected: {new Date(payment.collectedAt).toLocaleString()}</p> : null}
    {!locked ? <><label className="maintenance-assignment-field">Base service quote (PHP)<input inputMode="decimal" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} disabled={busy} /></label><button className="maintenance-button" type="button" disabled={busy || amount.trim() === ''} onClick={save}>{busy ? 'Saving quote…' : 'Save service quote'}</button><p>Labor and parts recorded by the technician are added to this base quote before payment. Enter 0 only for an explicitly free base service.</p></> : null}
    {error ? <p role="alert">{error}</p> : null}
  </section>;
}
