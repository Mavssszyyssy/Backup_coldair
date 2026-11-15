import {
  Browser,
  DeviceMobile,
  Lightning,
  MagnifyingGlass,
  Package,
  Snowflake,
  SquaresFour,
  Wrench,
} from "@phosphor-icons/react";
import { useState } from "react";

const CATEGORY_ICONS = {
  split: Snowflake,
  window: Browser,
  portable: DeviceMobile,
  inverter: Lightning,
  accessories: Wrench,
  floor: Package,
  all: SquaresFour,
};

function CategoryFilter({ categories, selectedCategory, onSelectCategory }) {
  const [searchTerm, setSearchTerm] = useState("");

  const getCategoryIcon = (categoryId) =>
    CATEGORY_ICONS[categoryId] || CATEGORY_ICONS.all;

  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="category-filter">
      <h3 className="sidebar-title">Categories</h3>

      <div className="category-content">
        <div
          className="category-search"
          style={{ position: "relative", padding: "0 0 24px" }}
        >
          <MagnifyingGlass
            size={18}
            weight="bold"
            style={{
              position: "absolute",
              left: "18px",
              top: "16px",
              color: "var(--bq-ink-faint)",
            }}
          />
          <input
            maxLength={160}
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="category-search-input"
            style={{ paddingLeft: "48px" }}
          />
        </div>

        <ul className="category-list">
          {filteredCategories.map((category) => {
            const IconComp = getCategoryIcon(category.id);
            const isActive = selectedCategory === category.id;
            return (
              <li
                key={category.id}
                className={`category-item ${isActive ? "active" : ""}`}
                onClick={() => onSelectCategory(category.id)}
                role="presentation"
              >
                <div className="category-item-content">
                  <IconComp
                    size={20}
                    weight={isActive ? "fill" : "bold"}
                    className="inline-icon"
                  />
                  <span className="category-name">{category.name}</span>
                </div>
                <div className="category-right">
                  <span className="category-count">{category.count}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default CategoryFilter;
