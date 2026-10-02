import {
  Cards,
  ComputerTower,
  Lightning,
  Minus,
  Plus,
  ShieldCheck,
  Snowflake,
  SquareSplitHorizontal,
  X,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { getBrandLogo } from "../../config/brandLogos";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueText from "../common/boutique/BoutiqueText";

const DEFAULT_CATALOG_IMAGE_URL = "/catalog/ac/generic-ac.jpg";

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

  if (imageUrl.trim() && !imgBroken) {
    return (
      <img
        src={imageUrl}
        alt={product.name}
        decoding="async"
        onError={() => setBroken(true)}
        className="tw:h-full tw:w-full tw:object-contain"
      />
    );
  }

  return (
    <span className="tw:grid tw:h-full tw:w-full tw:place-items-center tw:text-input">
      <IconComp size={88} weight="bold" aria-hidden="true" />
    </span>
  );
}

function ProductModal({ product, onClose, onAddToCart }) {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setQuantity(1);
  }, [product?.id]);

  if (!product) return null;

  const availableStock = Number(product.stock) || 0;
  const isOutOfStock = availableStock <= 0;
  const currentQty = Math.min(Math.max(parseInt(quantity) || 1, 1), Math.max(availableStock, 1));
  const productBrand = product.brand || "Generic";
  const nameBase = (product.name || "")
    .toLowerCase()
    .startsWith(productBrand.toLowerCase())
    ? product.name.slice(productBrand.length).trim()
    : product.name;
  const displayName = (nameBase || product.name || "Air conditioner").replace(/\s*AC\s*$/gi, "").trim();
  const horsepower = product.specs || product.capacity || "";
  const brandLogoUrl = getBrandLogo(productBrand);
  const totalPrice = product.price * currentQty;

  const setSafeQuantity = (value) => {
    const next = parseInt(value) || 1;
    setQuantity(Math.min(Math.max(next, 1), Math.max(availableStock, 1)));
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    onAddToCart(product, currentQty);
    onClose();
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    onAddToCart(product, currentQty);
    onClose();
    window.dispatchEvent(new CustomEvent("bq:buy-now"));
  };

  return (
    <div
      className="tw:fixed tw:inset-0 tw:z-[3000] tw:flex tw:items-center tw:justify-center tw:bg-[var(--ap-color-overlay)] tw:p-4! tw:sm:p-6!"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalogue-product-title"
        className="tw:relative tw:grid tw:max-h-[calc(100vh-2rem)] tw:w-full tw:max-w-5xl tw:overflow-y-auto tw:rounded-dialog tw:border tw:border-border tw:bg-surface tw:shadow-raised tw:lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] tw:lg:overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="tw:absolute tw:top-3 tw:right-3 tw:z-10 tw:grid tw:size-10 tw:place-items-center tw:rounded-control tw:border tw:border-border tw:bg-surface tw:text-foreground tw:shadow-soft hover:tw:bg-muted"
          onClick={onClose}
          aria-label="Close product details"
        >
          <X size={20} weight="bold" aria-hidden="true" />
        </button>

        <div className="tw:flex tw:min-h-64 tw:items-center tw:justify-center tw:border-b tw:border-border tw:bg-surface-secondary tw:p-6! tw:sm:min-h-80 tw:sm:p-8! tw:lg:min-h-[34rem] tw:lg:border-r tw:lg:border-b-0">
          <ModalProductImage product={product} />
        </div>

        <div className="tw:flex tw:min-w-0 tw:flex-col tw:p-5! tw:sm:p-6! tw:lg:max-h-[34rem] tw:lg:overflow-y-auto tw:lg:p-8!">
          <div className="tw:flex tw:min-w-0 tw:items-center tw:gap-3 tw:pr-10!">
            <span className="tw:grid tw:size-10 tw:shrink-0 tw:place-items-center tw:rounded-sm tw:border tw:border-border tw:bg-surface-secondary tw:p-1.5!">
              <img src={brandLogoUrl} alt="" decoding="async" className="tw:h-full tw:w-full tw:object-contain" />
            </span>
            <div className="tw:min-w-0">
              <BoutiqueText variant="label" className="tw:text-foreground">{productBrand}</BoutiqueText>
              <BoutiqueText variant="caption" className="tw:truncate">{product.model || "Model not specified"}</BoutiqueText>
            </div>
          </div>

          <BoutiqueText
            id="catalogue-product-title"
            variant="pageTitle"
            className="tw:mt-4! tw:text-foreground"
          >
            {displayName}
          </BoutiqueText>

          {product.description ? (
            <BoutiqueText className="tw:mt-3! tw:text-muted-foreground">
              {product.description}
            </BoutiqueText>
          ) : null}

          <div className="tw:mt-5! tw:flex tw:flex-wrap tw:gap-2">
            {horsepower ? <span className="ap-badge tw:bg-accent tw:px-2.5! tw:py-1! tw:text-accent-foreground">{horsepower}</span> : null}
            <span className="ap-badge tw:bg-muted tw:px-2.5! tw:py-1! tw:text-muted-foreground">{productBrand}</span>
            {product.model ? <span className="ap-badge tw:bg-muted tw:px-2.5! tw:py-1! tw:text-muted-foreground">{product.model}</span> : null}
          </div>

          <div className="tw:mt-4! tw:flex tw:items-start tw:gap-2 tw:text-muted-foreground">
            <ShieldCheck size={18} weight="bold" className="tw:mt-0.5! tw:shrink-0" aria-hidden="true" />
            <BoutiqueText variant="metadata">{product.warranty}</BoutiqueText>
          </div>

          <div className="tw:mt-6! tw:border-t tw:border-border tw:pt-5!">
            <div className="tw:flex tw:flex-wrap tw:items-end tw:justify-between tw:gap-4">
              <div>
                <BoutiqueText variant="label" className="tw:text-foreground">Quantity</BoutiqueText>
                <div className="tw:mt-2! tw:flex tw:h-11 tw:w-36 tw:items-center tw:rounded-control tw:border tw:border-input tw:bg-surface">
                  <button
                    type="button"
                    className="tw:grid tw:h-full tw:w-10 tw:shrink-0 tw:place-items-center tw:border-0 tw:border-r tw:border-border tw:bg-transparent tw:text-foreground disabled:tw:text-input"
                    onClick={() => setSafeQuantity(currentQty - 1)}
                    disabled={currentQty <= 1 || isOutOfStock}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={15} weight="bold" aria-hidden="true" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={Math.max(availableStock, 1)}
                    value={currentQty}
                    onChange={(event) => setSafeQuantity(event.target.value)}
                    className="tw:h-full tw:min-w-0 tw:flex-1 tw:border-0 tw:bg-transparent tw:px-1! tw:text-center tw:text-body tw:font-semibold tw:text-foreground tw:outline-none"
                    aria-label="Quantity"
                    disabled={isOutOfStock}
                  />
                  <button
                    type="button"
                    className="tw:grid tw:h-full tw:w-10 tw:shrink-0 tw:place-items-center tw:border-0 tw:border-l tw:border-border tw:bg-transparent tw:text-foreground disabled:tw:text-input"
                    onClick={() => setSafeQuantity(currentQty + 1)}
                    disabled={currentQty >= availableStock || isOutOfStock}
                    aria-label="Increase quantity"
                  >
                    <Plus size={15} weight="bold" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="tw:text-right">
                <BoutiqueText variant="caption">Total price</BoutiqueText>
                <BoutiqueText variant="sectionTitle" className="tw:mt-1! tw:text-foreground">
                  ₱{totalPrice.toLocaleString()}
                </BoutiqueText>
              </div>
            </div>

            <div className={`tw:mt-4! tw:flex tw:items-center tw:gap-2 tw:text-metadata tw:font-medium ${isOutOfStock ? "tw:text-error" : "tw:text-success"}`}>
              <span className="tw:size-2 tw:rounded-full tw:bg-current" aria-hidden="true" />
              <span>{isOutOfStock ? "Temporarily unavailable" : (product.stockLabel || `${availableStock} units available`)}</span>
            </div>

            <div className="tw:mt-5! tw:grid tw:gap-2 tw:sm:grid-cols-2">
              <BoutiqueButton
                type="button"
                variant="primary"
                fullWidth
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                {isOutOfStock ? "Unavailable" : "Add to Cart"}
              </BoutiqueButton>
              <BoutiqueButton
                type="button"
                variant="outline"
                fullWidth
                onClick={handleBuyNow}
                disabled={isOutOfStock}
              >
                Buy Now <Lightning size={18} weight="fill" aria-hidden="true" />
              </BoutiqueButton>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ProductModal;
