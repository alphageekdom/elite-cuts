const apiDomain = process.env.NEXT_PUBLIC_API_DOMAIN || null;

// Fetch All Products
async function fetchProducts({ showFeatured = false } = {}) {
  try {
    // Handle if domain is unavailable
    if (!apiDomain) {
      return [];
    }

    const res = await fetch(
      `${apiDomain}/products${showFeatured ? '/featured' : ''}`,
      { cache: 'no-store' }
    );

    if (!res.ok) {
      throw new Error('Failed To Fetch Data');
    }

    return res.json();
  } catch (error) {
    console.log(error);
    return [];
  }
}

// Fetch Single Product
async function fetchProduct(id) {
  try {
    // Handle if domain is unavailable
    if (!apiDomain) {
      return null;
    }

    const res = await fetch(`${apiDomain}/products/${id}`);

    if (!res.ok) {
      throw new Error('Failed To Fetch Data');
    }

    return res.json();
  } catch (error) {
    console.log(error);
    return null;
  }
}

export { fetchProducts, fetchProduct };
