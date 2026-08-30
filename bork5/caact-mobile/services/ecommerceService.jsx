import { apiFetch } from "../constants/config";

const DEFAULT_CATALOG_IMAGE_URL =
  "https://images.pexels.com/photos/16592625/pexels-photo-16592625/free-photo-of-air-conditioner-in-a-house.jpeg?auto=compress&dpr=1&h=750&w=1260";
const CATALOG_ASSET_BASE_URL = "https://coldair-act.online/catalog/ac";

export const getProductImageUrl = (product = {}) => {
  const sku = String(product.sku || product.model || "").toUpperCase();
  if (sku.startsWith("AHAC-MINV")) {
    return `${CATALOG_ASSET_BASE_URL}/american-home-ahac-minv.jpg`;
  }
  if (sku.includes("CWI")) {
    return `${CATALOG_ASSET_BASE_URL}/tcl-uje-window.png`;
  }
  if (sku.startsWith("TAC-")) {
    return `${CATALOG_ASSET_BASE_URL}/tcl-breezein-kei2.jpg`;
  }
  if (sku.startsWith("MSCE-")) {
    return `${CATALOG_ASSET_BASE_URL}/midea-celest-msce.jpg`;
  }
  if (/^AR(?:09|12|18|24)TY/.test(sku)) {
    return `${CATALOG_ASSET_BASE_URL}/samsung-ar9500t.png`;
  }
  if (sku.startsWith("HSN30")) {
    return `${CATALOG_ASSET_BASE_URL}/lg-hsn30ipc.jpg`;
  }
  if (sku.startsWith("HSN")) {
    return `${CATALOG_ASSET_BASE_URL}/lg-hsn-ipx.jpg`;
  }
  if (sku.startsWith("53CNV")) {
    return `${CATALOG_ASSET_BASE_URL}/carrier-opus-53cnv.jpg`;
  }
  if (sku.startsWith("53CLV")) {
    return `${CATALOG_ASSET_BASE_URL}/carrier-slim-53clv.jpg`;
  }
  return "";
};

// Products must come from the API so every item shown in the mobile shop has
// a real inventory record and can be checked out. Do not expose placeholder
// products here: they cannot be resolved by the order service.
export const fallbackProducts = [];

const normalizeProduct = (product = {}) => ({
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
  stockLabel:
    product.stockScope === "branch"
      ? `${Number(product.stock || 0)} units · ${product.inventoryBranch}`
      : `${Number(product.totalStock ?? product.stock ?? 0)} units across branches`,
  description: product.description || "",
  warranty: product.warranty || "Standard warranty",
  imageUrl:
    getProductImageUrl(product) ||
    product.imageUrl ||
    product.image ||
    DEFAULT_CATALOG_IMAGE_URL,
});

export const formatPeso = (value) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value || 0));
export const buildCategories = (products) => [{ value: "all", label: "All" }, ...Array.from(new Set(products.map((product) => product.category).filter(Boolean))).map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))];
export const buildBrands = (products) => [{ value: "all", label: "All brands" }, ...Array.from(new Set(products.map((product) => product.brand).filter(Boolean))).map((value) => ({ value, label: value }))];
export const filterAndSortProducts = (products, { selectedCategory = "all", selectedBrand = "all", searchTerm = "", sortBy = "default" } = {}) => {
  const query = String(searchTerm).trim().toLowerCase();
  const filtered = products.filter((product) => (selectedCategory === "all" || product.category === selectedCategory) && (selectedBrand === "all" || product.brand === selectedBrand) && (!query || [product.name, product.brand, product.model, product.sku].join(" ").toLowerCase().includes(query)));
  return [...filtered].sort((a, b) => ({ price_asc: a.price - b.price, price_desc: b.price - a.price, hp_asc: String(a.specs).localeCompare(String(b.specs)), hp_desc: String(b.specs).localeCompare(String(a.specs)), name_asc: a.name.localeCompare(b.name) }[sortBy] || 0));
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
