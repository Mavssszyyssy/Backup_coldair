export const BRAND_LOGOS = {
  Midea: "/catalog/brands/midea.png",
  TCL: "/catalog/brands/tcl.png",
  Aux: "/catalog/brands/aux-logo.svg",
  Samsung: "/catalog/brands/samsung.png",
  Daikin: "/catalog/brands/daikin.png",
  Carrier: "/catalog/brands/carrier-logo.svg",
  LG: "/catalog/brands/lg.jpg",
  "American Home": "/catalog/brands/american-home.jpg",
  Gree: "/catalog/brands/gree.png",
  Generic: "/Cold Air Logo.jpg",
};

export const getBrandLogo = (brandName) => {
  if (!brandName) return BRAND_LOGOS["Generic"];
  return BRAND_LOGOS[brandName] || BRAND_LOGOS["Generic"];
};
