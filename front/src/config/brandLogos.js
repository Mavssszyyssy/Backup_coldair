export const BRAND_LOGOS = {
  Midea: "/catalog/brands/midea.png",
  TCL: "/catalog/brands/tcl-small.png",
  Aux: "/catalog/brands/aux-logo.svg",
  Samsung: "/catalog/brands/samsung.png",
  Daikin: "/catalog/brands/daikin.png",
  Carrier: "/catalog/brands/carrier-logo.svg",
  LG: "/catalog/brands/lg-small.webp",
  "American Home": "/catalog/brands/american-home.jpg",
  Gree: "/catalog/brands/gree-small.png",
  Generic: "/Cold Air Logo-compact.webp",
};

export const getBrandLogo = (brandName) => {
  if (!brandName) return BRAND_LOGOS["Generic"];
  return BRAND_LOGOS[brandName] || BRAND_LOGOS["Generic"];
};
