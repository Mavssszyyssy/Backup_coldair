import {
  Cards,
  ComputerTower,
  DeviceMobile,
  FunnelSimple,
  Gear,
  MagnifyingGlass,
  Snowflake,
  SquareSplitHorizontal,
  SquaresFour,
  Wrench,
} from "@phosphor-icons/react";
import { useState } from "react";
import BoutiqueButton from "../common/boutique/BoutiqueButton";
import BoutiqueText from "../common/boutique/BoutiqueText";

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
    <aside aria-label="Catalogue filters" className="tw:min-w-0">
      <button
        type="button"
        className="tw:flex tw:w-full tw:items-center tw:justify-between tw:rounded-control tw:border tw:border-border tw:bg-surface tw:px-4! tw:py-3! tw:text-left tw:text-body tw:font-semibold tw:text-foreground tw:shadow-soft tw:lg:hidden"
        aria-expanded={mobileFiltersOpen}
        aria-controls="catalogue-filters"
        onClick={() => setMobileFiltersOpen((open) => !open)}
      >
        <span className="tw:flex tw:items-center tw:gap-2">
          <FunnelSimple size={19} weight="bold" aria-hidden="true" />
          Search and filters
        </span>
        <span aria-hidden="true" className="tw:text-xl tw:font-medium tw:leading-none">
          {mobileFiltersOpen ? "−" : "+"}
        </span>
      </button>

      <div
        id="catalogue-filters"
        className={`${mobileFiltersOpen ? "tw:block" : "tw:hidden"} tw:mt-3! tw:rounded-card tw:border tw:border-border tw:bg-surface tw:p-4! tw:shadow-soft tw:lg:sticky tw:lg:top-24 tw:lg:mt-0! tw:lg:block tw:lg:max-h-[calc(100vh-7rem)] tw:lg:overflow-y-auto tw:lg:p-5!`}
      >
        <div>
          <label htmlFor="catalogue-search" className="tw:block tw:text-label tw:font-semibold tw:text-foreground">
            Search products
          </label>
          <div className="tw:relative tw:mt-2!">
            <MagnifyingGlass
              size={18}
              weight="bold"
              aria-hidden="true"
              className="tw:pointer-events-none tw:absolute tw:left-3 tw:top-1/2 tw:-translate-y-1/2 tw:text-muted-foreground"
            />
            <input
              id="catalogue-search"
              type="search"
              className="ap-field tw:h-11 tw:rounded-control! tw:border-input! tw:bg-surface! tw:py-2! tw:pr-3! tw:pl-10! tw:shadow-none!"
              placeholder="Name, brand, or model"
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
        </div>

        <fieldset className="tw:mt-5! tw:border-0 tw:border-t tw:border-border tw:pt-5!">
          <legend className="tw:text-label tw:font-semibold tw:text-foreground">Category</legend>
          <div className="tw:mt-2! tw:grid tw:gap-1">
            {categories.map((category) => {
              const IconComp = CATEGORY_ICONS[category.id] || Snowflake;
              const isActive = selectedCategory === category.id;

              return (
                <button
                  type="button"
                  key={category.id}
                  aria-pressed={isActive}
                  onClick={() => onSelectCategory(category.id)}
                  className={`tw:flex tw:w-full tw:items-center tw:gap-3 tw:rounded-control tw:border tw:px-3! tw:py-2.5! tw:text-left tw:text-body tw:font-medium tw:transition-colors ${isActive ? "tw:border-secondary tw:bg-accent tw:text-accent-foreground" : "tw:border-transparent tw:bg-transparent tw:text-muted-foreground hover:tw:border-border hover:tw:bg-muted hover:tw:text-foreground"}`}
                >
                  <IconComp size={18} weight={isActive ? "fill" : "bold"} aria-hidden="true" />
                  <span className="tw:min-w-0 tw:flex-1 tw:truncate">{category.name}</span>
                  <span className="tw:min-w-7 tw:text-right tw:text-caption tw:font-semibold">{category.count}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="tw:mt-5! tw:border-t tw:border-border tw:pt-5!">
          <label htmlFor="catalogue-brand" className="tw:block tw:text-label tw:font-semibold tw:text-foreground">
            Brand
          </label>
          <select
            id="catalogue-brand"
            className="ap-select tw:mt-2! tw:h-11 tw:rounded-control! tw:border-input! tw:bg-surface! tw:px-3! tw:py-2! tw:shadow-none!"
            value={selectedBrand}
            onChange={(event) => onSelectBrand(event.target.value)}
          >
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand === "all" ? "All brands" : brand}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="tw:mt-5! tw:border-0 tw:border-t tw:border-border tw:pt-5!">
          <legend className="tw:text-label tw:font-semibold tw:text-foreground">Price range</legend>
          <div className="tw:mt-2! tw:grid tw:grid-cols-2 tw:gap-3 tw:lg:grid-cols-1">
            <label className="tw:min-w-0">
              <BoutiqueText variant="caption">Minimum</BoutiqueText>
              <input
                type="number"
                min="0"
                step="1000"
                inputMode="numeric"
                className="ap-field tw:mt-1! tw:h-10 tw:min-w-0 tw:rounded-control! tw:border-input! tw:bg-surface! tw:px-3! tw:py-2! tw:shadow-none!"
                value={priceRange.min}
                onChange={(event) => onPriceChange("min", event.target.value)}
              />
            </label>
            <label className="tw:min-w-0">
              <BoutiqueText variant="caption">Maximum</BoutiqueText>
              <input
                type="number"
                min="0"
                step="1000"
                inputMode="numeric"
                className="ap-field tw:mt-1! tw:h-10 tw:min-w-0 tw:rounded-control! tw:border-input! tw:bg-surface! tw:px-3! tw:py-2! tw:shadow-none!"
                value={priceRange.max}
                onChange={(event) => onPriceChange("max", event.target.value)}
              />
            </label>
          </div>
        </fieldset>

        <BoutiqueButton
          type="button"
          variant="outline"
          size="sm"
          fullWidth
          className="tw:mt-5!"
          onClick={onClearFilters}
        >
          Clear filters
        </BoutiqueButton>
      </div>
    </aside>
  );
}
