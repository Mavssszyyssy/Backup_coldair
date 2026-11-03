export const sortInventoryProducts = (products = [], sort = 'recent') => {
  if (!['name-asc', 'name-desc'].includes(sort)) return [...products];
  const direction = sort === 'name-asc' ? 1 : -1;
  return [...products].sort((left, right) =>
    direction * String(left.name || '').localeCompare(String(right.name || ''), 'en', { sensitivity: 'base' })
    || String(left.sku || left.id || '').localeCompare(String(right.sku || right.id || ''), 'en', { sensitivity: 'base' }));
};
