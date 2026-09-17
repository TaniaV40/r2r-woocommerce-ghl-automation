export interface GHLCustomField {
  key: string;
  field_value: string;
}

export interface GHLUpsertContactPayload {
  locationId: string;
  email: string;
  phone: string;
  name: string;
  tags: string[];
  customFields?: GHLCustomField[];
}

export interface GHLUpsertResponse {
  contact?: Record<string, any>;
  new?: boolean;
  message?: string;
}

/**
 * Upserts a contact in GoHighLevel (LeadConnector) with assigned category tags and custom fields.
 */
export async function upsertGHLContact(payload: GHLUpsertContactPayload): Promise<GHLUpsertResponse> {
  const apiKey = process.env.GHL_API_KEY;
  const version = process.env.GHL_API_VERSION || '2021-04-15';
  const url = 'https://services.leadconnectorhq.com/contacts/upsert';

  if (!apiKey) {
    console.warn('[GHL] GHL_API_KEY environment variable is not configured. Skipping GHL contact upsert.');
    return { message: 'Skipped: GHL_API_KEY missing' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Version': version,
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error(`GHL Upsert Error (${response.status}):`, JSON.stringify(responseData));
      return { message: `GHL Error: ${response.statusText}` };
    }

    return responseData as GHLUpsertResponse;
  } catch (error: any) {
    console.error('[GHL] Network/API Error during GHL contact upsert:', error.message || error);
    return { message: `GHL Error: ${error.message}` };
  }
}
