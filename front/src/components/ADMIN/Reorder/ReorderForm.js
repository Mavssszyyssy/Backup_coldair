import React, { useEffect, useState } from 'react';
import { apiRequest } from '../../../config/api';
import './styles.css';

const ReorderForm = ({ item, onSubmitted }) => {
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
      setMessage(`Request sent: ${requestedQuantity} unit(s) of ${item.name}. Stock will change only after SuperAdmin approval.`);
      onSubmitted?.();
    } catch (requestError) {
      setError(requestError.message || 'Unable to submit the reorder request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="reorder-form" onSubmit={submit}>
      <h2>Create reorder request</h2>
      {item ? (
        <>
          <div className="reorder-product-summary"><strong>{item.name}</strong><span>{item.sku || 'No SKU'} · {Number(item.stock || 0)} currently in stock</span></div>
          <label>Quantity to request<input type="number" min="1" step="1" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
          <label>Note for SuperAdmin <span>(optional)</span><textarea rows="4" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Supplier, urgency, or branch notes" /></label>
          <button className="reorder-primary-action" type="submit" disabled={saving}>{saving ? 'Sending request…' : 'Send Reorder Request'}</button>
          <p className="reorder-helper">Approval adds stock and generates the inventory serial records for this branch.</p>
        </>
      ) : <div className="reorder-empty">Choose a low-stock product to begin.</div>}
      {error ? <p className="reorder-message is-error">{error}</p> : null}
      {message ? <p className="reorder-message is-success">{message}</p> : null}
    </form>
  );
};

export default ReorderForm;
