import { WarningDiamond } from "@phosphor-icons/react";
import { useUser } from "../../context/UserContext";
import { isFilipino, translateText } from "../../utils/customerI18n";
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
  const { currentLanguage } = useUser();
  const t = (value) => translateText(value, currentLanguage);
  const sortOptions = [
    { value: "default", label: t("Sort by: Default") },
    { value: "price_asc", label: t("Price: Low to High") },
    { value: "price_desc", label: t("Price: High to Low") },
    { value: "hp_asc", label: t("Horsepower: Low to High") },
    { value: "hp_desc", label: t("Horsepower: High to Low") },
    { value: "name_asc", label: t("Name: A to Z") },
  ];
  const availableProducts = products.filter((product) => product.inStock !== false);
  const unavailableProducts = products.filter((product) => product.inStock === false);

  return (
    <BoutiqueBox
      tag="section"
      className="bq-catalogue"
      flex={1}
      background={BQ_COLORS.surface}
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
          background={BQ_COLORS.surface}
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
            }}
          >
            {loading ? t("Loading products...") : isFilipino(currentLanguage) ? `${products.length} produktong nakita` : `Found ${products.length} products`}
          </BoutiqueText>
          <BoutiqueSelect
            aria-label={t("Sort products")}
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
            style={{ minHeight: `calc(100vh - ${BQ_GEOMETRY.headerHeight})` }}
          >
            <BoutiqueText variant="h2" style={{ fontSize: "18px" }}>{t("Loading the latest available AC units...")}</BoutiqueText>
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
            <BoutiqueText variant="h2" margin="16px 0 0" style={{ fontSize: "18px" }}>
              {error || t("No products found matching your filters.")}
            </BoutiqueText>
            {error && onRetry ? (
              <button type="button" className="bq-catalogue-retry" onClick={onRetry}>{t("Try again")}</button>
            ) : null}
          </BoutiqueBox>
        ) : (
          <BoutiqueBox>
            {availableProducts.length > 0 ? (
              <BoutiqueBox tag="section" margin="0 0 36px">
                <BoutiqueText variant="h2" margin="0 0 18px" style={{ fontSize: "18px" }}>{t("Available now")} ({availableProducts.length})</BoutiqueText>
                <BoutiqueGrid className="bq-grid">
                  {availableProducts.map((product, index) => (
                    <ProductCard key={product.id} product={product} priority={index === 0} eager={index < 3} onAddToCart={onAddToCart} onBuyNow={onBuyNow} onClick={onProductClick} />
                  ))}
                </BoutiqueGrid>
              </BoutiqueBox>
            ) : null}
            {unavailableProducts.length > 0 ? (
              <BoutiqueBox tag="section" aria-label={t("Out of stock products")}>
                <BoutiqueText variant="h2" margin="0 0 6px" style={{ fontSize: "18px" }}>{t("Out of stock")} ({unavailableProducts.length})</BoutiqueText>
                <BoutiqueText color={BQ_COLORS.inkMuted} margin="0 0 18px">{t("You can view these AC units, but they cannot be ordered until stock returns.")}</BoutiqueText>
                <BoutiqueGrid className="bq-grid">
                  {unavailableProducts.map((product, index) => (
                    <ProductCard key={product.id} product={product} priority={availableProducts.length === 0 && index === 0} eager={availableProducts.length === 0 && index < 3} onAddToCart={onAddToCart} onBuyNow={onBuyNow} onClick={onProductClick} />
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
