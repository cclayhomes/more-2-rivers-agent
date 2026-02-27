export type RedfinMarketData = {
  medianSoldPrice: number;
  avgDOM: number;
  homesSoldCount: number;
  priceReductions: number;
};

const REDFIN_MARKET_URL = 'https://www.redfin.com/zipcode/33541/housing-market';

const cleanHtmlToText = (html: string): string => {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const parseFirstInt = (value: string): number => {
  const normalized = value.replace(/,/g, '');
  const parsed = parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const fetchRedfinMarketData = async (): Promise<RedfinMarketData | null> => {
  try {
    const response = await fetch(REDFIN_MARKET_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const text = cleanHtmlToText(html);

    const medianMatch = text.match(/selling for a median price of \$([\d,]+)(K?)/i);
    const avgDomMatch = text.match(/sell after\s+(\d+)\s+days on the market/i);
    const homesSoldMatch = text.match(/(\d+)\s+homes sold/i);
    const belowListPriceMatch = text.match(/([\d.]+)%\s+below list price/i);

    if (!medianMatch || !avgDomMatch || !homesSoldMatch) {
      return null;
    }

        const medianSoldPriceRaw = parseFirstInt(medianMatch[1]);
        const medianSoldPrice = medianMatch[2]?.toUpperCase() === 'K' ? medianSoldPriceRaw * 1000 : medianSoldPriceRaw;
    const avgDOM = parseFirstInt(avgDomMatch[1]);
    const homesSoldCount = parseFirstInt(homesSoldMatch[1]);

    const belowListPercent = belowListPriceMatch ? Number.parseFloat(belowListPriceMatch[1]) : 0;
    const priceReductions = belowListPercent > 0 ? Math.round((belowListPercent / 100) * homesSoldCount) : 0;

    return {
      medianSoldPrice,
      avgDOM,
      homesSoldCount,
      priceReductions
    };
  } catch (error) {
    console.error('Failed to fetch Redfin market data', error);
    return null;
  }
};
