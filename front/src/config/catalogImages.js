const thumbnailByOriginal = {
  "/catalog/ac/tcl-uje-window.jpg": "/catalog/ac/tcl-uje-window-card.jpg",
  "/catalog/ac/tcl-breezein-kei2.jpg": "/catalog/ac/tcl-breezein-kei2-card.jpg",
  "/catalog/ac/carrier-opus-53cnv.jpg": "/catalog/ac/carrier-opus-53cnv-card.jpg",
};

export const getCatalogThumbnailUrl = (imageUrl) => thumbnailByOriginal[imageUrl] || imageUrl;
