# WooCommerce to GoHighLevel Automation (n8n Replacement)

This repository contains a standalone, lightweight Node.js/TypeScript microservice designed to replace paid n8n/Make/Zapier automations.

## What It Does
1. **Receives Webhook:** Listens for WooCommerce `order.created` webhook notifications.
2. **Product Categories Lookup:** Queries the WooCommerce REST API to fetch product category names for the purchased items.
3. **GoHighLevel Upsert:** Automatically creates/updates the customer contact in GoHighLevel (`https://services.leadconnectorhq.com/contacts/upsert`) with their name, email, phone, and assigns product categories as tags.

---

## Configuration (`.env`)

Configure the environment variables in `.env`:

```env
PORT=3000
GHL_LOCATION_ID=tn21zU0Kxi7Eu7ENTE7w
GHL_API_KEY=pit-2a7c6e2d-533c-4e11-96ab-709c97a6ed07
GHL_API_VERSION=2021-04-15

# WooCommerce API Credentials (Optional - for auto-fetching category names)
WOOCOMMERCE_URL=https://your-domain.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx________
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx________
```

---

## Local Development & Testing

### 1. Install & Build
```bash
npm install
npm run build
```

### 2. Run Integration Test
```bash
npx ts-node src/test.ts
```

### 3. Start Local Server
```bash
npm start
```
Server runs at `http://localhost:3000`.

---

## Deployment Options (100% Free Tier)

To receive webhooks from WooCommerce 24/7, deploy this service to any free serverless or container hosting provider:

### Option A: Vercel / Render / Railway (Easiest)
1. Push this folder to GitHub.
2. Import repository in [Vercel](https://vercel.com) or [Render](https://render.com).
3. Set your Environment Variables (`GHL_API_KEY`, `GHL_LOCATION_ID`, `WOOCOMMERCE_...`).
4. Deploy! You will get a URL like `https://your-app.vercel.app`.

### Option B: Cloudflare Worker / Supabase Edge Function
- Extremely low latency & 100% free up to 100,000 requests/day.

---

## WooCommerce Webhook Setup

Once deployed, link WooCommerce to your service:
1. Log into WordPress Admin -> **WooCommerce** -> **Settings** -> **Advanced** -> **Webhooks**.
2. Click **Add webhook**.
3. Set:
   - **Name:** GoHighLevel Tagging Webhook
   - **Status:** Active
   - **Topic:** Order created
   - **Delivery URL:** `https://your-deployed-url.com/webhook/woocommerce-order`
4. Click **Save Webhook**.
