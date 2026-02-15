import { ListingItem } from './mlsParserService';

export interface MarketImageData {
  activeCount: number;
  soldLast30: number | null;
  medianSoldPrice: number;
  avgDOM: number;
  priceReductions: number;
}

export interface ListingsImageData {
  listings: ListingItem[];
}

const WIDTH = 1080;
const HEIGHT = 1080;
const NAVY = '#0B2D5C';
const WHITE = '#FFFFFF';

const drawHeader = (ctx: any, title: string) => {
  ctx.fillStyle = WHITE;
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText(title, 70, 120, WIDTH - 140);
};

const drawFooterBranding = (ctx: any) => {
  ctx.font = 'bold 46px sans-serif';
  ctx.fillStyle = WHITE;
  ctx.fillText('More 2 Rivers', 70, HEIGHT - 70);
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

export const generateMarketImage = async (data: MarketImageData): Promise<Buffer> => {
  const { createCanvas } = await import('canvas');
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawHeader(ctx, 'Two Rivers Weekly Market Snapshot');

  ctx.font = '38px sans-serif';
  const stats = [
    `🏠 Active Homes: ${data.activeCount}`,
    `✅ Sold Last 30: ${data.soldLast30 ?? 'NEEDS REVIEW'}`,
    `💰 Median Price: ${formatCurrency(data.medianSoldPrice)}`,
    `⏱️ Avg DOM: ${data.avgDOM}`,
    `📉 Price Reductions: ${data.priceReductions}`
  ];

  stats.forEach((line, index) => {
    ctx.fillStyle = WHITE;
    ctx.fillText(line, 80, 260 + index * 120, WIDTH - 160);
  });

  drawFooterBranding(ctx);
  return canvas.toBuffer('image/png');
};

export const generateListingsImage = async (data: ListingsImageData): Promise<Buffer> => {
  const { createCanvas } = await import('canvas');
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawHeader(ctx, 'Two Rivers New Listings This Week');

  const topFive = data.listings.slice(0, 5);
  ctx.font = '32px sans-serif';
  topFive.forEach((listing, index) => {
    const baseY = 220 + index * 140;
    const beds = listing.beds ?? '-';
    const baths = listing.baths ?? '-';
    ctx.fillStyle = WHITE;
    ctx.fillText(`${index + 1}. ${listing.address}`, 80, baseY, WIDTH - 160);
    ctx.fillText(`${formatCurrency(listing.price)} | ${beds} bd | ${baths} ba`, 100, baseY + 45, WIDTH - 180);
  });

  const remaining = data.listings.length > 5 ? data.listings.length - 5 : 0;
  if (remaining > 0) {
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(`+ ${remaining} more new listings`, 80, 980);
  }

  drawFooterBranding(ctx);
  return canvas.toBuffer('image/png');
};
