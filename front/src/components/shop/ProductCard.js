import {
  Cards,
  ComputerTower,
  Lightning,
  ShieldCheck,
  ShoppingCart,
  Snowflake,
  SquareSplitHorizontal,
} from "@phosphor-icons/react";
import { useState } from "react";
import { getBrandLogo } from "../../config/brandLogos";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueText from "../common/boutique/BoutiqueText";

const DEFAULT_CATALOG_IMAGE_URL = "/catalog/ac/generic-ac.jpg";

const CATEGORY_LABELS = {
  split: "Split type",
  window: "Window type",
  floor: "Floor mounted",
  portable: "Portable",
};

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
  const productBrand = product.brand || "Generic";
  const nameBase = (product.name || "")
    .toLowerCase()
    .startsWith(productBrand.toLowerCase())
    ? product.name.slice(productBrand.length).trim()
    : product.name;
  const displayName = (nameBase || product.name || "Air conditioner")
    .replace(/\s*AC\s*$/gi, "")
    .trim();
  const horsepower = product.specs || product.capacity || "";
  const categoryLabel = CATEGORY_LABELS[product.category] || product.category || "Air conditioner";
  const brandLogoUrl = getBrandLogo(productBrand);
  const productImageUrl = product.imageUrl || DEFAULT_CATALOG_IMAGE_URL;

  return (
    <article
      className="tw:flex tw:h-full tw:min-w-0 tw:flex-col tw:overflow-hidden tw:rounded-card tw:border tw:border-border tw:bg-surface tw:shadow-soft tw:transition-[border-color,box-shadow] hover:tw:border-input hover:tw:shadow-card"
      onClick={() => onClick(product)}
    >
      <button
        type="button"
        className="tw:relative tw:block tw:aspect-[4/3] tw:w-full tw:overflow-hidden tw:border-0 tw:border-b tw:border-border tw:bg-surface-secondary tw:p-4! tw:text-foreground tw:sm:p-5!"
        onClick={(event) => {
          event.stopPropagation();
          onClick(product);
        }}
        aria-label={`View ${product.name}`}
      >
        {productImageUrl && !imgBroken ? (
          <img
            src={productImageUrl}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onError={() => setBroken(true)}
            className="tw:h-full tw:w-full tw:object-contain"
          />
        ) : (
          <span className="tw:grid tw:h-full tw:w-full tw:place-items-center tw:text-input">
            <IconComp size={56} weight="bold" aria-hidden="true" />
          </span>
        )}

        <span className="tw:pointer-events-none tw:absolute tw:top-3 tw:left-3 tw:flex tw:flex-wrap tw:gap-2">
          {product.featured ? (
            <span className="ap-badge tw:bg-primary tw:px-2! tw:py-1! tw:text-primary-foreground">
              Featured
            </span>
          ) : null}
          {product.discount > 0 ? (
            <span className="ap-badge tw:bg-error tw:px-2! tw:py-1! tw:text-white">
              {product.discount}% off
            </span>
          ) : null}
        </span>
      </button>

      <div className="tw:flex tw:min-w-0 tw:flex-1 tw:flex-col tw:p-4! tw:sm:p-5!">
        <div className="tw:flex tw:min-w-0 tw:items-center tw:gap-2">
          <span className="tw:grid tw:size-8 tw:shrink-0 tw:place-items-center tw:rounded-sm tw:border tw:border-border tw:bg-surface-secondary tw:p-1!">
            <img
              src={brandLogoUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="tw:h-full tw:w-full tw:object-contain"
            />
          </span>
          <div className="tw:min-w-0">
            <BoutiqueText variant="label" className="tw:truncate tw:text-foreground">
              {productBrand}
            </BoutiqueText>
            {product.model ? (
              <BoutiqueText variant="caption" className="tw:truncate">
                {product.model}
              </BoutiqueText>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          className="tw:mt-3! tw:border-0 tw:bg-transparent tw:p-0! tw:text-left tw:text-foreground"
          onClick={(event) => {
            event.stopPropagation();
            onClick(product);
          }}
        >
          <BoutiqueText variant="cardTitle" className="tw:line-clamp-2">
            {displayName}
          </BoutiqueText>
        </button>

        <BoutiqueText variant="metadata" className="tw:mt-1! tw:capitalize">
          {[horsepower, categoryLabel].filter(Boolean).join(" · ")}
        </BoutiqueText>

        <div className="tw:mt-4! tw:flex tw:flex-wrap tw:items-baseline tw:gap-x-2 tw:gap-y-1">
          <BoutiqueText variant="sectionTitle" className="tw:text-foreground">
            ₱{product.price.toLocaleString()}
          </BoutiqueText>
          {product.oldPrice ? (
            <BoutiqueText variant="caption" className="tw:line-through">
              ₱{product.oldPrice.toLocaleString()}
            </BoutiqueText>
          ) : null}
        </div>

        <div className={`tw:mt-2! tw:flex tw:items-center tw:gap-2 tw:text-metadata tw:font-medium ${product.stock > 0 ? "tw:text-success" : "tw:text-error"}`}>
          <span className="tw:size-2 tw:shrink-0 tw:rounded-full tw:bg-current" aria-hidden="true" />
          <span>{product.stock > 0 ? (product.stockLabel || `${product.stock} units available`) : "Out of stock"}</span>
        </div>

        <div className="tw:mt-5! tw:grid tw:grid-cols-2 tw:gap-2">
          <BoutiqueButton
            type="button"
            variant="primary"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              onAddToCart(product, 1);
            }}
            disabled={!product.inStock}
            className="tw:min-w-0"
          >
            <ShoppingCart size={17} weight="bold" aria-hidden="true" />
            Add to Cart
          </BoutiqueButton>
          <BoutiqueButton
            type="button"
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              onBuyNow(product);
            }}
            disabled={!product.inStock}
            className="tw:min-w-0"
          >
            Buy Now
            <Lightning size={16} weight="fill" aria-hidden="true" />
          </BoutiqueButton>
        </div>

        <div className="tw:mt-4! tw:flex tw:items-start tw:gap-2 tw:border-t tw:border-border tw:pt-3! tw:text-muted-foreground">
          <ShieldCheck size={16} weight="bold" className="tw:mt-0.5 tw:shrink-0" aria-hidden="true" />
          <BoutiqueText variant="caption">{product.warranty}</BoutiqueText>
        </div>
      </div>
    </article>
  );
}
