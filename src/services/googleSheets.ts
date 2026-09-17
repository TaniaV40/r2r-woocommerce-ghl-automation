import { google } from 'googleapis';
import { ParsedOrderData } from './parser';

/**
 * Appends a parsed order row to the Google Sheet with correct column ordering.
 */
export async function appendOrderToGoogleSheet(data: ParsedOrderData): Promise<boolean> {
  try {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID || '1iKNTgq7iLAyYDRAO6dOUn4H1Nso-N-wTrG-7btQYfOM';
    const sheetName = process.env.GOOGLE_SHEET_NAME || 'Master Sheet';

    const defaultClientEmail = 'r2r-sheets-bot@r2r-automations.iam.gserviceaccount.com';
    const defaultPrivateKey = `-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDWKxPjTfbmD8v0\neig/F20tV5AkbVqEA5bru0N28uSgKSb/a1yvmMEN275eKodNeVA6E19CzzZtzSIW\nVyfJFkln2gGidPH/iGlOa8GKgOL5oCJg642JkIrgADW8+gFoSj4O0MyTraDIuf+Q\ntlD16iypSq/xGqFIzS3VMuq36JMBmPYJhmuarKBjUKj0p5LbtjWcGIrTOiZk+x2S\n4wtxPpx0JTSgEIqWrL2Xhw4u0aGh4Ccc29QqkICv5tcT1gXtoGnPc2nRzKq32gxf\nneUpTsvWxKpl5KYm0vsWPgN9e67pT19MLDws3J4SvgqPt5c4bOs60/w9+FacbiBS\nn4YdBCMfAgMBAAECggEAF2hv7Qkpci3J0ffEDFlIIouOgpy9Ju6pgSxfjFGx8Vtu\nGr6mS777YsNgxDQLw8j9nstdPxUc0tV34081VwIrlcE7KoFzrcVAFUUryzKZHEWH\nXGaCesWkmCUNupDstHRg4geqRH3Ws/m4WB3FLYuhxAMYxdZuSGG8n6/H/b/ayXK2\nI5NrN9phpVZLmA1UFn3Gz4ysClR08dWGiReO2DFQ7gX/zMk1ZNOKkrPJ+umoVEPH\nhsyFCqjZ25FvZYwVVz1poM/Thu3wNl15rCqP0QzIsRfwNIjG7lv2sNoWbgu1Mtrs\nP+Ph+ZEJkdG1/p6rpVpYBQpF1jP9bcZJ+Pp06dQcYQKBgQD80296TJB64nEXwVtd\n4BO/+o3bhzEElqORin0P9KLyZ/w8EqncCRLyjQdP/aA5nfGMDAxhR2n1Q1pTSST3\nkxgiBU3lRUTr8jezKPg8bZMUGa1jfSjuUmcC1O3M0WF9EG8Su/RSEZt9nhWO0NHg\noSKrSnCPXqk8dKKIT03+hwigDwKBgQDY22Y4M7aFpublbOBXTI2TtjetXfWAXJE3\nhfJnbZeDnZ8GGu2XSSBxuFJUaiybzeP2gGwZdh0yvXO2isXTFiLkmvRdPpolVSyM\n+gZn4WqroJ63ytsdwM4AKPub2GDXqDHsd6AHEy1JYdlqwfucpLp1JBeywt3ku9ZT\nGSPJjN478QKBgQC6W1NZb2Qz4AOCghjJumh0Ysf7n8vm2O6aUd1bTHRrf3ByC0O/\nF8Uqmf9g288liSFJnHvnnI8ipNHIgCrKflcUhJplO8jQrgqWecV4LUBzWXXv1oq8\nGGsrsC3UgiV83QcyZO5zK91UG5lCWvPIwp1eaxFK7HiMQmCnXuVbjscxywKBgQDY\nHab8gcT344KeyGe3eMprmCBavZXp69apL+uJWfWyrEYMTo/TwoP78UbTa9CzIXh7\ndDbHFSg6JgaIuDo4iQoTK742oyn55K12fcIeis7E5ljnL9o5B6oFDNLb2MOCiNPg\nJsOr6Verl0GXHGWGEcDk9yhK9dsvlmcc/6PjvGjJ8QKBgA1FXzXfXN9wyECuWXLa\nAlcJOQVmmCTVI1yOLUzE4SpzfnxqjYiweluZlOrnoB1zCtEwtjP7Ho8OQhz4UeAK\nutjLxTtSIaGjEYP198cyXXMP5K8wkIaBtdn/gYB2RN1Sn8GIycMrFE8eoJu/vslw\n8zTnKl/D5x7A5/IWWAnnM3Vs\n-----END PRIVATE KEY-----\n`;

    const clientEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.includes('@'))
      ? process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
      : defaultClientEmail;

    let privateKey = process.env.GOOGLE_PRIVATE_KEY || '';
    privateKey = privateKey.trim();
    if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');

    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      privateKey = defaultPrivateKey;
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Column Mapping matching Master Sheet:
    // Col A: Order ID
    // Col B: Date Created
    // Col C: Product Name
    // Col D: Customer Name
    // Col E: Email
    // Col F: Phone
    // Col G: Location
    // Col H: Age Group
    // Col I: Sport Type
    // Col J: Lesson Type
    // Col K: Lesson Time
    // Col L: Lesson day
    // Col M: Order Total £
    const values = [
      [
        String(data.order_id),
        data.date_created,
        data.product_name,
        data.customer_name,
        data.customer_email,
        data.customer_phone,
        data.location,
        data.age_group,
        data.sport_type,
        data.lesson_type,
        data.lesson_time,
        data.lesson_day,
        String(data.order_total)
      ]
    ];

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:M`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values
      }
    });

    console.log(`[Google Sheets] Successfully appended row for Order #${data.order_id}. Updated range: ${response.data.updates?.updatedRange}`);
    return true;
  } catch (error: any) {
    console.error('[Google Sheets] Error appending row to sheet:', error.message || error);
    return false;
  }
}
