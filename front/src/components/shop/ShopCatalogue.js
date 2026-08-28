import { WarningDiamond } from "@phosphor-icons/react";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueGrid from "../common/boutique/BoutiqueGrid";
import BoutiqueSelect from "../common/boutique/BoutiqueSelect";
import BoutiqueText from "../common/boutique/BoutiqueText";
import { BQ_COLORS, BQ_GEOMETRY } from "../common/boutique/BoutiqueTheme";
import ProductCard from "./ProductCard";

export default function ShopCatalogue({
  products,
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
            Found {products.length} products
          </BoutiqueText>
          <BoutiqueSelect
            options={sortOptions}
            value={sortBy}
            onChange={onSortChange}
          />
        </BoutiqueBox>

        {products.length === 0 ? (
          <BoutiqueBox
            className="bq-empty-state"
            align="center"
            justify="center"
            padding="100px 20px"
            color={BQ_COLORS.inkFaint}
          >
            <WarningDiamond size={64} weight="bold" />
            <BoutiqueText variant="h3" margin="16px 0 0">
              No products found matching your filters.
            </BoutiqueText>
          </BoutiqueBox>
        ) : (
          <BoutiqueGrid className="bq-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                onBuyNow={onBuyNow}
                onClick={onProductClick}
              />
            ))}
          </BoutiqueGrid>
        )}
      </BoutiqueBox>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-scrollview::-webkit-scrollbar { display: none; }
        .bq-scrollview { scrollbar-width: none; }

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
