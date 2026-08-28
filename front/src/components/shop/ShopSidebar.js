import {
  Cards,
  ComputerTower,
  DeviceMobile,
  Gear,
  Snowflake,
  SquareSplitHorizontal,
  SquaresFour,
  Wrench,
} from "@phosphor-icons/react";
import { useState } from "react";
import BoutiqueBox from "../common/boutique/BoutiqueBox";
import BoutiqueCheckbox from "../common/boutique/BoutiqueCheckbox";
import BoutiqueNumberInput from "../common/boutique/BoutiqueNumberInput";
import BoutiqueSearchInput from "../common/boutique/BoutiqueSearchInput";
import BoutiqueStack from "../common/boutique/BoutiqueStack";
import BoutiqueText from "../common/boutique/BoutiqueText";
import {
  BQ_COLORS,
  BQ_GEOMETRY,
  BQ_SHADOWS,
} from "../common/boutique/BoutiqueTheme";

const CATEGORY_ICONS = {
  split: Cards,
  window: SquareSplitHorizontal,
  floor: ComputerTower,
  portable: DeviceMobile,
  all: SquaresFour,
  service: Wrench,
  parts: Gear,
};

export default function ShopSidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  brands,
  selectedBrand,
  onSelectBrand,
  priceRange,
  onPriceChange,
  searchTerm,
  onSearchChange,
  onClearFilters,
}) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  return (
    <BoutiqueBox
      tag="aside"
      className="bq-sidebar"
      width={BQ_GEOMETRY.sidebarWidth}
      background={BQ_COLORS.bg}
      padding="24px 20px"
      style={{
        height: `calc(100vh - ${BQ_GEOMETRY.headerHeight})`,
        position: "sticky",
        top: BQ_GEOMETRY.headerHeight,
        flexShrink: 0,
        overflowY: "auto",
      }}
    >
      <button
        type="button"
        className="bq-mobile-filter-toggle"
        aria-expanded={mobileFiltersOpen}
        onClick={() => setMobileFiltersOpen((open) => !open)}
      >
        <span>Search &amp; filters</span>
        <span aria-hidden="true">{mobileFiltersOpen ? "−" : "+"}</span>
      </button>

      <BoutiqueStack
        gap={32}
        className={`bq-sidebar-content ${mobileFiltersOpen ? "is-open" : ""}`}
      >
        <BoutiqueStack gap={16} className="bq-sidebar-section">
          <BoutiqueText
            variant="label"
            className="bq-sidebar-title"
            color={BQ_COLORS.inkMuted}
            style={{ letterSpacing: "0.2em", opacity: 0.8 }}
          >
            Search
          </BoutiqueText>
          <BoutiqueSearchInput
            placeholder="Search products..."
            value={searchTerm}
            onChange={onSearchChange}
          />
        </BoutiqueStack>

        <BoutiqueStack gap={16} className="bq-sidebar-section">
          <BoutiqueText
            variant="label"
            className="bq-sidebar-title"
            color={BQ_COLORS.inkMuted}
            style={{ letterSpacing: "0.2em", opacity: 0.8 }}
          >
            Categories
          </BoutiqueText>
          <BoutiqueStack
            gap={4}
            tag="ul"
            className="bq-cat-list"
            padding={0}
            margin={0}
            style={{ listStyle: "none" }}
          >
            {categories.map((category) => {
              const IconComp = CATEGORY_ICONS[category.id] || Snowflake;
              const isActive = selectedCategory === category.id;
              return (
                <BoutiqueBox
                  tag="li"
                  key={category.id}
                  direction="row"
                  align="center"
                  justify="space-between"
                  padding="10px 16px"
                  className={`bq-cat-item ${isActive ? "active" : ""}`}
                  onClick={() => onSelectCategory(category.id)}
                  style={{
                    borderRadius: BQ_GEOMETRY.radiusPill,
                    cursor: "pointer",
                    transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  <BoutiqueBox
                    direction="row"
                    align="center"
                    gap={14}
                    className="bq-cat-content"
                  >
                    <IconComp size={20} weight={isActive ? "fill" : "bold"} />
                    <BoutiqueText size="14px" weight={700}>
                      {category.name}
                    </BoutiqueText>
                  </BoutiqueBox>
                  <BoutiqueBox className="bq-cat-right">
                    <BoutiqueText
                      className="bq-cat-count"
                      size="10px"
                      weight={700}
                      padding="2px 8px"
                      style={{
                        background: isActive
                          ? "rgba(255,255,255,0.2)"
                          : "rgba(0,0,0,0.05)",
                        borderRadius: BQ_GEOMETRY.radiusPill,
                        color: isActive ? "white" : "inherit",
                      }}
                    >
                      {category.count}
                    </BoutiqueText>
                  </BoutiqueBox>
                </BoutiqueBox>
              );
            })}
          </BoutiqueStack>
        </BoutiqueStack>

        <BoutiqueStack gap={16} className="bq-sidebar-section">
          <BoutiqueText
            variant="label"
            className="bq-sidebar-title"
            color={BQ_COLORS.inkMuted}
            style={{ letterSpacing: "0.2em", opacity: 0.8 }}
          >
            Brands
          </BoutiqueText>
          <BoutiqueStack gap={4} className="bq-brand-list">
            {brands.map((brand) => (
              <BoutiqueCheckbox
                key={brand}
                type="radio"
                label={brand === "all" ? "All Brands" : brand}
                checked={selectedBrand === brand}
                onChange={() => onSelectBrand(brand)}
              />
            ))}
          </BoutiqueStack>
        </BoutiqueStack>

        <BoutiqueStack gap={16} className="bq-sidebar-section">
          <BoutiqueText
            variant="label"
            className="bq-sidebar-title"
            color={BQ_COLORS.inkMuted}
            style={{ letterSpacing: "0.2em", opacity: 0.8 }}
          >
            Price Range
          </BoutiqueText>
          <BoutiqueStack gap={16} className="bq-price-inputs">
            <BoutiqueBox
              direction="row"
              align="center"
              gap={16}
              className="bq-price-field-group"
            >
              <BoutiqueText
                variant="label"
                size="9px"
                weight={700}
                color={BQ_COLORS.inkFaint}
                style={{ letterSpacing: "0.1em", minWidth: "54px" }}
              >
                Maximum
              </BoutiqueText>
              <BoutiqueNumberInput
                size="sm"
                placeholder="Max Price"
                value={priceRange.max}
                onChange={(val) => onPriceChange("max", val)}
                min={0}
                step={1000}
                width="100%"
              />
            </BoutiqueBox>
            <BoutiqueBox
              direction="row"
              align="center"
              gap={16}
              className="bq-price-field-group"
            >
              <BoutiqueText
                variant="label"
                size="9px"
                weight={700}
                color={BQ_COLORS.inkFaint}
                style={{ letterSpacing: "0.1em", minWidth: "54px" }}
              >
                Minimum
              </BoutiqueText>
              <BoutiqueNumberInput
                size="sm"
                placeholder="Min Price"
                value={priceRange.min}
                onChange={(val) => onPriceChange("min", val)}
                min={0}
                step={1000}
                width="100%"
              />
            </BoutiqueBox>
          </BoutiqueStack>
        </BoutiqueStack>

        <button className="bq-clear-btn" onClick={onClearFilters}>
          Clear All Filters
        </button>
      </BoutiqueStack>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .bq-sidebar::-webkit-scrollbar { display: none; }
        .bq-sidebar { scrollbar-width: none; }

        .bq-mobile-filter-toggle {
          display: none;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          border: 1px solid ${BQ_COLORS.border};
          border-radius: ${BQ_GEOMETRY.radiusPill};
          background: white;
          color: ${BQ_COLORS.ink};
          padding: 14px 18px;
          font: inherit;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .bq-cat-item { color: ${BQ_COLORS.inkMuted}; }
        .bq-cat-item:hover { background: white; color: ${BQ_COLORS.ink}; box-shadow: ${BQ_SHADOWS.soft}; transform: translateX(4px); }
        .bq-cat-item.active { background: ${BQ_COLORS.brand}; color: white; box-shadow: ${BQ_SHADOWS.float}; transform: translateX(0); }

        .bq-clear-btn {
          width: 100%; padding: 16px; background: transparent;
          border: 1px solid ${BQ_COLORS.border}; border-radius: ${BQ_GEOMETRY.radiusPill};
          font-family: inherit; font-weight: 700; font-size: 12px;
          color: ${BQ_COLORS.inkMuted}; text-transform: uppercase; letter-spacing: 0.1em;
          cursor: pointer; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); margin-top: 16px;
        }
        .bq-clear-btn:hover { border-color: ${BQ_COLORS.ink}; color: ${BQ_COLORS.ink}; background: white; box-shadow: ${BQ_SHADOWS.soft}; transform: translateY(-2px); }

        @media (max-width: 900px) {
          .bq-sidebar {
            width: 100% !important;
            height: auto !important;
            position: relative !important;
            top: auto !important;
            padding: 14px 16px !important;
            overflow: visible !important;
            border-bottom: 1px solid ${BQ_COLORS.border};
          }
          .bq-mobile-filter-toggle { display: flex; }
          .bq-sidebar-content { display: none !important; padding-top: 18px; }
          .bq-sidebar-content.is-open { display: flex !important; }
        }
      `,
        }}
      />
    </BoutiqueBox>
  );
}
