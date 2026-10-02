import { WarningDiamond } from "@phosphor-icons/react";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueSectionHeader from "../common/boutique/BoutiqueSectionHeader";
import BoutiqueText from "../common/boutique/BoutiqueText";
import ProductCard from "./ProductCard";

const sortOptions = [
  { value: "default", label: "Recommended" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "hp_asc", label: "Horsepower: Low to High" },
  { value: "hp_desc", label: "Horsepower: High to Low" },
  { value: "name_asc", label: "Name: A to Z" },
];

const PRODUCT_GRID_CLASSES =
  "tw:grid tw:min-w-0 tw:grid-cols-1 tw:gap-4 tw:sm:grid-cols-2 tw:xl:grid-cols-3 tw:xl:gap-5";

function CatalogueSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <BoutiqueText className="tw:mb-4! tw:text-muted-foreground">
        Loading the latest available AC units...
      </BoutiqueText>
      <div className={PRODUCT_GRID_CLASSES} aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="tw:overflow-hidden tw:rounded-card tw:border tw:border-border tw:bg-surface tw:shadow-soft"
          >
            <div className="tw:aspect-[4/3] tw:animate-pulse tw:bg-muted" />
            <div className="tw:grid tw:gap-3 tw:p-4!">
              <div className="tw:h-3 tw:w-2/5 tw:animate-pulse tw:rounded-sm tw:bg-muted" />
              <div className="tw:h-5 tw:w-4/5 tw:animate-pulse tw:rounded-sm tw:bg-muted" />
              <div className="tw:h-4 tw:w-1/2 tw:animate-pulse tw:rounded-sm tw:bg-muted" />
              <div className="tw:mt-2! tw:h-10 tw:animate-pulse tw:rounded-control tw:bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ShopCatalogue({
  products,
  loading = false,
  error = "",
  onRetry,
  onAddToCart,
  onBuyNow,
  onProductClick,
  sortBy,
  onSortChange,
}) {
  const description = loading
    ? "Checking current product availability."
    : `${products.length} ${products.length === 1 ? "product" : "products"} available with your current filters.`;

  return (
    <section aria-label="Air conditioner catalogue" className="tw:min-w-0">
      <BoutiqueSectionHeader
        title="Air conditioner catalogue"
        description={description}
        className="tw:mb-5! tw:items-start"
        actions={(
          <label className="tw:block tw:w-full tw:sm:w-auto">
            <span className="tw:sr-only">Sort products</span>
            <select
              aria-label="Sort products"
              className="ap-select tw:h-11 tw:w-full tw:min-w-0 tw:rounded-control! tw:border-input! tw:bg-surface! tw:px-3! tw:py-2! tw:shadow-none! tw:sm:w-56"
              value={sortBy}
              onChange={(event) => onSortChange(event.target.value)}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        )}
      />

      {loading ? (
        <CatalogueSkeleton />
      ) : products.length === 0 ? (
        <div className="tw:flex tw:min-h-56 tw:flex-col tw:items-center tw:justify-center tw:rounded-card tw:border tw:border-dashed tw:border-border tw:bg-surface tw:px-5! tw:py-10! tw:text-center">
          <span className="tw:grid tw:size-11 tw:place-items-center tw:rounded-control tw:bg-muted tw:text-muted-foreground">
            <WarningDiamond size={24} weight="bold" aria-hidden="true" />
          </span>
          <BoutiqueText variant="cardTitle" className="tw:mt-4! tw:text-foreground">
            {error ? "Catalogue unavailable" : "No matching products"}
          </BoutiqueText>
          <BoutiqueText className="tw:mt-1! tw:max-w-md tw:text-muted-foreground">
            {error || "Try changing your search, category, brand, or price range."}
          </BoutiqueText>
          {error && onRetry ? (
            <BoutiqueButton type="button" size="sm" className="tw:mt-5!" onClick={onRetry}>
              Try again
            </BoutiqueButton>
          ) : null}
        </div>
      ) : (
        <div className={PRODUCT_GRID_CLASSES}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              onBuyNow={onBuyNow}
              onClick={onProductClick}
            />
          ))}
        </div>
      )}
    </section>
  );
}
