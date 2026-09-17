import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { getProductDetails } from './services/woocommerce';
import { upsertGHLContact } from './services/gohighlevel';
import { parseOrderDetails } from './services/parser';
import { appendOrderToGoogleSheet } from './services/googleSheets';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || 'tn21zU0Kxi7Eu7ENTE7w';

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root Endpoint GET for Vercel health check
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'WooCommerce -> GoHighLevel & Google Sheets Webhook Automation',
    status: 'running',
    endpoints: {
      health: '/health',
      webhook: '/webhook/woocommerce-order'
    }
  });
});

// Helper function to handle webhook processing logic
async function processWooCommerceWebhook(req: Request, res: Response) {
  try {
    const order = req.body;

    // Handle WooCommerce Webhook Ping Test during webhook creation/save
    if (order && (order.webhook_id || !order.billing)) {
      console.log('Received WooCommerce webhook ping test or non-order event.');
      return res.status(200).json({
        success: true,
        message: 'WooCommerce webhook endpoint verified successfully'
      });
    }

    const { email } = order.billing || {};
    const lineItems = order.line_items || [];

    if (!email) {
      console.warn('Order missing billing email address. Skipping automation execution.');
      return res.status(200).json({ message: 'Skipped: Order missing billing email' });
    }

    let productDetails = undefined;

    // Fetch full product details (categories & tags) if line items exist
    if (lineItems.length > 0) {
      const firstProductId = lineItems[0].product_id;
      if (firstProductId) {
        try {
          const fetchedProduct = await getProductDetails(firstProductId);
          if (fetchedProduct) {
            productDetails = fetchedProduct;
          } else {
            productDetails = { name: lineItems[0].name || '' };
          }
        } catch (wcErr: any) {
          console.error('WooCommerce API lookup warning:', wcErr.message || wcErr);
          productDetails = { name: lineItems[0].name || '' };
        }
      }
    }

    // Parse order & product details into structured metadata
    const parsedData = parseOrderDetails(order, productDetails);

    console.log(`Processing order #${parsedData.order_id} for ${parsedData.customer_name} (${parsedData.customer_email}). Location: ${parsedData.location}, Day: ${parsedData.lesson_day}`);

    // Build GHL Upsert payload with custom fields
    const ghlPayload = {
      locationId: GHL_LOCATION_ID,
      email: parsedData.customer_email,
      phone: parsedData.customer_phone,
      name: parsedData.customer_name,
      tags: parsedData.ghl_tags,
      customFields: [
        { key: 'contact.product_day', field_value: parsedData.lesson_day },
        { key: 'contact.product_time', field_value: parsedData.lesson_time },
        { key: 'contact.product_location', field_value: parsedData.location },
        { key: 'contact.age_group', field_value: parsedData.age_group },
        { key: 'contact.lesson_type', field_value: parsedData.lesson_type },
        { key: 'contact.sport_interested_in', field_value: parsedData.sport_type }
      ]
    };

    // Execute GHL contact upsert safely
    let ghlResult = null;
    try {
      ghlResult = await upsertGHLContact(ghlPayload);
      console.log(`Successfully updated contact in GHL for ${parsedData.customer_email}`);
    } catch (ghlErr: any) {
      console.error(`GHL Upsert warning:`, ghlErr.message || ghlErr);
    }

    // Execute Google Sheets append safely
    let sheetsAppended = false;
    try {
      sheetsAppended = await appendOrderToGoogleSheet(parsedData);
    } catch (sheetsErr: any) {
      console.error(`Google Sheets warning:`, sheetsErr.message || sheetsErr);
    }

    return res.status(200).json({
      success: true,
      parsedData,
      ghl: ghlResult ? { success: true } : { success: false },
      sheets: { appended: sheetsAppended }
    });

  } catch (error: any) {
    console.error('Error processing WooCommerce order webhook:', error.message || error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}

// WooCommerce Webhook Endpoints (Supporting POST /, /webhook/woocommerce-order, and /webhook/order-spreadsheet)
app.post('/', processWooCommerceWebhook);
app.post('/webhook/woocommerce-order', processWooCommerceWebhook);
app.post('/webhook/order-spreadsheet', processWooCommerceWebhook);

// Listen on port when executed directly (not in Vercel serverless environment)
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`WooCommerce -> GoHighLevel & Google Sheets Webhook Automation listening on port ${PORT}`);
  });
}

export default app;
