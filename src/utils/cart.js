export const calculateSubtotal = (cartItems) => {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return 0; // Return 0 if cartItems is empty or not an array
  }

  const subTotal = cartItems.reduce((acc, item) => {
    // Check if each item has the 'price' product
    if (
      typeof item === 'object' &&
      'product' in item &&
      'price' in item.product
    ) {
      return acc + item.product.price * item.quantity;
    }
    return acc;
  }, 0);

  return Math.round(subTotal * 100) / 100;
};

export const calculateTaxesTotal = (subTotal, taxRate) => {
  if (typeof subTotal !== 'number' || typeof taxRate !== 'number') {
    return 0; // Return 0 if subTotal or taxRate is not a number
  }

  const taxesTotal = subTotal * taxRate;
  return Math.round(taxesTotal * 100) / 100;
};

export const calculateGrandTotal = (subTotal, taxesTotal) => {
  if (typeof subTotal !== 'number' || typeof taxesTotal !== 'number') {
    return 0; // Return 0 if subTotal or taxesTotal is not a number
  }

  const grandTotal = subTotal + taxesTotal;
  return Math.round(grandTotal * 100) / 100;
};
