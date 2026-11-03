import { VAT_RATE } from '../../domain/purchase/vatRate';
import { useUser } from '../../context/UserContext';
import { translateText } from '../../utils/customerI18n';

/**
 * @param {Object} props
 * @param {{ subtotal: number, vatAmount: number, deliveryFee: number, discountAmount: number, total: number }} props.totals
 */
function PurchaseCostBreakdown({ totals }) {
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  return (
    <div className="purchase-cost-breakdown">
      <div className="summary-row">
        <span>{t("Subtotal (unit prices)")}</span>
        <span>₱{totals.subtotal.toLocaleString()}</span>
      </div>
      {totals.discountAmount > 0 && (
        <div className="summary-row discount-row">
          <span>{t("Discounts")}</span>
          <span>−₱{totals.discountAmount.toLocaleString()}</span>
        </div>
      )}
      <div className="summary-row">
        <span>{t("Value-added tax")} ({Math.round(VAT_RATE * 100)}%)</span>
        <span>₱{totals.vatAmount.toLocaleString()}</span>
      </div>
      <div className="summary-row">
        <span>{t("Delivery fee (by shipping address / area)")}</span>
        <span>₱{totals.deliveryFee.toLocaleString()}</span>
      </div>
    </div>
  );
}

export default PurchaseCostBreakdown;
