import { WarningDiamond } from "@phosphor-icons/react";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueGrid from "../common/boutique/BoutiqueGrid";
import BoutiqueSelect from "../common/boutique/BoutiqueSelect";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS, BQ_GEOMETRY } from "../common/boutique/BoutiqueTheme";
import ProductCard from "./ProductCard";

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
  const sortOptions = [
    { value: "default", label: "Sort by: Default" },
    { value: "price_asc", label: "Price: Low to High" },
    { value: "price_desc", label: "Price: High to Low" },
    { value: "hp_asc", label: "Horsepower: Low to High" },
    { value: "hp_desc", label: "Horsepower: High to Low" },
    { value: "name_asc", label: "Name: A to Z" },
  ];
  const availableProducts = products.filter((product) => product.inStock !== false);
  const unavailableProducts = products.filter((product) => product.inStock === false);

  return (
    <BoutiqueBox
      tag="section"
      className="bq-catalogue"
      flex={1}
      background="white"
      style={{
        height: `calc(100vh - ${BQ_GEOMETRY.headerHeight})`,
        position: "sticky",
        top: BQ_GEOMETRY.headerHeight,
      }}
    >
      <BoutiqueBox
        className="bq-scrollview"
        flex={1}
        padding={32}
        style={{
          overflowY: "auto",
          borderLeft: `1px solid ${BQ_COLORS.border}`,
        }}
      >
        <BoutiqueBox
          direction="row"
          align="center"
          justify="space-between"
          padding="24px 0 12px"
          margin="-32px 0 32px"
          background="white"
          className="bq-catalogue-header"
          style={{
            position: "sticky",
            top: "-32px",
            zIndex: 100,
            borderBottom: "1px solid rgba(0,0,0,0.03)",
          }}
        >
          <BoutiqueText
            className="bq-results-count"
            size="14px"
            weight={700}
            color={BQ_COLORS.inkMuted}
            style={{
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              opacity: 0.6,
            }}
          >
            {loading ? "Loading products..." : `Found ${products.length} products`}
          </BoutiqueText>
          <BoutiqueSelect
            options={sortOptions}
            value={sortBy}
            onChange={onSortChange}
          />
        </BoutiqueBox>

        {loading ? (
          <BoutiqueBox
            className="bq-empty-state"
            align="center"
            justify="center"
            padding="100px 20px"
            color={BQ_COLORS.inkFaint}
            aria-live="polite"
          >
            <BoutiqueText variant="h3">Loading the latest available AC units...</BoutiqueText>
          </BoutiqueBox>
        ) : products.length === 0 ? (
          <BoutiqueBox
            className="bq-empty-state"
            align="center"
            justify="center"
            padding="100px 20px"
            color={BQ_COLORS.inkFaint}
          >
            <WarningDiamond size={64} weight="bold" />
            <BoutiqueText variant="h3" margin="16px 0 0">
              {error || "No products found matching your filters."}
            </BoutiqueText>
            {error && onRetry ? (
              <button type="button" className="bq-catalogue-retry" onClick={onRetry}>Try again</button>
            ) : null}
          </BoutiqueBox>
        ) : (
          <BoutiqueBox>
            {availableProducts.length > 0 ? (
              <BoutiqueBox tag="section" margin="0 0 36px">
                <BoutiqueText variant="h3" margin="0 0 18px">Available now ({availableProducts.length})</BoutiqueText>
                <BoutiqueGrid className="bq-grid">
                  {availableProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} onBuyNow={onBuyNow} onClick={onProductClick} />
                  ))}
                </BoutiqueGrid>
              </BoutiqueBox>
            ) : null}
            {unavailableProducts.length > 0 ? (
              <BoutiqueBox tag="section" aria-label="Out of stock products">
                <BoutiqueText variant="h3" margin="0 0 6px">Out of stock ({unavailableProducts.length})</BoutiqueText>
                <BoutiqueText color={BQ_COLORS.inkMuted} margin="0 0 18px">You can view these AC units, but they cannot be ordered until stock returns.</BoutiqueText>
                <BoutiqueGrid className="bq-grid">
                  {unavailableProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onAddToCart={onAddToCart} onBuyNow={onBuyNow} onClick={onProductClick} />
                  ))}
                </BoutiqueGrid>
              </BoutiqueBox>
            ) : null}
          </BoutiqueBox>
        )}
      </BoutiqueBox>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-scrollview::-webkit-scrollbar { display: none; }
        .bq-scrollview { scrollbar-width: none; }
        .bq-catalogue-retry {
          margin-top: 18px; padding: 11px 20px; border: 0; border-radius: 999px;
          background: #0f172a; color: white; font-weight: 700; cursor: pointer;
        }

        @media (max-width: 900px) {
          .bq-shop-main {
            flex-direction: column !important;
            min-width: 0;
          }
          .bq-catalogue {
            width: 100% !important;
            height: auto !important;
            min-width: 0;
            position: relative !important;
            top: auto !important;
          }
          .bq-scrollview {
            overflow: visible !important;
            padding: 18px 16px 28px !important;
            border-left: 0 !important;
          }
          .bq-catalogue-header {
            position: static !important;
            margin: 0 0 20px !important;
            padding: 0 0 14px !important;
            flex-wrap: wrap;
            gap: 12px;
          }
          .bq-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 16px !important;
          }
        }

        @media (max-width: 620px) {
          .bq-grid { grid-template-columns: minmax(0, 1fr) !important; }
          .bq-catalogue-header > * { width: 100%; }
        }
      `,
        }}
      />
    </BoutiqueBox>
  );
}
