import { apiFetch } from "../constants/config";

const CATALOG_IMAGE_SOURCES = {
  "samsung-windfree-wallmount.png": require("../assets/catalog/ac/samsung-windfree-wallmount.png"),
  "samsung-bespoke-ai.png": require("../assets/catalog/ac/samsung-bespoke-ai.png"),
  "american-home-ahac-minv.png": require("../assets/catalog/ac/american-home-ahac-minv.png"),
  "tcl-uje-window.png": require("../assets/catalog/ac/tcl-uje-window.png"),
  "tcl-breezein-kei2.png": require("../assets/catalog/ac/tcl-breezein-kei2.png"),
  "midea-celest-msce.png": require("../assets/catalog/ac/midea-celest-msce.png"),
  "samsung-ar9500t.png": require("../assets/catalog/ac/samsung-ar9500t.png"),
  "lg-hsn30ipc.png": require("../assets/catalog/ac/lg-hsn30ipc.png"),
  "lg-hsn-ipx.png": require("../assets/catalog/ac/lg-hsn-ipx.png"),
  "carrier-opus-53cnv.png": require("../assets/catalog/ac/carrier-opus-53cnv.png"),
  "carrier-slim-53clv.png": require("../assets/catalog/ac/carrier-slim-53clv.png"),
  "generic-ac.jpg": require("../assets/catalog/ac/generic-ac.jpg"),
};

export const getProductImageAssetKey = (product = {}) => {
  const sku = String(product.sku || product.model || "").toUpperCase();
  const description = [product.brand, product.name, product.model, product.unitName]
    .map((value) => String(value || "").toUpperCase())
    .join(" ");
  if (sku === "12345678" || sku === "123456789") {
    return "samsung-windfree-wallmount.png";
  }
  if (sku === "WA70F13E4LTC") {
    return "samsung-bespoke-ai.png";
  }
  if (sku.startsWith("AHAC-MINV")) {
    return "american-home-ahac-minv.png";
  }
  if (sku.includes("CWI")) {
    return "tcl-uje-window.png";
  }
  if (sku.startsWith("TAC-")) {
    return "tcl-breezein-kei2.png";
  }
  if (sku.startsWith("MSCE-")) {
    return "midea-celest-msce.png";
  }
  if (/^AR(?:09|12|18|24)TY/.test(sku)) {
    return "samsung-ar9500t.png";
  }
  if (description.includes("SAMSUNG")) {
    return "samsung-ar9500t.png";
  }
  if (sku.startsWith("HSN30")) {
    return "lg-hsn30ipc.png";
  }
  if (sku.startsWith("HSN")) {
    return "lg-hsn-ipx.png";
  }
  if (sku.startsWith("53CNV")) {
    return "carrier-opus-53cnv.png";
  }
  if (sku.startsWith("53CLV")) {
    return "carrier-slim-53clv.png";
  }
  return "generic-ac.jpg";
};

export const getProductImageSource = (product = {}) => CATALOG_IMAGE_SOURCES[getProductImageAssetKey(product)];

const usableLinkedImage = (value) => {
  const image = String(value || "").trim();
  if (!/^https:\/\//i.test(image) || /^https:\/\/(?:www\.)?google\.com\/aclk(?:[/?#]|$)/i.test(image)) return "";
  return image;
};

const getDisplayImageSource = (product) => {
  const assetKey = getProductImageAssetKey(product);
  const sku = String(product.sku || product.model || "").toUpperCase();
  const linkedImage = usableLinkedImage(product.imageUrl || product.image);
  // A newly added model must show its own linked photo, not a generic or
  // brand-only bundled image intended for a different AC model.
  if (linkedImage && (assetKey === "generic-ac.jpg" || (assetKey === "samsung-ar9500t.png" && !/^AR(?:09|12|18|24)TY/.test(sku)))) return null;
  return CATALOG_IMAGE_SOURCES[assetKey];
};

// Products must come from the API so every item shown in the mobile shop has
// a real inventory record and can be checked out. Do not expose placeholder
// products here: they cannot be resolved by the order service.
export const fallbackProducts = [];

export const normalizeProduct = (product = {}) => ({
  id: String(product.id || product._id || product.productId || product.sku || ""),
  sku: String(product.sku || product.productSku || ""),
  name: product.name || product.productName || "AC Product",
  brand: product.brand || "AeroPulse",
  model: product.model || "",
  category: String(product.category || "split").toLowerCase(),
  specs: product.specs || product.horsepower || "",
  horsepower: Number(product.horsepower || String(product.specs || "").match(/(\d+(?:\.\d+)?)/)?.[1] || 0),
  price: Number(product.price || product.salePrice || 0),
  stock: Number(product.stock ?? product.quantity ?? product.inventory ?? 0),
  inStock: Number(product.stock ?? product.quantity ?? product.inventory ?? 0) > 0,
  stockScope: product.stockScope || "all_branches",
  inventoryBranch: product.inventoryBranch || "",
  totalStock: Number(product.totalStock ?? product.stock ?? 0),
  stockLabel:
    product.stockScope === "branch"
      ? `${Number(product.stock || 0)} units · ${product.inventoryBranch}`
      : `${Number(product.totalStock ?? product.stock ?? 0)} units across branches`,
  description: product.description || "",
  warranty: product.warranty || "Standard warranty",
  imageSource: getDisplayImageSource(product),
  imageUrl: usableLinkedImage(product.imageUrl || product.image),
});

export { formatPeso } from "../utils/currency";
export const buildCategories = (products) => [{ value: "all", label: "All" }, ...Array.from(new Set(products.map((product) => product.category).filter(Boolean))).map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))];
export const buildBrands = (products) => [{ value: "all", label: "All brands" }, ...Array.from(new Set(products.map((product) => product.brand).filter(Boolean))).map((value) => ({ value, label: value }))];
export const filterAndSortProducts = (products, { selectedCategory = "all", selectedBrand = "all", searchTerm = "", sortBy = "default" } = {}) => {
  const query = String(searchTerm).trim().toLowerCase();
  const filtered = products.filter((product) => (selectedCategory === "all" || product.category === selectedCategory) && (selectedBrand === "all" || product.brand === selectedBrand) && (!query || [product.name, product.brand, product.model, product.sku].join(" ").toLowerCase().includes(query)));
  return [...filtered].sort((a, b) => ({ price_asc: a.price - b.price, price_desc: b.price - a.price, hp_asc: String(a.specs).localeCompare(String(b.specs)), hp_desc: String(b.specs).localeCompare(String(a.specs)), name_asc: a.name.localeCompare(b.name) }[sortBy] || 0));
};
export const partitionProductsByAvailability = (products = []) => ({
  available: products.filter((product) => product.inStock),
  unavailable: products.filter((product) => !product.inStock),
});
export const paginateProducts = (products = [], requestedPage = 1, pageSize = 8) => {
  const size = Math.max(1, Math.floor(Number(pageSize) || 8));
  const totalPages = Math.max(1, Math.ceil(products.length / size));
  const page = Math.min(totalPages, Math.max(1, Math.floor(Number(requestedPage) || 1)));
  return { items: products.slice((page - 1) * size, page * size), page, totalPages };
};
export const mergeProducts = (fallback, backend) => {
  const merged = new Map((fallback || []).map((product) => [String(product.id), product]));
  (backend || []).forEach((product) => merged.set(String(product.id), product));
  return Array.from(merged.values());
};
export async function resolveConfiguredInventoryBranch(address = {}) {
  const params = new URLSearchParams();
  ["city", "province", "region", "barangay", "street"].forEach((field) => {
    const value = String(address?.[field] || "").trim();
    if (value) params.set(field, value);
  });
  if (!params.toString()) return "";

  const response = await apiFetch(`/branches/resolve?${params.toString()}`);
  if (response.status === 422) return "";
  if (!response.ok) throw new Error("Unable to determine the service branch.");
  const body = await response.json().catch(() => ({}));
  return body?.serviceable ? String(body.branch || "") : "";
}

export function getShopDeliveryAddress(user = {}, selectedAddressId = "") {
  const addresses = Array.isArray(user?.addresses) ? user.addresses : [];
  const selected = selectedAddressId
    ? addresses.find((entry) => String(entry.id || entry._id) === String(selectedAddressId))
    : null;
  return selected || addresses.find((entry) => entry.isDefault) || addresses[0] || null;
}

export async function fetchShopProducts(branch = "") {
  // The public catalogue is intentionally used here. The previous protected
  // endpoint was called without an auth header and made the app silently show
  // only its old test fallback products.
  const query = branch ? `?branch=${encodeURIComponent(branch)}` : "";
  const response = await apiFetch(`/products/public${query}`);
  if (!response.ok) throw new Error("Unable to load products.");
  const body = await response.json();
  return (body.products || body.data || []).map(normalizeProduct).filter((product) => product.id);
}
