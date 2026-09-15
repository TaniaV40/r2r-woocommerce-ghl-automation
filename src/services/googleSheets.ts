import { google } from 'googleapis';
import { ParsedOrderData } from './parser';

/**
 * Appends a parsed order row to the Google Sheet with correct column ordering.
 */
export async function appendOrderToGoogleSheet(data: ParsedOrderData): Promise<boolean> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID || '1iKNTgq7iLAyYDRAO6dOUn4H1Nso-N-wTrG-7btQYfOM';
  const sheetName = process.env.GOOGLE_SHEET_NAME || 'Master Sheet';

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    console.warn('[Google Sheets] GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY not configured. Skipping Google Sheets append.');
    return false;
  }

  // Handle escaped quotes and newlines in environment variable
  privateKey = privateKey.trim();
  if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  try {
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
