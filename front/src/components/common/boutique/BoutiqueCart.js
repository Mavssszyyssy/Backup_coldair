import { ShoppingCartSimple, Snowflake, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import BoutiqueBox from "./BoutiqueBox";
import BoutiqueDrawer from "./BoutiqueDrawer";
import BoutiqueNumberInput from "./BoutiqueNumberInput";
import BoutiqueStack from "./BoutiqueStack";
import BoutiqueText from "./BoutiqueText";
import { BQ_COLORS, BQ_GEOMETRY } from "./BoutiqueTheme";

import { getBrandLogo } from "../../../config/brandLogos";
import { formatCartHorsepower, formatCartModel } from "../../../domain/cart/cartProductDetails";

function CartItemImage({ item }) {
  const [imgBroken, setBroken] = useState(false);
  const [brandBroken, setBrandBroken] = useState(false);

  const brandLogoUrl = getBrandLogo(item.brand);
  const hasImage = item.imageUrl && item.imageUrl.trim() !== "";

  // 1. Primary: Product Image
  if (hasImage && !imgBroken) {
    return (
      <img
        src={item.imageUrl}
        alt={item.name}
        onError={() => setBroken(true)}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    );
  }

  // 2. Fallback: Brand Logo
  if (brandLogoUrl && !brandBroken) {
    return (
      <img
        src={brandLogoUrl}
        alt={item.brand}
        onError={() => setBrandBroken(true)}
        className="bq-cart-brand-fallback"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    );
  }

  // 3. Ultimate Fallback: Icon
  return (
    <Snowflake
      size={32}
      weight="bold"
      className="bq-cart-icon-fallback"
      style={{ color: BQ_COLORS.inkFaint, opacity: 0.2 }}
    />
  );
}

export default function BoutiqueCart({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  getCartTotal,
}) {
  return (
    <BoutiqueDrawer
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      width="440px"
      title="Your Cart"
    >
      <BoutiqueBox className="bq-cart-wrapper" direction="column" height="100%">
        <BoutiqueStack
          gap={32}
          padding={32}
          className="bq-cart-items"
          style={{ flex: 1, overflowY: "auto" }}
        >
          {cart.length === 0 ? (
            <BoutiqueBox
              flex={1}
              align="center"
              justify="center"
              padding="60px 0"
              color={BQ_COLORS.inkFaint}
              className="bq-cart-empty"
            >
              <ShoppingCartSimple size={64} weight="bold" />
              <BoutiqueText variant="h3" margin="16px 0 0" weight={700}>
                Your cart is empty.
              </BoutiqueText>
            </BoutiqueBox>
          ) : (
            cart.map((item) => (
              <BoutiqueBox
                key={item.id}
                direction="row"
                gap={20}
                className="bq-cart-item"
              >
                <BoutiqueBox
                  width={80}
                  height={80}
                  background={BQ_COLORS.surfaceAlt}
                  align="center"
                  justify="center"
                  padding={12}
                  className="bq-item-img-wrap"
                  style={{
                    borderRadius: "16px",
                    flexShrink: 0,
                    border: `1px solid ${BQ_COLORS.border}`,
                  }}
                >
                  <CartItemImage item={item} />
                </BoutiqueBox>
                <BoutiqueBox flex={1} className="bq-item-info">
                  <BoutiqueText
                    variant="h3"
                    size="16px"
                    weight={700}
                    margin="0 0 2px"
                    className="bq-item-name"
                  >
                    {item.name}
                  </BoutiqueText>
                  <BoutiqueText
                    variant="label"
                    size="11px"
                    weight={600}
                    color={BQ_COLORS.inkFaint}
                    margin="0 0 2px"
                    className="bq-item-model"
                  >
                    Model: {formatCartModel(item)}
                  </BoutiqueText>
                  <BoutiqueText
                    variant="label"
                    size="11px"
                    weight={700}
                    color={BQ_COLORS.inkMuted}
                    margin="0 0 6px"
                    className="bq-item-horsepower"
                  >
                    Horsepower: {formatCartHorsepower(item)}
                  </BoutiqueText>
                  <BoutiqueBox
                    direction="row"
                    align="baseline"
                    gap={10}
                    className="bq-item-price-group"
                  >
                    <BoutiqueText
                      weight={600}
                      size="18px"
                      color={BQ_COLORS.inkMuted}
                      className="bq-item-price"
                    >
                      ₱{(item.price * item.quantity).toLocaleString()}
                    </BoutiqueText>
                    {item.quantity > 1 && (
                      <BoutiqueText
                        weight={600}
                        size="12px"
                        color={BQ_COLORS.inkFaint}
                        className="bq-item-unit-price"
                        style={{
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        ₱{item.price.toLocaleString()} ea.
                      </BoutiqueText>
                    )}
                  </BoutiqueBox>

                  <BoutiqueBox
                    direction="row"
                    align="center"
                    justify="space-between"
                    margin="12px 0 0"
                    className="bq-qty-controls"
                  >
                    <BoutiqueNumberInput
                      size="sm"
                      value={item.quantity}
                      onChange={(newQty) => onUpdateQuantity(item.id, newQty)}
                      min={1}
                      width="120px"
                    />
                    <button
                      className="bq-item-remove"
                      onClick={() => onRemoveItem(item.id)}
                    >
                      <Trash size={18} weight="bold" />
                    </button>
                  </BoutiqueBox>
                </BoutiqueBox>
              </BoutiqueBox>
            ))
          )}
        </BoutiqueStack>

        {cart.length > 0 && (
          <BoutiqueBox
            padding={32}
            background={BQ_COLORS.surfaceAlt}
            className="bq-cart-footer"
            style={{ borderTop: `1px solid ${BQ_COLORS.border}` }}
          >
            <BoutiqueBox
              direction="row"
              align="center"
              justify="space-between"
              margin="0 0 24px"
              className="bq-cart-total"
            >
              <BoutiqueText
                variant="h3"
                weight={700}
                color={BQ_COLORS.inkMuted}
              >
                Subtotal
              </BoutiqueText>
              <BoutiqueText
                weight={800}
                size="28px"
                className="bq-total-amount"
                style={{ letterSpacing: "-0.04em" }}
              >
                ₱{getCartTotal().toLocaleString()}
              </BoutiqueText>
            </BoutiqueBox>
            <button className="bq-checkout-btn" onClick={onCheckout}>
              Checkout Now
            </button>
          </BoutiqueBox>
        )}
      </BoutiqueBox>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-cart-items::-webkit-scrollbar { display: none; }
        .bq-cart-items { scrollbar-width: none; }

        .bq-cart-brand-fallback { opacity: 0.8; filter: grayscale(1) contrast(1.2); }

        .bq-item-remove { background: transparent; border: none; color: ${BQ_COLORS.danger}; cursor: pointer; opacity: 0.6; transition: opacity 0.2s; }
        .bq-item-remove:hover { opacity: 1; }

        .bq-checkout-btn {
          width: 100%; padding: 20px; background: ${BQ_COLORS.brand}; color: white;
          border: none; border-radius: ${BQ_GEOMETRY.radiusPill}; font-family: inherit;
          font-weight: 800; font-size: 16px; text-transform: uppercase; letter-spacing: 0.1em;
          cursor: pointer; box-shadow: 0 10px 25px rgba(0,0,0,0.15); transition: all 0.3s;
        }
        .bq-checkout-btn:hover { background: ${BQ_COLORS.brandHover}; transform: translateY(-2px); box-shadow: 0 15px 35px rgba(0,0,0,0.2); }
      `,
        }}
      />
    </BoutiqueDrawer>
  );
}
