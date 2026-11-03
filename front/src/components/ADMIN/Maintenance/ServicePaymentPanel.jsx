import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../../config/api';
import { useUser } from '../../../context/UserContext';
import { translateText } from '../../../utils/customerI18n';
import { alertDialog } from '../../../utils/dialog';
import { formatBusinessDateTime } from '../../../utils/dateTime';
export default function ServicePaymentPanel({ request, onUpdated }) {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
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
      const savedAmount = Number(result.servicePayment?.baseAmount ?? result.servicePayment?.amount ?? amount);
      const savedAmountLabel = Number.isFinite(savedAmount)
        ? savedAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : String(amount);
      void alertDialog({
        title: t('Service quote saved'),
        message: `${t('The service quote of PHP')} ${savedAmountLabel} ${t('was saved successfully.')}`,
        confirmText: t('Done'),
      });
    } catch (err) { setError(err.message || 'Unable to save quote.'); }
    finally { setBusy(false); }
  };
  return <section className="maintenance-detail-section">
    <h3>{t("Service payment")}</h3>
    <p>{payment?.status === 'warranty_covered' ? t('Approved warranty coverage — no cash due.') : payment?.amount == null ? t(closed ? 'Payment amount not recorded for this closed visit.' : 'Admin quote required. The technician cannot collect or finish a paid visit until its amount is set.') : `${t('Final service price: PHP')} ${Number(payment.amount).toFixed(2)} · ${t(payment.status === 'paid' ? 'Cash collected' : payment.status === 'no_charge' ? 'No charge' : closed ? 'No collection recorded' : 'Cash due after GPS arrival')}`}</p>
    {payment?.amount != null ? <p>{t("Base service: PHP")} {Number(payment.baseAmount || 0).toFixed(2)} {t("· Labor: PHP")} {Number(payment.laborCost || 0).toFixed(2)} {t("· Parts: PHP")} {Number(payment.partsCost || 0).toFixed(2)}</p> : null}
    {payment?.collectedAt ? <p>{t("Collected:")} {formatBusinessDateTime(payment.collectedAt)}</p> : null}
    {!locked ? <><label className="maintenance-assignment-field">{t("Base service quote (PHP)")}<input inputMode="decimal" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} disabled={busy} /></label><button className="maintenance-button" type="button" disabled={busy || amount.trim() === ''} onClick={save}>{t(busy ? 'Saving quote…' : 'Save service quote')}</button><p>{t("Labor and parts recorded by the technician are added to this base quote before payment. Enter 0 only for an explicitly free base service.")}</p></> : null}
    {error ? <p role="alert">{t(error)}</p> : null}
  </section>;
}
