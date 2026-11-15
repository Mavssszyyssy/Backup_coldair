import LoadingSkeleton from "../LoadingSkeleton";
import { MagnifyingGlassPlus, ShoppingCartSimple, Snowflake, Trash } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import BoutiqueDrawer from "./BoutiqueDrawer";
import BoutiqueNumberInput from "./BoutiqueNumberInput";
import { getBrandLogo } from "../../../config/brandLogos";
import { getCatalogThumbnailUrl } from "../../../config/catalogImages";
import { formatCartHorsepower, formatCartModel } from "../../../domain/cart/cartProductDetails";
import { translateText } from "../../../utils/customerI18n";
import { formatPesoAmount } from "../../../utils/currency";
import "./BoutiqueCart.css";

function CartItemImage({ item, fullSize = false }) {
  const [failedImage, setFailedImage] = useState("");
  const [brandBroken, setBrandBroken] = useState(false);
  const originalImage = item.imageUrl?.trim() || "";
  const thumbnailImage = fullSize ? originalImage : getCatalogThumbnailUrl(originalImage);
  const source = failedImage === thumbnailImage
    ? (thumbnailImage === originalImage ? "" : originalImage)
    : failedImage === originalImage ? "" : thumbnailImage;
  const brandLogo = getBrandLogo(item.brand);

  if (source) {
    return <img src={source} alt={fullSize ? item.name : ""} loading={fullSize ? "eager" : "lazy"} decoding="async" onError={() => setFailedImage(source)} />;
  }
  if (brandLogo && !brandBroken) {
    return <img src={brandLogo} className="bq-cart-brand" alt={fullSize ? item.brand : ""} onError={() => setBrandBroken(true)} />;
  }
  return <Snowflake size={32} aria-hidden="true" />;
}

function formatPrice(price) {
  return `₱${formatPesoAmount(price)}`;
}

function CartQuantity({ item, onUpdateQuantity, t }) {
  const [error, setError] = useState("");
  const max = item.stock != null && Number.isSafeInteger(Number(item.stock)) ? Number(item.stock) : null;
  const updateQuantity = (value) => {
    const quantity = Number(value);
    if (!/^\d+$/.test(String(value).trim()) || !Number.isSafeInteger(quantity) || quantity < 1) {
      setError("Enter a positive whole number.");
      return;
    }
    if (max !== null && quantity > max) {
      setError("The requested quantity exceeds this branch's available stock. Reduce the quantity and try again.");
      return;
    }
    setError("");
    if (quantity !== item.quantity) onUpdateQuantity(item.id, quantity);
  };

  return (
    <div className="bq-cart-quantity">
      <BoutiqueNumberInput
        size="sm"
        value={item.quantity}
        onChange={updateQuantity}
        onInvalid={() => setError("Enter a whole number within the available stock.")}
        min={1}
        max={max}
        strict
        ariaLabel={t("Quantity")}
        width="144px"
      />
      {error && <small role="alert">{t(error)}</small>}
    </div>
  );
}

function CartProductSpecs({ item, t }) {
  return (
    <div className="bq-cart-specs">
      <span>{t("Model:")} {formatCartModel(item)}</span>
      <span>{t("Horsepower:")} {formatCartHorsepower(item)}</span>
    </div>
  );
}

export default function BoutiqueCart({
  currentLanguage = "English", isOpen, onClose, cart, loading = false,
  onUpdateQuantity, onRemoveItem, onCheckout, getCartTotal,
}) {
  const t = (value) => translateText(value, currentLanguage);
  const [selectedId, setSelectedId] = useState(null);
  const item = cart.find((entry) => entry.id === selectedId);
  const detailsRef = useRef(null);
  const listRef = useRef(null);
  const opener = useRef(null);

  useEffect(() => {
    if (!isOpen || loading) {
      setSelectedId(null);
      opener.current = null;
    } else if (item) {
      detailsRef.current?.focus();
    } else if (opener.current) {
      const { id, scrollTop } = opener.current;
      const list = listRef.current;
      const photo = [...(list?.querySelectorAll("[data-cart-photo]") || [])].find((button) => button.dataset.cartPhoto === String(id));
      if (list) list.scrollTop = scrollTop;
      photo?.focus({ preventScroll: true });
      opener.current = null;
      setSelectedId(null);
    }
  }, [isOpen, loading, item?.id]);

  const showDetails = (id) => {
    opener.current = { id, scrollTop: listRef.current?.scrollTop || 0 };
    setSelectedId(id);
  };
  const showCart = () => setSelectedId(null);

  return (
    <BoutiqueDrawer
      isOpen={isOpen}
      onClose={item ? showCart : onClose}
      side="right"
      width="min(440px, 100%)"
      className="bq-cart-drawer"
      title={t(item ? "Cart item details" : "Your Cart")}
      backLabel={item ? t("Back to cart") : undefined}
      currentLanguage={currentLanguage}
    >
      {item ? (
        <>
          <section className="bq-cart-details" tabIndex={-1} ref={detailsRef}>
            <div className="bq-cart-detail-image"><CartItemImage key={item.id} item={item} fullSize /></div>
            <div>
              <h3>{item.name}</h3>
              <CartProductSpecs item={item} t={t} />
            </div>
            <div className="bq-cart-detail-row">
              <span>{t("Unit price")}</span>
              <strong>{formatPrice(item.price)}</strong>
            </div>
            <div className="bq-cart-detail-row">
              <span>{t("Quantity")}</span>
              <CartQuantity item={item} onUpdateQuantity={onUpdateQuantity} t={t} />
            </div>
          </section>
          <div className="bq-cart-footer">
            <div className="bq-cart-total" aria-live="polite">
              <span>{t("Item total")}</span><strong>{formatPrice(item.price * item.quantity)}</strong>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="bq-cart-items" ref={listRef}>
            {loading ? <LoadingSkeleton label={t("Loading your cart…")} /> : cart.length === 0 ? (
              <div className="bq-cart-empty">
                <ShoppingCartSimple size={48} aria-hidden="true" />
                <p>{t("Your cart is empty.")}</p>
              </div>
            ) : cart.map((line) => (
              <article className="bq-cart-item" key={line.id}>
                <button type="button" className="bq-cart-photo" data-cart-photo={line.id}
                  aria-label={`${t("View details")}: ${line.name}`} aria-haspopup="dialog" onClick={() => showDetails(line.id)}>
                  <CartItemImage item={line} />
                  <span className="bq-cart-zoom"><MagnifyingGlassPlus size={16} aria-hidden="true" /></span>
                </button>
                <div className="bq-cart-line-summary">
                  <h3>{line.name}</h3>
                  <CartProductSpecs item={line} t={t} />
                  <strong>{formatPrice(line.price * line.quantity)}</strong>
                </div>
                <div className="bq-cart-controls">
                  <CartQuantity item={line} onUpdateQuantity={onUpdateQuantity} t={t} />
                  <button className="bq-cart-remove" type="button" aria-label={`${t("Remove")} ${line.name}`} onClick={() => onRemoveItem(line.id)}>
                    <Trash size={18} aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!loading && cart.length > 0 && (
            <div className="bq-cart-footer">
              <div className="bq-cart-total">
                <span>{t("Subtotal")}</span><strong>{formatPrice(getCartTotal())}</strong>
              </div>
              <button type="button" className="bq-cart-checkout" onClick={onCheckout}>{t("Checkout Now")}</button>
            </div>
          )}
        </>
      )}
    </BoutiqueDrawer>
  );
}
