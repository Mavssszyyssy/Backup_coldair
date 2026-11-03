const getProfileAddress = (user = {}) => {
  const billing = user?.billingAddress || user?.billing_address || {};
  const location = user?.location?.address || {};
  const street = [
    user?.apartment_unit || user?.apartmentUnit,
    user?.property_block_lot || user?.propertyBlockLot,
    user?.thoroughfare,
  ].filter(Boolean).join(", ") || billing.street || location.street || user?.address || "";

  return {
    name: user?.name || [user?.name_first, user?.name_last].filter(Boolean).join(" "),
    phone: user?.phone || "",
    street,
    barangay: user?.submunicipality || billing.barangay || location.barangay || "",
    city: user?.municipality || billing.city || location.city || "",
    province: billing.province || location.province || "",
    region: billing.region || location.region || "",
    postalCode: location.postalCode || billing.postalCode || "",
    isDefault: true,
  };
};

export const getAddressForOrder = (user = {}, selectedAddressId = "") =>
  (selectedAddressId
    ? user?.addresses?.find((item) => String(item.id || item._id) === String(selectedAddressId))
    : null) ||
  user?.addresses?.find((item) => item?.isDefault) ||
  user?.addresses?.[0] ||
  getProfileAddress(user);

export const checkoutFingerprint = ({ cartItems = [], address = {}, paymentMethod = "", customerId = "", branch = "" }) =>
  JSON.stringify({
    customerId: String(customerId || ""),
    branch: String(branch || "").trim().toLowerCase(),
    paymentMethod: String(paymentMethod || "").toLowerCase(),
    addressId: String(address.id || address._id || ""),
    address: [address.street, address.barangay, address.city, address.province, address.region, address.postalCode, address.phone]
      .map((value) => String(value || "").trim().toLowerCase()),
    items: cartItems
      .map((item) => ({
        id: String(item.id || item.productId || item.sku || ""),
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  });

export const validateBranchCart = (cart, catalogue, branch) => {
  let branchOutOfStock = false;
  const activeItems = cart.map((cartItem) => {
    const product = catalogue.find((candidate) =>
      String(candidate.id) === String(cartItem.id) ||
      (cartItem.sku && String(candidate.sku) === String(cartItem.sku)));
    if (!product || !product.inStock) {
      branchOutOfStock = branchOutOfStock || Boolean(product);
      return null;
    }
    const requestedQuantity = Number(cartItem.quantity);
    if (!Number.isSafeInteger(requestedQuantity) || requestedQuantity < 1) {
      throw new Error("Each cart quantity must be a positive whole number.");
    }
    if (requestedQuantity > Number(product.stock || 0)) {
      throw new Error(`The ${branch} branch has only ${product.stock} unit(s) of ${product.name}. Reduce the cart quantity before checkout.`);
    }
    return { ...product, quantity: requestedQuantity };
  }).filter(Boolean);
  if (activeItems.length !== cart.length) {
    throw new Error(branchOutOfStock
      ? "This branch currently has no stock of this item"
      : "One or more cart items are not available from this branch. Review your cart before placing the order.");
  }
  return activeItems;
};
