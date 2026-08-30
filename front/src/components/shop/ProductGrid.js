import {
  Browser,
  Lightning,
  Package,
  ShieldCheck,
  ShoppingCart,
  Snowflake,
  Star,
  WarningDiamond,
} from "@phosphor-icons/react";
import { useState } from "react";

function productPlaceholderIcon(product) {
  if (product?.category === "window") return Browser;
  if (product?.category === "floor") return Package;
  return Snowflake;
}

function ProductImage({ product }) {
  const [broken, setBroken] = useState(false);
  const IconComp = productPlaceholderIcon(product);

  if (product.imageUrl && !broken) {
    return (
      <img
        src={product.imageUrl}
        alt={product.name}
        loading="lazy"
        decoding="async"
        className="product-img"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span className="product-img-fallback">
      <IconComp
        size={64}
        weight="bold"
        className="inline-icon"
        style={{ opacity: 0.15 }}
      />
    </span>
  );
}

function ProductGrid({ products, onAddToCart, onBuyNow, onProductClick }) {
  if (products.length === 0) {
    return (
      <div
        className="no-products"
        style={{ textAlign: "center", padding: "60px 20px", color: "#64748b" }}
      >
        <WarningDiamond
          size={64}
          weight="bold"
          style={{ marginBottom: "16px", opacity: 0.2 }}
        />
        <p style={{ fontWeight: 600 }}>
          No products found. Try adjusting your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="products-grid">
      {products.map((product) => (
        <div
          key={product.id}
          className={`product-card ${product.featured ? "featured" : ""}`}
          onClick={() => onProductClick(product)}
          role="presentation"
        >
          <div className="product-image">
            <ProductImage product={product} />
            {product.discount && (
              <div className="product-badge">{product.discount}% OFF</div>
            )}
            {product.featured && (
              <div className="product-featured-badge">
                <Star
                  size={12}
                  weight="fill"
                  className="inline-icon"
                  style={{ marginRight: "4px" }}
                />{" "}
                Featured
              </div>
            )}
          </div>
          <div className="product-info">
            <div className="product-brand">{product.brand}</div>
            <div className="product-name">{product.name}</div>
            <div className="product-specs">{product.specs}</div>
            <div className="product-price">
              {"\u20b1"}
              {product.price.toLocaleString()}
              {product.oldPrice && (
                <span className="product-old-price">
                  {" "}
                  {"\u20b1"}
                  {product.oldPrice.toLocaleString()}
                </span>
              )}
            </div>

            {typeof product.stock === "number" && product.stock > 0 && (
              <div className="product-stock-status">
                {product.stockLabel || `${product.stock} units available`}
              </div>
            )}

            <div className="product-actions">
              <button
                type="button"
                className="add-to-cart-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product);
                }}
                disabled={!product.inStock}
              >
                {product.inStock ? (
                  <>
                    Add to Cart <ShoppingCart size={18} weight="bold" />
                  </>
                ) : (
                  "Out of Stock"
                )}
              </button>
              {product.inStock && (
                <button
                  type="button"
                  className="buy-now-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBuyNow(product);
                  }}
                >
                  Buy Now <Lightning size={18} weight="fill" />
                </button>
              )}
            </div>

            <div className="product-warranty">
              <ShieldCheck
                size={14}
                weight="bold"
                style={{ marginRight: "6px", color: "#10b981" }}
              />{" "}
              {product.warranty}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ProductGrid;
