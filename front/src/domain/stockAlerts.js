// Current conditions are derived from the authoritative inventory snapshot.
// Historical notification records are left intact in the notification store.
export function inventoryStockState(product, branch, rawStock) {
  const stock = Number(rawStock);
  const threshold = Math.max(0, Number(product?.branchThresholds?.[branch] ?? product?.threshold) || 0);
  if (!Number.isFinite(stock) || stock <= 0) return 'out';
  return threshold > 0 && stock <= threshold ? 'low' : 'available';
}

export function currentStockAlerts(products = [], checkedAt = new Date().toISOString()) {
  return products.flatMap((product) => {
    if (product.isActive === false) return [];
    const stockByBranch = product.branchStock && typeof product.branchStock === 'object' ? product.branchStock : {};
    return Object.entries(stockByBranch).flatMap(([branch, rawStock]) => {
      const branchThreshold = product.branchThresholds?.[branch];
      const threshold = Math.max(0, Number(branchThreshold ?? product.threshold) || 0);
      const stock = Number(rawStock);
      if (!branch || !Number.isFinite(stock) || stock > threshold) return [];
      // Threshold zero still reports an actual out-of-stock condition.
      const outOfStock = stock <= 0;
      return [{
        id: `stock:${product.id || product._id || product.sku}:${branch}`,
        type: 'inventory',
        category: 'stock',
        targetType: 'inventory',
        targetId: product.id || product._id,
        branch,
        title: `${outOfStock ? 'Out of stock' : 'Low stock'}: ${product.name || product.sku}`,
        message: `${branch} has ${stock} unit${stock === 1 ? '' : 's'} remaining${threshold ? ` (alert threshold: ${threshold})` : ''}.`,
        severity: outOfStock ? 'critical' : 'warning',
        createdAt: checkedAt,
        currentCondition: true,
      }];
    });
  });
}
