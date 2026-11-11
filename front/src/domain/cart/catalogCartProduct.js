const text = (value) => String(value ?? "").trim();

const usableImageUrl = (value) => {
  const url = text(value);
  if (!url) return "";
  // An advertising click-through URL returned by catalog data is an HTML
  // destination, not an image. Loading it in <img> produces a browser error.
  if (/^https:\/\/www\.google\.com\/aclk(?:[/?#]|$)/i.test(url)) return "";
  return url;
};

const parseHorsepower = (value) => {
  const match = text(value).match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

export const getCatalogProductImageUrl = (product = {}) => {
  const sku = text(product.sku || product.model || product.productSku).toUpperCase();

  if (sku === "12345678" || sku === "123456789") return "/catalog/ac/samsung-windfree-wallmount.png";
  if (sku === "WA70F13E4LTC") return "/catalog/ac/samsung-bespoke-ai.png";
  if (sku.startsWith("AHAC-MINV")) return "/catalog/ac/american-home-ahac-minv.png";
  if (sku.includes("CWI")) return "/catalog/ac/tcl-uje-window.png";
  if (sku.startsWith("TAC-")) return "/catalog/ac/tcl-breezein-kei2.png";
  if (sku.startsWith("MSCE-")) return "/catalog/ac/midea-celest-msce.png";
  if (/^AR(?:09|12|18|24)TY/.test(sku)) return "/catalog/ac/samsung-ar9500t.png";
  if (sku.startsWith("HSN30")) return "/catalog/ac/lg-hsn30ipc.png";
  if (sku.startsWith("HSN")) return "/catalog/ac/lg-hsn-ipx.png";
  if (sku.startsWith("53CNV")) return "/catalog/ac/carrier-opus-53cnv.png";
  if (sku.startsWith("53CLV")) return "/catalog/ac/carrier-slim-53clv.png";

  return usableImageUrl(product.imageUrl || product.image);
};

export const mapCatalogProductToCartProduct = (product = {}) => {
  const rawDescription =
    Array.isArray(product.features) && product.features.length > 0
      ? product.features.join(", ")
      : product.description || "";
  const cleanName = text(product.name).replace(/\s*AC\s*$/gi, "").trim();
  const cleanDescription = text(rawDescription).replace(/\s*AC\s*$/gi, "").trim();
  const model = text(product.sku || product.model || product.productSku);
  const stock = Number(product.stock);

  return {
    id: text(product.id || product._id || product.productId),
    name: cleanName,
    brand: text(product.brand) || "Generic",
    category: text(product.category) || "split",
    price: Number(product.price) || 0,
    specs: text(product.specs),
    horsepower:
      Number(product.horsepower || product.capacityHp) ||
      parseHorsepower(product.specs),
    description: cleanDescription || "Energy efficient unit.",
    inStock: Number.isFinite(stock) ? stock > 0 : true,
    stock: Number.isFinite(stock) ? Math.max(0, stock) : undefined,
    availability: product.availability || (stock <= 0 ? "out_of_stock" : "in_stock"),
    stockLabel: product.availability === "low_stock" ? "Low stock" : stock <= 0 ? "Out of stock" : "In stock",
    model,
    sku: model,
    warranty: text(product.warranty) || "1 year parts, 5 years compressor",
    imageUrl:
      getCatalogProductImageUrl(product) || "/catalog/ac/generic-ac.jpg",
    discount: Number(product.discount) || 0,
    featured: Boolean(product.featured),
  };
};

const orderItemSnapshot = (item = {}) => {
  const model = text(item.sku || item.productSku || item.model);
  const stock = Number(item.stock);

  return {
    id: text(item.productId || item.id || item._id),
    name: text(item.name || item.productName),
    brand: text(item.brand),
    category: text(item.category) || "product",
    price: Number(item.price) || 0,
    specs: text(item.specs),
    horsepower:
      Number(item.horsepower || item.capacityHp) || parseHorsepower(item.specs),
    model,
    sku: model,
    imageUrl: getCatalogProductImageUrl(item),
    icon: item.icon,
    ...(Number.isFinite(stock) ? { stock: Math.max(0, stock) } : {}),
  };
};

const findCatalogMatch = (item = {}, catalogProducts = []) => {
  const productId = text(item.productId || item.id || item._id).toLowerCase();
  const model = text(item.sku || item.productSku || item.model).toLowerCase();
  const name = text(item.name || item.productName).toLowerCase();
  const horsepower =
    Number(item.horsepower || item.capacityHp) || parseHorsepower(item.specs);

  if (productId) {
    const idMatch = catalogProducts.find(
      (product) =>
        text(product.id || product._id || product.productId).toLowerCase() === productId,
    );
    if (idMatch) return idMatch;
  }

  if (model) {
    const modelMatch = catalogProducts.find(
      (product) =>
        text(product.sku || product.model || product.productSku).toLowerCase() === model,
    );
    if (modelMatch) return modelMatch;
  }

  const nameMatches = catalogProducts.filter(
    (product) => text(product.name).toLowerCase() === name,
  );
  if (nameMatches.length === 1) return nameMatches[0];
  if (nameMatches.length > 1 && horsepower > 0) {
    return nameMatches.find(
      (product) =>
        (Number(product.horsepower || product.capacityHp) ||
          parseHorsepower(product.specs)) === horsepower,
    );
  }

  return null;
};

export const resolveReorderCartProduct = (item = {}, catalogProducts = []) => {
  const snapshot = orderItemSnapshot(item);
  const catalogMatch = findCatalogMatch(item, catalogProducts);

  if (!catalogMatch) return snapshot;

  const currentProduct = mapCatalogProductToCartProduct(catalogMatch);
  return {
    ...snapshot,
    ...currentProduct,
    id: currentProduct.id || snapshot.id,
  };
};
