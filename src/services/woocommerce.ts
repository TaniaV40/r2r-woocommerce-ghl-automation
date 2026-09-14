export interface WooCommerceCategory {
  id: number;
  name: string;
  slug: string;
}

export interface WooCommerceProduct {
  id: number;
  name: string;
  categories: WooCommerceCategory[];
}

/**
 * Fetches product details (including categories) from WooCommerce REST API.
 */
export async function getProductCategories(productId: number): Promise<string[]> {
  const url = process.env.WOOCOMMERCE_URL;
  const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
  const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

  if (!url || !consumerKey || !consumerSecret) {
    console.warn('WooCommerce API credentials not fully configured in environment. Skipping API lookup.');
    return [];
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
      return [];
    }

    const data = (await response.json()) as WooCommerceProduct;
    if (data && Array.isArray(data.categories)) {
      return data.categories.map(c => c.name);
    }

    return [];
  } catch (error) {
    console.error('Error fetching WooCommerce product categories:', error);
    return [];
  }
}
