import { VAT_RATE } from './vatRate';
import { getDeliveryFeeForArea } from './deliveryFeeByArea';

/**
 * @param {Object} params
 * @param {number} params.subtotal - sum of line items before tax
 * @param {string} params.serviceAreaId
 * @param {number} [params.discountAmount=0] - absolute discount in PHP
 * @returns {{ subtotal: number, vatAmount: number, deliveryFee: number, discountAmount: number, total: number }}
 */
export function computePurchaseTotals({ subtotal, serviceAreaId, discountAmount = 0 }) {
  const deliveryFee = getDeliveryFeeForArea(serviceAreaId);
  const taxableBase = Math.max(0, subtotal - discountAmount);
  const vatAmount = Math.round(taxableBase * VAT_RATE * 100) / 100;
  const total = Math.round((taxableBase + vatAmount + deliveryFee) * 100) / 100;

  return {
    subtotal,
    vatAmount,
    deliveryFee,
    discountAmount,
    total
  };
}
