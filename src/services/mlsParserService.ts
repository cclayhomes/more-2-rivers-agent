export interface ParsedMarketCSV {
  activeCount: number;
  pendingCount: number;
  soldLast30: number | null;
  medianSoldPrice: number;
  avgDOM: number;
  priceReductions: number;
}

export interface ListingItem {
  address: string;
  price: number;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  status: string;
}

export interface ParsedListingsCSV {
  newListings: ListingItem[];
  newListingsCount: number;
}

const parseCsv = (csvRaw: string): Array<Record<string, string>> => {
  const text = csvRaw.replace(/^\uFEFF/, '').trim();
  if (!text) {
    return [];
  }

  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(',').map((header) => header.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });
};

const findValue = (row: Record<string, string>, aliases: string[]): string => {
  const key = Object.keys(row).find((entry) => aliases.some((alias) => entry.toLowerCase() === alias.toLowerCase()));
  return key ? row[key] : '';
};

const parseInteger = (value: string): number => {
  const numeric = parseInt(value.replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(numeric) ? numeric : 0;
};

const parseOptionalInteger = (value: string): number | null => {
  if (!value || !value.trim()) {
    return null;
  }
  const numeric = parseInt(value.replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(numeric) ? numeric : null;
};

const decodeHtmlEntities = (value: string): string => {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
};

const stripHtml = (value: string): string => {
  return decodeHtmlEntities(value)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const parseMarketSnapshotCsv = (csvRaw: string): ParsedMarketCSV => {
  const rows = parseCsv(csvRaw);
  const row = rows[0] || {};

  return {
    activeCount: parseInteger(findValue(row, ['activecount', 'active homes', 'active'])),
    pendingCount: parseInteger(findValue(row, ['pendingcount', 'pending homes', 'pending'])),
    soldLast30: parseOptionalInteger(findValue(row, ['soldlast30', 'sold last 30', 'soldlast30days'])),
    medianSoldPrice: parseInteger(findValue(row, ['mediansoldprice', 'median sold price', 'median sold'])),
    avgDOM: parseInteger(findValue(row, ['avgdom', 'avg days on market', 'days on market'])),
    priceReductions: parseInteger(findValue(row, ['pricereductions', 'price reductions']))
  };
};

export const parseNewListingsCsv = (csvRaw: string): ParsedListingsCSV => {
  const rows = parseCsv(csvRaw);
  const newListings = rows.map((row) => ({
    address: findValue(row, ['address', 'property address']),
    price: parseInteger(findValue(row, ['price', 'list price'])),
    beds: parseOptionalInteger(findValue(row, ['beds', 'bedrooms'])),
    baths: parseOptionalInteger(findValue(row, ['baths', 'bathrooms'])),
    sqft: parseOptionalInteger(findValue(row, ['sqft', 'square feet', 'living area'])),
    status: findValue(row, ['status']) || 'Active'
  })).filter((listing) => listing.address);

  return {
    newListings,
    newListingsCount: newListings.length
  };
};

export const parseListingsFromHtml = (html: string): ParsedListingsCSV => {
  const normalizedHtml = html.replace(/\r/g, '');
  const footerCutoff = normalizedHtml.search(/(?:Have\s+a\s+Question\?|Delivered\s+By|Cotality)/i);
  const contentHtml = footerCutoff >= 0 ? normalizedHtml.slice(0, footerCutoff) : normalizedHtml;
  const plainText = decodeHtmlEntities(contentHtml)
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/\s*(?:p|div|tr|td|table|h[1-6])\s*>/gi, '\n')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

  const listingPattern = /(\$\s?[\d,]{3,}[\s\S]*?MLS\s*#\s*[A-Za-z0-9-]+[\s\S]*?(?=\$\s?[\d,]{3,}|$))/gi;
  const textListings = Array.from(plainText.matchAll(listingPattern)).map((match) => match[1].trim());

  const listings = textListings.map((listingText) => {
    const priceMatch = listingText.match(/\$\s?([\d,]{3,})/i);
    const detailsMatch = listingText.match(/(\d+(?:\.\d+)?)\s*bd\s*[•·]\s*(\d+(?:\.\d+)?)\s*ba\s*[•·]\s*([\d,]+)\s*sq\s*ft/i);
    const lines = listingText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    const cityStateZipLine = lines.find((line) => /[A-Za-z .'-]+,\s*(?:[A-Z]{2}|[A-Za-z]+)\s+\d{5}(?:-\d{4})?\b/i.test(line));
    const cityStateZipMatch = cityStateZipLine?.match(/([A-Za-z .'-]+,\s*(?:[A-Z]{2}|[A-Za-z]+)\s+\d{5}(?:-\d{4})?)/i);
    const cityStateZip = cityStateZipMatch?.[1]?.trim();
    const cityStateZipIndex = cityStateZipLine ? lines.indexOf(cityStateZipLine) : -1;
    const streetLine = cityStateZipIndex > 0 ? lines[cityStateZipIndex - 1] : '';
    const street = streetLine && /\d+\s+/.test(streetLine) ? streetLine : '';

    const address = [street, cityStateZip]
      .filter(Boolean)
      .join(', ')
      .trim();

    return {
      address,
      price: parseInteger(priceMatch?.[1] || ''),
      beds: parseOptionalInteger(detailsMatch?.[1] || ''),
      baths: parseOptionalInteger(detailsMatch?.[2] || ''),
      sqft: parseOptionalInteger(detailsMatch?.[3] || ''),
      status: 'Active'
    };
  }).filter((listing) => listing.address && listing.price > 0);

  return {
    newListings: listings,
    newListingsCount: listings.length
  };
};
