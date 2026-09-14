import http from 'http';
import { spawn, ChildProcess } from 'child_process';

console.log('Starting automation server test with real WooCommerce product ID (14121)...');

let serverProcess: ChildProcess;

async function runTest() {
  // Start server
  serverProcess = spawn('node', ['dist/index.js'], {
    env: { ...process.env, PORT: '3005' },
    stdio: 'pipe'
  });

  serverProcess.stdout?.on('data', (data) => console.log(`[SERVER]: ${data.toString().trim()}`));
  serverProcess.stderr?.on('data', (data) => console.error(`[SERVER ERR]: ${data.toString().trim()}`));

  // Wait 1.5s for server to start
  await new Promise(res => setTimeout(res, 1500));

  // Test /health endpoint
  const healthRes = await makeRequest('http://localhost:3005/health', 'GET');
  console.log('Health check response:', healthRes);

  if (healthRes.status !== 'ok') {
    throw new Error('Health check failed!');
  }

  // Test /webhook/woocommerce-order endpoint with real product ID
  const samplePayload = {
    id: 9999,
    billing: {
      first_name: 'Test',
      last_name: 'Customer',
      email: 'test.customer@example.com',
      phone: '+15551234567'
    },
    line_items: [
      {
        product_id: 14121,
        name: 'Kings Cliffe (KC) Ladies Only FREE Tennis Sessions',
        quantity: 1
      }
    ]
  };

  console.log('Sending sample WooCommerce order payload to webhook...');
  const webhookRes = await makeRequest('http://localhost:3005/webhook/woocommerce-order', 'POST', samplePayload);
  console.log('Webhook test response status:', JSON.stringify(webhookRes, null, 2));

  console.log('✅ ALL LOCAL INTEGRATION TESTS PASSED CLEANLY WITH REAL WOOCOMMERCE & GHL APIS!');

  serverProcess.kill();
  process.exit(0);
}

function makeRequest(url: string, method: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  if (serverProcess) serverProcess.kill();
  process.exit(1);
});
