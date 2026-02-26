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
  const blocks = normalizedHtml
    .split(/(?:<hr\b[^>]*>|(?:\n\s*){2,})/i)
    .map((block) => block.trim())
    .filter((block) => /(mls\s*#?|\$\s?[\d,]{4,}|beds?|baths?|sq\.?\s?ft)/i.test(block));

  const listings = blocks.map((block) => {
    const text = stripHtml(block);

    const priceMatch = text.match(/\$\s?([\d,]{3,})/i);
    const bedsMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:beds?|bd)\b/i);
    const bathsMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:baths?|ba)\b/i);
    const sqftMatch = text.match(/([\d,]{3,})\s*(?:sq\.?\s*ft|sqft|sf)\b/i);
    const mlsMatch = text.match(/mls\s*(?:#|no\.?|number)?\s*[:#-]?\s*([A-Za-z0-9-]+)/i);
    const statusMatch = text.match(/\b(New Listing|Price Change|Back on Market|Pending|Sold|Active|Coming Soon)\b/i);

    const addressLine = text
      .split(/\s{2,}|\|/)
      .map((part) => part.trim())
      .find((part) => /\d+\s+.+/.test(part) && !/\$|beds?|baths?|sq\.?\s?ft|mls/i.test(part));

    const cityStateZipMatch = text.match(/([A-Za-z .'-]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)/);
    const address = [addressLine, cityStateZipMatch?.[1]].filter(Boolean).join(', ').trim();

    return {
      address,
      price: parseInteger(priceMatch?.[1] || ''),
      beds: parseOptionalInteger(bedsMatch?.[1] || ''),
      baths: parseOptionalInteger(bathsMatch?.[1] || ''),
      sqft: parseOptionalInteger(sqftMatch?.[1] || ''),
      status: statusMatch?.[1] || (mlsMatch ? `MLS ${mlsMatch[1]}` : 'Active')
    };
  }).filter((listing) => listing.address);

  return {
    newListings: listings,
    newListingsCount: listings.length
  };
};
