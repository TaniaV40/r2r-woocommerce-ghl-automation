import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { getProductCategories } from './services/woocommerce';
import { upsertGHLContact } from './services/gohighlevel';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || 'tn21zU0Kxi7Eu7ENTE7w';

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root Endpoint for Vercel
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'WooCommerce -> GoHighLevel Webhook Automation',
    status: 'running',
    endpoints: {
      health: '/health',
      webhook: '/webhook/woocommerce-order'
    }
  });
});

// WooCommerce Webhook Endpoint
app.post('/webhook/woocommerce-order', async (req: Request, res: Response) => {
  try {
    const order = req.body;

    if (!order || !order.billing) {
      console.warn('Received invalid or empty WooCommerce webhook payload.');
      return res.status(400).json({ error: 'Invalid payload: missing order billing details' });
    }

    const { email, phone, first_name, last_name } = order.billing;
    const lineItems = order.line_items || [];

    if (!email) {
      console.warn('Order missing billing email address. Skipping GHL contact upsert.');
      return res.status(400).json({ error: 'Order missing billing email' });
    }

    const fullName = `${first_name || ''} ${last_name || ''}`.trim();
    let tags: string[] = [];

    // Extract product category tags if line items exist
    if (lineItems.length > 0) {
      const firstProductId = lineItems[0].product_id;
      if (firstProductId) {
        tags = await getProductCategories(firstProductId);
      }
    }

    console.log(`Processing order for ${fullName} (${email}). Category Tags:`, tags);

    const ghlPayload = {
      locationId: GHL_LOCATION_ID,
      email: email,
      phone: phone || '',
      name: fullName,
      tags: tags
    };

    const result = await upsertGHLContact(ghlPayload);

    console.log(`Successfully tagged contact in GHL for ${email}`);
    return res.status(200).json({ success: true, tags, result });

  } catch (error: any) {
    console.error('Error processing WooCommerce order webhook:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// Listen on port when executed directly (not in Vercel serverless environment)
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`WooCommerce -> GoHighLevel Webhook Automation listening on port ${PORT}`);
  });
}

export default app;
