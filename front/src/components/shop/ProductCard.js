import {
  Cards,
  ComputerTower,
  Lightning,
  ShieldCheck,
  ShoppingCart,
  Snowflake,
  SquareSplitHorizontal,
  Star,
} from "@phosphor-icons/react";
import { useState } from "react";
import { getBrandLogo } from "../../config/brandLogos";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueTechnicalCard from "../common/boutique/BoutiqueTechnicalCard";
import BoutiqueText from "../common/boutique/BoutiqueText";
import {
  BQ_COLORS,
  BQ_GEOMETRY,
  BQ_SHADOWS,
} from "../common/boutique/BoutiqueTheme";

const DEFAULT_CATALOG_IMAGE_URL = "/catalog/ac/generic-ac.jpg";

function productPlaceholderIcon(product) {
  if (product?.category === "window") return SquareSplitHorizontal;
  if (product?.category === "floor") return ComputerTower;
  if (product?.category === "split") return Cards;
  return Snowflake;
}

export default function ProductCard({
  product,
  onAddToCart,
  onBuyNow,
  onClick,
}) {
  const [imgBroken, setBroken] = useState(false);
  const IconComp = productPlaceholderIcon(product);

  // Strip brand and "AC" from title
  const nameBase = product.name
    .toLowerCase()
    .startsWith(product.brand.toLowerCase())
    ? product.name.slice(product.brand.length).trim()
    : product.name;

  const displayName = nameBase.replace(/\s*AC\s*$/gi, "").trim();

  const horsepower = product.specs || product.capacity || "";
  const brandLogoUrl = getBrandLogo(product.brand);

  return (
    <BoutiqueBox
      className={`bq-card ${product.featured ? "featured" : ""}`}
      onClick={() => onClick(product)}
      tag="div"
    >
      <BoutiqueBox
        className="bq-card-image"
        height={220}
        background={BQ_COLORS.bg}
        align="center"
        justify="center"
        padding={24}
        style={{ position: "relative" }}
      >
        {(product.imageUrl || DEFAULT_CATALOG_IMAGE_URL) && !imgBroken ? (
          <img
            src={product.imageUrl || DEFAULT_CATALOG_IMAGE_URL}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onError={() => setBroken(true)}
            className="bq-img"
          />
        ) : (
          <BoutiqueBox className="bq-img-fallback">
            <IconComp size={64} weight="bold" />
          </BoutiqueBox>
        )}

        {product.featured && (
          <BoutiqueBox className="bq-card-badge-left">
            <BoutiqueTechnicalCard variant="brand" size="sm" icon={Star}>
              Featured
            </BoutiqueTechnicalCard>
          </BoutiqueBox>
        )}

        {product.discount > 0 && (
          <BoutiqueBox className="bq-card-badge-right">
            <BoutiqueTechnicalCard variant="danger" size="sm">
              {product.discount}% OFF
            </BoutiqueTechnicalCard>
          </BoutiqueBox>
        )}
      </BoutiqueBox>

      <BoutiqueBox className="bq-card-info" padding={24} flex={1}>
        <BoutiqueBox className="bq-details-top" margin="0 0 20px">
          <BoutiqueBox direction="row" align="flex-start" gap={12}>
            <BoutiqueBox
              className="bq-brand-logo"
              width={34}
              height={34}
              background={BQ_COLORS.bg}
              align="center"
              justify="center"
              padding={5}
              style={{
                borderRadius: "8px",
                border: `1px solid ${BQ_COLORS.border}`,
              }}
            >
              <img
                src={brandLogoUrl}
                alt={product.brand}
                loading="lazy"
                decoding="async"
              />
            </BoutiqueBox>
            <BoutiqueStack gap={2} flex={1}>
              <BoutiqueText
                variant="label"
                color={BQ_COLORS.inkMuted}
                style={{ opacity: 0.9 }}
              >
                {product.model || "MODEL"}
              </BoutiqueText>
              <BoutiqueBox
                direction="row"
                align="center"
                justify="space-between"
                gap={12}
                width="100%"
              >
                <BoutiqueText
                  variant="h3"
                  className="bq-name"
                  style={{ flex: 1 }}
                >
                  {displayName}
                </BoutiqueText>
                {horsepower && (
                  <BoutiqueBox style={{ flexShrink: 0 }}>
                    <BoutiqueTechnicalCard variant="blue" size="sm">
                      {horsepower}
                    </BoutiqueTechnicalCard>
                  </BoutiqueBox>
                )}
              </BoutiqueBox>
            </BoutiqueStack>
          </BoutiqueBox>
        </BoutiqueBox>

        <BoutiqueBox
          className="bq-interactive-wrapper"
          margin="auto 0 0"
          height={100}
          justify="flex-end"
          style={{ position: "relative", overflow: "hidden" }}
        >
          <BoutiqueStack gap={12} className="bq-reveal-group">
            <BoutiqueBox
              direction="row"
              align="center"
              justify="space-between"
              height={44}
              width="100%"
            >
              <BoutiqueBox direction="row" align="baseline" gap={6}>
                <BoutiqueText variant="h2" className="bq-current-price">
                  ₱{product.price.toLocaleString()}
                </BoutiqueText>
                {product.oldPrice && (
                  <BoutiqueText
                    variant="caption"
                    className="bq-old-price"
                    weight={600}
                    style={{ textDecoration: "line-through" }}
                  >
                    ₱{product.oldPrice.toLocaleString()}
                  </BoutiqueText>
                )}
              </BoutiqueBox>

              <BoutiqueTechnicalCard
                variant={product.stock > 0 ? "success" : "danger"}
                size="sm"
              >
                {product.stock > 0 ? (product.stockLabel || `${product.stock} Units`) : "Out of Stock"}
              </BoutiqueTechnicalCard>
            </BoutiqueBox>

            <BoutiqueBox width="100%">
              <BoutiqueButton
                variant="outline"
                size="sm"
                fullWidth
                onClick={(e) => {
                  e.stopPropagation();
                  onBuyNow(product);
                }}
                disabled={!product.inStock}
              >
                Buy Now <Lightning size={18} weight="fill" />
              </BoutiqueButton>
            </BoutiqueBox>
          </BoutiqueStack>

          <BoutiqueBox
            className="bq-anchor-action"
            margin="12px 0 0"
            height={44}
            style={{ position: "relative", zIndex: 2 }}
          >
            <BoutiqueButton
              variant="primary"
              size="sm"
              fullWidth
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(product, 1);
              }}
              disabled={!product.inStock}
            >
              Add to Cart <ShoppingCart size={18} weight="bold" />
            </BoutiqueButton>
          </BoutiqueBox>
        </BoutiqueBox>

        <BoutiqueBox
          className="bq-warranty"
          direction="row"
          align="center"
          gap={6}
          margin="16px 0 0"
          padding="16px 0 0"
          style={{ borderTop: "1px solid rgba(0,0,0,0.03)" }}
        >
          <ShieldCheck size={14} weight="bold" />
          <BoutiqueText variant="caption" weight={600}>
            {product.warranty}
          </BoutiqueText>
        </BoutiqueBox>
      </BoutiqueBox>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-card {
          border-radius: ${BQ_GEOMETRY.radiusCard};
          overflow: hidden;
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          box-shadow: ${BQ_SHADOWS.soft};
          cursor: pointer;
          animation: bq-fade-in 0.6s ease;
          border: 1px solid ${BQ_COLORS.border};
          min-height: 540px;
        }

        @keyframes bq-fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .bq-card:hover {
          transform: translateY(-8px);
          box-shadow: ${BQ_SHADOWS.hover};
          border-color: transparent;
        }

        .bq-card:hover .bq-card-image { background: white !important; }

        .bq-img {
          width: 100%; height: 100%; object-fit: contain;
          transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .bq-card:hover .bq-img { transform: scale(1.05); }

        .bq-img-fallback { opacity: 0.1; color: ${BQ_COLORS.ink}; }

        .bq-card-badge-left { position: absolute; top: 12px; left: 12px; z-index: 10; }
        .bq-card-badge-right { position: absolute; top: 12px; right: 12px; z-index: 10; }

        .bq-brand-logo img { width: 100%; height: 100%; object-fit: contain; }

        .bq-name {
          line-height: 1.15; letter-spacing: -0.02em;
        }

        .bq-reveal-group {
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          transform: translateY(56px);
          position: relative;
          z-index: 1;
        }

        .bq-card:hover .bq-reveal-group {
          transform: translateY(0);
        }

        .bq-current-price {
          letter-spacing: -0.05em;
          line-height: 1;
        }

        .bq-old-price {
          line-height: 1;
        }

        @media (hover: none), (max-width: 900px) {
          .bq-card { min-height: 520px; }
          .bq-card:hover { transform: none; }
          .bq-reveal-group { transform: translateY(0); }
        }
      `,
        }}
      />
    </BoutiqueBox>
  );
}
