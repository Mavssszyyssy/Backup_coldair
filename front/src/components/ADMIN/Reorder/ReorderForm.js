import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../../config/api';
import { useUser } from '../../../context/UserContext';
import { translateText } from '../../../utils/customerI18n';
import { formatCartHorsepower } from '../../../domain/cart/cartProductDetails';
import './styles.css';

const ReorderForm = ({ item, onSubmitted }) => {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setQuantity(item?.threshold ? String(Math.max(1, Number(item.threshold) - Number(item.stock || 0))) : '');
    setNotes('');
    setMessage('');
    setError('');
  }, [item]);

  const submit = async (event) => {
    event.preventDefault();
    if (!item) return;
    const requestedQuantity = Number(quantity);
    if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
      setError('Enter a whole quantity greater than zero.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await apiRequest('/reorders', {
        method: 'POST',
        body: JSON.stringify({ productId: item.id, quantity: requestedQuantity, notes }),
      });
      setMessage(`${t('Request sent:')} ${requestedQuantity} ${t('unit(s) of')} ${item.name}. ${t('Stock will change only after SuperAdmin approval.')}`);
      onSubmitted?.();
    } catch (requestError) {
      setError(requestError.message || 'Unable to submit the reorder request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="reorder-form" onSubmit={submit}>
      <h2>{t("Create reorder request")}</h2>
      {item ? (
        <>
          <div className="reorder-product-summary"><strong>{item.name}</strong><span>{item.sku || 'No SKU'} · {formatCartHorsepower(item)} · {Number(item.stock || 0)} {t("currently in stock")}</span></div>
          <label>{t("Quantity to request")}<input type="number" min="1" step="1" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
          <label>{t("Note for SuperAdmin")} <span>{t("(optional)")}</span><textarea rows="4" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t("Supplier, urgency, or branch notes")} /></label>
          <button className="reorder-primary-action" type="submit" disabled={saving}>{t(saving ? 'Sending request…' : 'Send Reorder Request')}</button>
          <p className="reorder-helper">{t("Approval adds stock and generates the inventory serial records for this branch.")}</p>
        </>
      ) : <div className="reorder-empty">{t("Choose a low-stock product to begin.")}</div>}
      {error ? <p className="reorder-message is-error">{t(error)}</p> : null}
      {message ? <p className="reorder-message is-success">{t(message)}</p> : null}
    </form>
  );
};

export default ReorderForm;
