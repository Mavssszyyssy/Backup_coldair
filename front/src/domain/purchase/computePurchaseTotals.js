import { VAT_RATE } from './vatRate';
import { getDeliveryFeeForArea } from './deliveryFeeByArea';

export const PAYMONGO_TEST_SKU = 'TEST-PAYMONGO-001';

export const isPaymongoTestItem = (item = {}) =>
  [item.sku, item.model, item.productSku, item.id, item.productId]
    .map((value) => String(value || '').trim().toUpperCase())
    .includes(PAYMONGO_TEST_SKU);

export const isPaymongoTestCart = (items = []) =>
  Array.isArray(items) && items.length > 0 && items.every(isPaymongoTestItem);

/**
 * @param {Object} params
 * @param {number} params.subtotal - sum of line items before tax
 * @param {string} params.serviceAreaId
 * @param {number} [params.discountAmount=0] - absolute discount in PHP
 * @returns {{ subtotal: number, vatAmount: number, deliveryFee: number, discountAmount: number, total: number }}
 */
export function computePurchaseTotals({ subtotal, serviceAreaId, discountAmount = 0, isTestCheckout = false }) {
  const deliveryFee = isTestCheckout ? 0 : getDeliveryFeeForArea(serviceAreaId);
  const taxableBase = Math.max(0, subtotal - discountAmount);
  const vatAmount = isTestCheckout ? 0 : Math.round(taxableBase * VAT_RATE * 100) / 100;
  const total = Math.round((taxableBase + vatAmount + deliveryFee) * 100) / 100;

  return {
    subtotal,
    vatAmount,
    deliveryFee,
    discountAmount,
    total
  };
}
