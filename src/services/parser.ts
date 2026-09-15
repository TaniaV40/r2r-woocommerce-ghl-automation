export interface ParsedOrderData {
  order_id: number | string;
  date_created: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  product_name: string;
  order_total: string | number;
  lesson_day: string;
  lesson_time: string;
  location: string;
  age_group: string;
  sport_type: string;
  lesson_type: string;
  ghl_tags: string[];
}

export interface CategoryOrTag {
  id?: number;
  name: string;
  slug?: string;
}

export interface ProductDataInput {
  name: string;
  categories?: CategoryOrTag[];
  tags?: CategoryOrTag[];
}

export interface OrderDataInput {
  id: number | string;
  number?: string | number;
  date_created?: string;
  total?: string | number;
  billing?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
}

const has = (str: string, word: string): boolean =>
  str.toLowerCase().includes(word.toLowerCase());

function formatDateCreated(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 19);
  }
  return dateStr.replace('T', ' ').replace(/Z.*$/, '').substring(0, 19);
}

/**
 * Parses WooCommerce order and product details into structured lesson metadata.
 */
export function parseOrderDetails(
  orderData: OrderDataInput,
  productData?: ProductDataInput
): ParsedOrderData {
  const orderId = orderData.number ?? orderData.id;
  const productName = productData?.name || '';
  const cats = productData?.categories || [];
  const tags = productData?.tags || [];

  // A. Find LESSON DAY
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayFoundInCat = cats.find(c => daysOfWeek.includes(c.name));
  const dayFoundInName = daysOfWeek.find(d => has(productName, d));
  const lessonDay = dayFoundInCat ? dayFoundInCat.name : (dayFoundInName || 'Unknown Day');

  // B. Find TIME (Check tags first, then product name patterns like 5:30 - 6.30 or 4.30pm)
  let lessonTime = 'Unknown Time';
  const timeFoundInTag = tags.find(t =>
    /[0-9]/.test(t.name) && (t.name.includes('pm') || t.name.includes('am') || t.name.includes('.'))
  );
  if (timeFoundInTag) {
    lessonTime = timeFoundInTag.name;
  } else {
    const timeMatch = productName.match(/\b\d{1,2}(?::\d{2})?\s*-\s*\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?\b/i) ||
                      productName.match(/\b\d{1,2}(?:\.\d{2})?\s*(?:am|pm)\b/i);
    if (timeMatch) {
      lessonTime = timeMatch[0];
    }
  }

  // C. Find LOCATION
  let location = 'Other';
  if (has(productName, 'Kings Cliffe')) location = 'Kings Cliffe';
  else if (has(productName, 'Thrapston')) location = 'Thrapston';
  else if (has(productName, 'Uppingham')) location = 'Uppingham';
  else if (has(productName, 'Ketton')) location = 'Ketton';
  else if (has(productName, 'Padel') || has(productName, 'Tur Langton')) location = 'Padel';
  else {
    const knownLocations = ['Ketton', 'Thrapston', 'Oundle', 'Corby'];
    const specificLoc = cats.find(c => knownLocations.some(k => c.name.includes(k)));
    location = specificLoc ? specificLoc.name : 'Other';
  }

  // D. Find SPORT TYPE
  let sportType = 'Tennis';
  if (has(productName, 'Padel')) sportType = 'Padel';
  else if (cats.find(c => c.name.includes('Tennis'))) sportType = 'Tennis';

  // E. Find AGE GROUP
  const ageKeywords = ['Adult', 'Junior', 'Teen', 'Kid', 'Mini', 'Tots'];
  let ageGroup = 'General';
  const ageCat = cats.find(c => ageKeywords.some(k => c.name.includes(k)));
  if (ageCat) {
    ageGroup = ageCat.name;
  } else if (has(productName, 'Adult')) {
    ageGroup = 'Adults';
  } else if (has(productName, 'Junior')) {
    ageGroup = 'Juniors';
  }

  // F. Find LESSON TYPE
  let lessonType = 'Group';
  const orderTotalNum = typeof orderData.total === 'number' ? orderData.total : parseFloat(orderData.total || '0');
  if (has(productName, 'Camp')) lessonType = 'CAMP';
  else if (has(productName, 'Free') || orderTotalNum === 0) lessonType = 'Free';
  else {
    const lessonTypeFound = cats.find(
      c =>
        !daysOfWeek.includes(c.name) &&
        !['Venues', 'Tennis', 'Padel'].includes(c.name) &&
        !ageKeywords.some(k => c.name.includes(k))
    );
    if (lessonTypeFound) lessonType = lessonTypeFound.name;
  }

  // G. Combine GHL tags (unique categories, tags, product name)
  const tagList = [
    ...cats.map(c => c.name),
    ...tags.map(t => t.name),
    productName
  ].filter(Boolean);
  const ghlTags = Array.from(new Set(tagList));

  const firstName = orderData.billing?.first_name || '';
  const lastName = orderData.billing?.last_name || '';
  const customerName = `${firstName} ${lastName}`.trim();

  return {
    order_id: orderId,
    date_created: formatDateCreated(orderData.date_created),
    customer_name: customerName,
    customer_email: orderData.billing?.email || '',
    customer_phone: orderData.billing?.phone || '',
    product_name: productName,
    order_total: orderData.total ?? '0',
    lesson_day: lessonDay,
    lesson_time: lessonTime,
    location: location,
    age_group: ageGroup,
    sport_type: sportType,
    lesson_type: lessonType,
    ghl_tags: ghlTags
  };
}
