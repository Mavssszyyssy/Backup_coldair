import {
  Cards,
  ComputerTower,
  Lightning,
  ShieldCheck,
  Snowflake,
  SquareSplitHorizontal,
  X,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { getBrandLogo } from "../../config/brandLogos";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueNumberInput from "../common/boutique/BoutiqueNumberInput";
import BoutiqueTechnicalCard from "../common/boutique/BoutiqueTechnicalCard";
import {
  BQ_COLORS,
  BQ_FONTS,
  BQ_SHADOWS,
  BQ_WEIGHTS,
} from "../common/boutique/BoutiqueTheme";

const DEFAULT_CATALOG_IMAGE_URL =
  "https://images.pexels.com/photos/16592625/pexels-photo-16592625/free-photo-of-air-conditioner-in-a-house.jpeg?auto=compress&dpr=1&h=750&w=1260";

function productPlaceholderIcon(product) {
  if (product?.category === "window") return SquareSplitHorizontal;
  if (product?.category === "floor") return ComputerTower;
  if (product?.category === "split") return Cards;
  return Snowflake;
}

function ModalProductImage({ product }) {
  const [imgBroken, setBroken] = useState(false);
  const IconComp = productPlaceholderIcon(product);
  const imageUrl = product?.imageUrl || DEFAULT_CATALOG_IMAGE_URL;
  const hasImage = imageUrl.trim() !== "";

  if (hasImage && !imgBroken) {
    return (
      <img
        src={imageUrl}
        alt={product.name}
        onError={() => setBroken(true)}
        className="bq-modal-img"
      />
    );
  }

  return (
    <div className="bq-modal-fallback">
      <IconComp size={120} weight="bold" />
    </div>
  );
}

function ProductModal({ product, onClose, onAddToCart }) {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setQuantity(1);
  }, [product?.id]);

  const availableStock = product?.stock;
  const maxQuantity = product?.stock || 0;
  const isOutOfStock = maxQuantity <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    const finalQty = parseInt(quantity) || 1;
    onAddToCart(product, finalQty);
    onClose();
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    const finalQty = parseInt(quantity) || 1;
    onAddToCart(product, finalQty);
    onClose();
    window.dispatchEvent(new CustomEvent("bq:buy-now"));
  };

  if (!product) return null;

  // Strip brand and AC from title
  const nameBase = product.name
    .toLowerCase()
    .startsWith(product.brand.toLowerCase())
    ? product.name.slice(product.brand.length).trim()
    : product.name;

  const displayName = nameBase.replace(/\s*AC\s*$/gi, "").trim();

  const horsepower = product.specs || product.capacity || "";
  const brandLogoUrl = getBrandLogo(product.brand);
  const currentQty = parseInt(quantity) || 1;
  const totalPrice = product.price * currentQty;

  return (
    <div className="bq-modal-overlay" onClick={onClose}>
      <div className="bq-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Floating Close Button outside modal boundary */}
        <button className="bq-modal-floating-close" onClick={onClose}>
          <X size={24} weight="bold" />
        </button>

        <div className="bq-modal-grid">
          <div className="bq-modal-visual">
            <ModalProductImage product={product} />
          </div>

          <div className="bq-modal-body">
            <div className="bq-modal-header">
              <div className="bq-header-top-row">
                <div className="bq-modal-brand-line">
                  <div className="bq-modal-logo">
                    <img src={brandLogoUrl} alt={product.brand} />
                  </div>
                  <div className="bq-modal-title-stack">
                    <span className="bq-modal-model-label">
                      {product.model || "MODEL"}
                    </span>
                    <h2 className="bq-modal-title">{displayName}</h2>
                  </div>
                </div>
              </div>
            </div>

            <div className="bq-modal-main">
              <p className="bq-modal-desc">{product.description}</p>

              <div className="bq-modal-specs-scroll-area">
                <div className="bq-modal-specs-row">
                  <BoutiqueTechnicalCard variant="blue" size="md">
                    {horsepower}
                  </BoutiqueTechnicalCard>
                  <BoutiqueTechnicalCard variant="neutral" size="md">
                    {product.brand}
                  </BoutiqueTechnicalCard>
                  <BoutiqueTechnicalCard variant="neutral" size="md">
                    {product.model || "N/A"}
                  </BoutiqueTechnicalCard>
                </div>
              </div>

              <div className="bq-modal-warranty-row">
                <ShieldCheck size={18} weight="bold" /> {product.warranty}
              </div>
            </div>

            <div className="bq-transaction-hub">
              <div className="bq-interactive-footer">
                <div className="bq-selection-column">
                  <div className="bq-misc-badges">
                    <BoutiqueTechnicalCard
                      variant={isOutOfStock ? "danger" : "success"}
                      size="sm"
                    >
                      {isOutOfStock
                        ? "Temporarily Unavailable"
                        : `${availableStock} units available`}
                    </BoutiqueTechnicalCard>
                  </div>
                  <BoutiqueNumberInput
                    value={quantity}
                    onChange={setQuantity}
                    max={maxQuantity}
                    width="180px"
                  />
                </div>

                <div className="bq-modal-reveal-container">
                  <div className="bq-modal-reveal-group">
                    <div className="bq-modal-price-row">
                      <div className="bq-price-main">
                        <span className="bq-price-symbol">₱</span>
                        <span className="bq-price-num">
                          {totalPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="bq-modal-buy-row">
                      <BoutiqueButton
                        variant="outline"
                        fullWidth
                        onClick={handleBuyNow}
                        disabled={isOutOfStock}
                      >
                        Buy Now <Lightning size={18} weight="fill" />
                      </BoutiqueButton>
                    </div>
                  </div>

                  <div className="bq-modal-add-row">
                    <BoutiqueButton
                      variant="primary"
                      fullWidth
                      onClick={handleAddToCart}
                      disabled={isOutOfStock}
                    >
                      {isOutOfStock ? "Unavailable" : "Add to Cart"}
                    </BoutiqueButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.5); backdrop-filter: blur(20px);
          z-index: 3000; display: flex; align-items: center; justify-content: center;
          padding: 24px; animation: bq-fade-in 0.3s ease;
        }

        .bq-modal-floating-close {
          position: absolute;
          top: -20px;
          right: -20px;
          background: white; border: 1.5px solid ${BQ_COLORS.border}; color: ${BQ_COLORS.ink};
          width: 48px; height: 48px; border-radius: 50%;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 3001; box-shadow: ${BQ_SHADOWS.soft};
        }
        .bq-modal-floating-close:hover { transform: scale(1.1) rotate(90deg); box-shadow: ${BQ_SHADOWS.hover}; background: ${BQ_COLORS.bg}; }

        .bq-modal-container {
          background: white;
          width: 1120px;
          height: 560px;
          border-radius: 40px; overflow: visible; position: relative;
          box-shadow: ${BQ_SHADOWS.hover};
          animation: bq-modal-up 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: ${BQ_FONTS.body};
        }

        @keyframes bq-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes bq-modal-up { from { opacity: 0; transform: translateY(40px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

        .bq-modal-grid { display: grid; grid-template-columns: 1fr 1fr; height: 100%; border-radius: 40px; overflow: hidden; }

        .bq-modal-visual {
          background: ${BQ_COLORS.bg}; display: flex; align-items: center; justify-content: center;
          padding: 60px; position: relative;
          border-right: 1px solid ${BQ_COLORS.border};
        }
        .bq-modal-img { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 20px 40px rgba(0,0,0,0.05)); }
        .bq-modal-fallback { opacity: 0.1; color: ${BQ_COLORS.ink}; }

        .bq-modal-body { padding: 48px 60px; display: flex; flex-direction: column; background: white; overflow: hidden; }

        .bq-modal-header { margin-bottom: 24px; flex-shrink: 0; }
        .bq-header-top-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; width: 100%; }

        .bq-modal-logo {
          width: 56px; height: 56px; background: ${BQ_COLORS.bg};
          border-radius: 14px; display: flex; align-items: center; justify-content: center;
          padding: 8px; flex-shrink: 0; border: 1px solid ${BQ_COLORS.border};
        }
        .bq-modal-logo img { width: 100%; height: 100%; object-fit: contain; }

        .bq-modal-title-stack { display: flex; flex-direction: column; flex: 1; }
        .bq-modal-model-label {
          font-family: ${BQ_FONTS.heading}; font-size: 13px; font-weight: ${BQ_WEIGHTS.bold};
          color: ${BQ_COLORS.inkMuted}; text-transform: uppercase;
          letter-spacing: 0.25em; margin-bottom: 4px; display: block; opacity: 0.9;
        }
        .bq-modal-title {
          font-family: ${BQ_FONTS.heading}; font-size: 42px; font-weight: ${BQ_WEIGHTS.bold};
          color: ${BQ_COLORS.ink}; margin: 0; line-height: 0.95; letter-spacing: -0.05em;
        }

        .bq-modal-main { flex: 1; overflow-y: auto; padding-right: 12px; margin-bottom: 24px; scrollbar-width: thin; }
        .bq-modal-main::-webkit-scrollbar { width: 4px; }
        .bq-modal-main::-webkit-scrollbar-thumb { background: ${BQ_COLORS.border}; border-radius: 10px; }

        .bq-modal-desc { font-size: 15px; color: ${BQ_COLORS.inkMuted}; line-height: 1.6; margin-bottom: 24px; font-weight: ${BQ_WEIGHTS.medium}; }

        .bq-modal-warranty-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: ${BQ_COLORS.inkMuted}; font-weight: ${BQ_WEIGHTS.semibold}; opacity: 0.8; }

        .bq-modal-specs-scroll-area { width: 100%; overflow-x: auto; scrollbar-width: none; margin-bottom: 8px; }
        .bq-modal-specs-scroll-area::-webkit-scrollbar { display: none; }

        .bq-modal-specs-row { display: flex; gap: 16px; min-width: max-content; padding-bottom: 4px; }

        .bq-transaction-hub { margin-top: auto; padding-top: 32px; border-top: 1px solid ${BQ_COLORS.border}; display: flex; flex-direction: column; gap: 24px; }

        .bq-hub-status { display: flex; align-items: center; }

        .bq-interactive-footer {
          display: flex;
          gap: 16px;
          align-items: flex-end;
          flex-shrink: 0;
          height: 124px;
        }

        .bq-selection-column { display: flex; flex-direction: column; gap: 12px; }
        .bq-misc-badges { display: flex; flex-direction: column; gap: 6px; }

        .bq-modal-reveal-container {
            flex: 1;
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
        }

        .bq-modal-reveal-group {
            display: flex;
            flex-direction: column;
            transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            transform: translateY(68px);
            position: relative;
            z-index: 1;
        }

        .bq-modal-reveal-group:has(+ .bq-modal-add-row:hover, .bq-modal-buy-row:hover) {
            transform: translateY(28px);
        }

        .bq-modal-reveal-group, .bq-modal-add-row, .bq-modal-buy-row {
            width: fit-content;
            margin-left: auto;
        }

        .bq-modal-price-row { display: flex; justify-content: space-between; align-items: center; height: 52px; width: 100%; }

        .bq-total-badge {
            font-family: ${BQ_FONTS.heading}; font-size: 11px; font-weight: ${BQ_WEIGHTS.bold};
            color: white; background: ${BQ_COLORS.brand}; padding: 4px 10px; border-radius: 6px;
            text-transform: uppercase; letter-spacing: 0.1em;
        }
        .bq-price-main { display: flex; align-items: baseline; gap: 4px; color: ${BQ_COLORS.ink}; }
        .bq-price-symbol { font-family: ${BQ_FONTS.heading}; font-size: 24px; font-weight: ${BQ_WEIGHTS.bold}; }
        .bq-price-num { font-family: ${BQ_FONTS.heading}; font-size: 42px; font-weight: ${BQ_WEIGHTS.bold}; letter-spacing: -0.04em; line-height: 1; }

        .bq-modal-buy-row { height: 56px; display: flex; }
        .bq-modal-add-row {
            margin-top: 12px;
            position: relative;
            z-index: 2;
            height: 56px;
            display: flex;
        }

        .bq-modal-brand-line {
            flex-direction: row;
            display: flex;
            gap: 16px;
        }

        .bq-tech-card {
            width: fit-content;
        }

        @media (max-width: 1200px) {
          .bq-modal-container { width: 90vw; height: auto; max-height: 95vh; overflow-y: auto; }
          .bq-modal-grid { grid-template-columns: 1fr; border-radius: 40px; }
          .bq-modal-visual { height: 320px; }
          .bq-modal-body { padding: 24px; }
          .bq-interactive-footer { height: auto; flex-direction: column; align-items: stretch; }
          .bq-modal-reveal-container { height: auto; overflow: visible; }
          .bq-modal-reveal-group { transform: none; }
          .bq-modal-floating-close { top: 20px; right: 20px; width: 44px; height: 44px; position: fixed; }
        }
      `,
        }}
      />
    </div>
  );
}

export default ProductModal;
