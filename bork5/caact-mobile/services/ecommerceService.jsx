import { API_BASE } from "../constants/config";

const DEFAULT_CATALOG_IMAGE_URL =
  "https://images.pexels.com/photos/16592625/pexels-photo-16592625/free-photo-of-air-conditioner-in-a-house.jpeg?auto=compress&dpr=1&h=750&w=1260";

const getProductImageUrl = (product = {}) => {
  const sku = String(product.sku || product.model || "").toUpperCase();
  if (sku.includes("WINDOW")) {
    return "https://www.kimstore.com/cdn/shop/files/DHMETCL0005.png?v=1757586903&width=1946";
  }
  return DEFAULT_CATALOG_IMAGE_URL;
};

export const fallbackProducts = [
  { id: "test-paymongo-001", sku: "TEST-PAYMONGO-001", name: "AeroPulse Test AC Unit", brand: "AeroPulse", model: "TEST-1HP", category: "split", specs: "1.0 HP", price: 100, stock: 10, inStock: true, description: "Test item for the PayMongo checkout flow.", warranty: "Test warranty" },
  { id: "coldair-split-1", sku: "CA-SPLIT-1HP", name: "Coldair Split Type Inverter", brand: "Coldair", model: "CSI-10", category: "split", specs: "1.0 HP", price: 25999, stock: 4, inStock: true, description: "Energy-efficient split type air conditioner.", warranty: "1 year service warranty" },
  { id: "coldair-window-1", sku: "CA-WINDOW-08", name: "Coldair Window Type", brand: "Coldair", model: "CWT-08", category: "window", specs: "0.8 HP", price: 16999, stock: 6, inStock: true, description: "Compact cooling for bedrooms and small spaces.", warranty: "1 year service warranty" },
].map((product) => ({ ...product, imageUrl: getProductImageUrl(product) }));

const normalizeProduct = (product = {}) => ({
  id: String(product.id || product._id || product.productId || product.sku || ""),
  sku: String(product.sku || product.productSku || ""),
  name: product.name || product.productName || "AC Product",
  brand: product.brand || "AeroPulse",
  model: product.model || "",
  category: String(product.category || "split").toLowerCase(),
  specs: product.specs || product.horsepower || "",
  price: Number(product.price || product.salePrice || 0),
  stock: Number(product.stock ?? product.quantity ?? product.inventory ?? 0),
  inStock: Number(product.stock ?? product.quantity ?? product.inventory ?? 0) > 0,
  description: product.description || "",
  warranty: product.warranty || "Standard warranty",
  imageUrl: product.imageUrl || product.image || getProductImageUrl(product),
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
export async function fetchShopProducts() {
  const response = await fetch(`${API_BASE}/products`);
  if (!response.ok) throw new Error("Unable to load products.");
  const body = await response.json();
  return (body.products || body.data || []).map(normalizeProduct).filter((product) => product.id);
}
