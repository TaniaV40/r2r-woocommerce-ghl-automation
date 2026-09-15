export interface WooCommerceCategory {
  id: number;
  name: string;
  slug: string;
}

export interface WooCommerceTag {
  id: number;
  name: string;
  slug: string;
}

export interface WooCommerceProduct {
  id: number;
  name: string;
  categories: WooCommerceCategory[];
  tags?: WooCommerceTag[];
}

/**
 * Fetches full product details (including categories and tags) from WooCommerce REST API.
 */
export async function getProductDetails(productId: number): Promise<WooCommerceProduct | null> {
  const url = process.env.WOOCOMMERCE_URL;
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!url || !consumerKey || !consumerSecret) {
    console.warn('WooCommerce API credentials not fully configured in environment. Skipping API lookup.');
    return null;
  }

  const endpoint = `${url.replace(/\/$/, '')}/wp-json/wc/v3/products/${productId}`;
  const authHeader = 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`WooCommerce API Error (${response.status}):`, errorText);
      return null;
    }

    const data = (await response.json()) as WooCommerceProduct;
    return data;
  } catch (error) {
    console.error('Error fetching WooCommerce product details:', error);
    return null;
  }
}

/**
 * Fetches product category names from WooCommerce REST API.
 */
export async function getProductCategories(productId: number): Promise<string[]> {
  const product = await getProductDetails(productId);
  if (product && Array.isArray(product.categories)) {
    return product.categories.map(c => c.name);
  }
  return [];
}
