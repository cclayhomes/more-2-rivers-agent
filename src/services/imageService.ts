// @ts-nocheck
import path from 'path';
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

export interface ListingsMarketSnapshotData {
  medianSoldPrice?: number | null;
  newListingsCount?: number | null;
  avgDOM?: number | null;
  priceReductions?: number | null;
}

export interface ListingsMarketUpdateImageData extends ListingsImageData {
  marketSnapshot?: ListingsMarketSnapshotData;
}

const WIDTH = 1080;
const HEIGHT = 1080;

// Brand base
const NAVY = '#0B2D5C';
const INK = '#071A33';
const WHITE = '#FFFFFF';

// Accents (pick 1–2 that match your brand vibe)
const TEAL = '#38E1D0';
const ORANGE = '#FFB347';
const LIGHT_GRAY = '#F4F4F4';

// Typography (registered font family names)
const FONT_DISPLAY = 'Inter';     // bold headings / big numbers
const FONT_BODY = 'Inter';        // labels / small text

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);

const safeNumber = (n: number | null | undefined, fallback = '—') =>
  n === null || n === undefined ? fallback : String(n);

function clampText(ctx: any, text: string, maxWidth: number) {
  // Simple ellipsis clamp
  if (ctx.measureText(text).width <= maxWidth) return text;
  const ellipsis = '…';
  let out = text;
  while (out.length > 1 && ctx.measureText(out + ellipsis).width > maxWidth) {
    out = out.slice(0, -1);
  }
  return out + ellipsis;
}

function getWeekOfLabel(d = new Date()): string {
  // Week-of = Monday of current week (US feed users still understand “Week of”)
  const date = new Date(d);
  const day = date.getDay(); // 0 Sun ... 6 Sat
  const diffToMonday = (day + 6) % 7; // 0 if Monday
  date.setDate(date.getDate() - diffToMonday);
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `Week of ${fmt.format(date)}`;
}

function withShadow(ctx: any, shadowColor: string, blur: number, offsetY: number, fn: () => void) {
  ctx.save();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = offsetY;
  fn();
  ctx.restore();
}

function roundedRectPath(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawNoise(ctx: any, alpha = 0.06) {
  // Lightweight noise: tiny dots
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = WHITE;
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * WIDTH;
    const y = Math.random() * HEIGHT;
    const s = Math.random() < 0.85 ? 1 : 2;
    ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}

function drawBackground(ctx: any) {
  // Base gradient
  const g = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  g.addColorStop(0, '#061B3A');
  g.addColorStop(0.5, NAVY);
  g.addColorStop(1, '#04224A');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Radial “blobs” for depth
  const blob1 = ctx.createRadialGradient(180, 220, 40, 200, 240, 520);
  blob1.addColorStop(0, 'rgba(56,225,208,0.38)');
  blob1.addColorStop(1, 'rgba(56,225,208,0)');
  ctx.fillStyle = blob1;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const blob2 = ctx.createRadialGradient(920, 160, 40, 900, 160, 520);
  blob2.addColorStop(0, 'rgba(255,179,71,0.30)');
  blob2.addColorStop(1, 'rgba(255,179,71,0)');
  ctx.fillStyle = blob2;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const blob3 = ctx.createRadialGradient(900, 940, 40, 860, 920, 600);
  blob3.addColorStop(0, 'rgba(255,255,255,0.10)');
  blob3.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = blob3;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawNoise(ctx, 0.05);
}

function drawGlassPanel(ctx: any, x: number, y: number, w: number, h: number, r = 30) {
  // Shadow for lift
  withShadow(ctx, 'rgba(0,0,0,0.35)', 26, 14, () => {
    ctx.save();
    roundedRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fill();
    ctx.restore();
  });

  // Thin highlight stroke
  ctx.save();
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Subtle top sheen
  ctx.save();
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.clip();
  const sheen = ctx.createLinearGradient(x, y, x, y + h * 0.5);
  sheen.addColorStop(0, 'rgba(255,255,255,0.10)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h * 0.55);
  ctx.restore();
}

function drawPill(ctx: any, x: number, y: number, text: string, bg: string, fg: string) {
  ctx.save();
  ctx.font = `600 22px ${FONT_BODY}, sans-serif`;
  const padX = 18;
  const padY = 10;
  const textW = ctx.measureText(text).width;
  const w = textW + padX * 2;
  const h = 22 + padY * 2;
  roundedRectPath(ctx, x, y, w, h, 999);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + h / 2 + 1);
  ctx.restore();
}

/** Simple stroke icons (consistent across platforms) */
function iconStyle(ctx: any, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function drawHouseIcon(ctx: any, x: number, y: number, size: number, color: string) {
  ctx.save();
  iconStyle(ctx, color);
  const s = size;
  // roof
  ctx.beginPath();
  ctx.moveTo(x + s * 0.1, y + s * 0.45);
  ctx.lineTo(x + s * 0.5, y + s * 0.12);
  ctx.lineTo(x + s * 0.9, y + s * 0.45);
  ctx.stroke();
  // body
  ctx.beginPath();
  ctx.rect(x + s * 0.22, y + s * 0.45, s * 0.56, s * 0.43);
  ctx.stroke();
  // door
  ctx.beginPath();
  ctx.moveTo(x + s * 0.5, y + s * 0.88);
  ctx.lineTo(x + s * 0.5, y + s * 0.63);
  ctx.stroke();
  ctx.restore();
}

function drawTagIcon(ctx: any, x: number, y: number, size: number, color: string) {
  ctx.save();
  iconStyle(ctx, color);
  const s = size;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.12, y + s * 0.40);
  ctx.lineTo(x + s * 0.52, y + s * 0.10);
  ctx.lineTo(x + s * 0.90, y + s * 0.48);
  ctx.lineTo(x + s * 0.50, y + s * 0.88);
  ctx.closePath();
  ctx.stroke();
  // hole
  ctx.beginPath();
  ctx.arc(x + s * 0.55, y + s * 0.27, s * 0.06, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawClockIcon(ctx: any, x: number, y: number, size: number, color: string) {
  ctx.save();
  iconStyle(ctx, color);
  const s = size;
  ctx.beginPath();
  ctx.arc(x + s * 0.5, y + s * 0.5, s * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + s * 0.5, y + s * 0.5);
  ctx.lineTo(x + s * 0.5, y + s * 0.28);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + s * 0.5, y + s * 0.5);
  ctx.lineTo(x + s * 0.68, y + s * 0.58);
  ctx.stroke();
  ctx.restore();
}

function drawArrowDownIcon(ctx: any, x: number, y: number, size: number, color: string) {
  ctx.save();
  iconStyle(ctx, color);
  const s = size;
  ctx.beginPath();
  ctx.moveTo(x + s * 0.5, y + s * 0.12);
  ctx.lineTo(x + s * 0.5, y + s * 0.78);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + s * 0.25, y + s * 0.56);
  ctx.lineTo(x + s * 0.5, y + s * 0.82);
  ctx.lineTo(x + s * 0.75, y + s * 0.56);
  ctx.stroke();
  ctx.restore();
}

function drawBrandFooter(ctx: any) {
  const barX = 70;
  const barY = HEIGHT - 135;
  const barW = WIDTH - 140;
  const barH = 80;

  // Footer bar
  withShadow(ctx, 'rgba(0,0,0,0.35)', 18, 10, () => {
    ctx.save();
    roundedRectPath(ctx, barX, barY, barW, barH, 22);
    ctx.fillStyle = 'rgba(7,26,51,0.55)'; // deep ink w/ transparency
    ctx.fill();
    ctx.restore();
  });

  // Accent line
  ctx.save();
  roundedRectPath(ctx, barX, barY, barW, barH, 22);
  ctx.clip();
  const accent = ctx.createLinearGradient(barX, barY, barX + barW, barY);
  accent.addColorStop(0, 'rgba(56,225,208,0.85)');
  accent.addColorStop(1, 'rgba(255,179,71,0.85)');
  ctx.fillStyle = accent;
  ctx.fillRect(barX, barY, barW, 6);
  ctx.restore();

  // Icon mark
  drawHouseIcon(ctx, barX + 20, barY + 16, 48, TEAL);

  // Brand text
  ctx.save();
  ctx.fillStyle = WHITE;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 34px ${FONT_DISPLAY}, sans-serif`;
  ctx.fillText('More 2 Rivers', barX + 84, barY + 50);

  ctx.font = `500 20px ${FONT_BODY}, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.80)';
  ctx.fillText('Two Rivers • Florida', barX + 84, barY + 72);
  ctx.restore();
}

function drawHeader(ctx: any, title: string, subtitle: string) {
  ctx.save();

  // Title
  ctx.fillStyle = WHITE;
  ctx.font = `900 54px ${FONT_DISPLAY}, sans-serif`;
  ctx.fillText(title, 70, 115);

  // Subtitle
  ctx.font = `500 24px ${FONT_BODY}, sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.fillText(subtitle, 70, 150);

  // Date pill (freshness)
  drawPill(ctx, WIDTH - 360, 78, getWeekOfLabel(), 'rgba(255,255,255,0.14)', WHITE);

  ctx.restore();
}

function drawStatCard(
  ctx: any,
  x: number,
  y: number,
  w: number,
  h: number,
  icon: (ctx: any, x: number, y: number, size: number, color: string) => void,
  iconColor: string,
  label: string,
  value: string,
  valueColor = WHITE
) {
  drawGlassPanel(ctx, x, y, w, h, 26);

  // Icon
  icon(ctx, x + 22, y + 20, 52, iconColor);

  // Label
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = `600 22px ${FONT_BODY}, sans-serif`;
  ctx.fillText(label, x + 86, y + 44);

  // Value
  ctx.fillStyle = valueColor;
  ctx.font = `900 60px ${FONT_DISPLAY}, sans-serif`;
  ctx.fillText(value, x + 32, y + 120);
  ctx.restore();
}

async function registerBrandFonts() {
  // Optional: drop Inter font files into: ./assets/fonts/
  // Example files:
  // - Inter-Regular.ttf
  // - Inter-SemiBold.ttf
  // - Inter-ExtraBold.ttf
  //
  // If these files don’t exist in your deployment, it will just fall back to system fonts.
  try {
    const { registerFont } = await import('canvas');
    const base = path.resolve(process.cwd(), 'assets', 'fonts');

    registerFont(path.join(base, 'Inter-Regular.ttf'), { family: 'Inter', weight: '400' });
    registerFont(path.join(base, 'Inter-SemiBold.ttf'), { family: 'Inter', weight: '600' });
    registerFont(path.join(base, 'Inter-ExtraBold.ttf'), { family: 'Inter', weight: '800' });
    // You can add more weights if you have them.
  } catch {
    // no-op: safe fallback to system fonts
  }
}

export const generateMarketImage = async (data: MarketImageData): Promise<Buffer> => {
  await registerBrandFonts();
  const { createCanvas } = await import('canvas');

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx: any = canvas.getContext('2d');

  // Background
  drawBackground(ctx);

  // Header
  drawHeader(ctx, 'Two Rivers', 'Weekly Market Snapshot');

  // Main glass panel container
  const panelX = 70;
  const panelY = 190;
  const panelW = WIDTH - 140;
  const panelH = 720;
  drawGlassPanel(ctx, panelX, panelY, panelW, panelH, 34);

  // Section divider line
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(panelX + 30, panelY + 96);
  ctx.lineTo(panelX + panelW - 30, panelY + 96);
  ctx.stroke();
  ctx.restore();

  // Panel title row
  ctx.save();
  ctx.fillStyle = WHITE;
  ctx.font = `800 30px ${FONT_DISPLAY}, sans-serif`;
  ctx.fillText('Key Stats', panelX + 30, panelY + 62);

  drawPill(ctx, panelX + panelW - 280, panelY + 32, 'Updated weekly', 'rgba(56,225,208,0.16)', WHITE);
  ctx.restore();

  // Stat cards layout
  const gap = 22;
  const cardW = (panelW - 30 * 2 - gap) / 2;
  const cardH = 170;

  const c1x = panelX + 30;
  const c2x = panelX + 30 + cardW + gap;
  const r1y = panelY + 120;
  const r2y = r1y + cardH + gap;

  drawStatCard(
    ctx,
    c1x,
    r1y,
    cardW,
    cardH,
    drawHouseIcon,
    TEAL,
    'Active Homes',
    safeNumber(data.activeCount)
  );

  drawStatCard(
    ctx,
    c2x,
    r1y,
    cardW,
    cardH,
    drawTagIcon,
    ORANGE,
    'Median Price',
    formatCurrency(data.medianSoldPrice)
  );

  // Sold last 30 (handle “needs review” gracefully)
  const soldValue =
    data.soldLast30 === null ? 'Review' : safeNumber(data.soldLast30);

  drawStatCard(
    ctx,
    c1x,
    r2y,
    cardW,
    cardH,
    drawArrowDownIcon,
    'rgba(255,255,255,0.85)',
    'Sold (Last 30)',
    soldValue,
    data.soldLast30 === null ? ORANGE : WHITE
  );

  drawStatCard(
    ctx,
    c2x,
    r2y,
    cardW,
    cardH,
    drawClockIcon,
    TEAL,
    'Avg Days on Market',
    safeNumber(data.avgDOM)
  );

  // Wide bottom card for reductions
  const wideY = r2y + cardH + gap;
  const wideH = 170;

  drawGlassPanel(ctx, c1x, wideY, panelW - 60, wideH, 26);

  // Wide card content
  ctx.save();
  drawTagIcon(ctx, c1x + 22, wideY + 20, 52, ORANGE);

  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  ctx.font = `600 22px ${FONT_BODY}, sans-serif`;
  ctx.fillText('Price Reductions (7 days)', c1x + 86, wideY + 44);

  ctx.fillStyle = WHITE;
  ctx.font = `900 70px ${FONT_DISPLAY}, sans-serif`;
  ctx.fillText(safeNumber(data.priceReductions), c1x + 32, wideY + 128);

  // Subnote
  ctx.fillStyle = 'rgba(255,255,255,0.70)';
  ctx.font = `500 20px ${FONT_BODY}, sans-serif`;
  ctx.fillText('More reductions can signal negotiating leverage.', c1x + 210, wideY + 128);
  ctx.restore();

  // Footer branding
  drawBrandFooter(ctx);

  return canvas.toBuffer('image/png');
};

function drawChip(ctx: any, x: number, y: number, text: string, accent: string) {
  ctx.save();
  ctx.font = `700 20px ${FONT_BODY}, sans-serif`;
  const padX = 14;
  const padY = 8;
  const w = ctx.measureText(text).width + padX * 2;
  const h = 20 + padY * 2;

  roundedRectPath(ctx, x, y, w, h, 999);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();

  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.fillStyle = WHITE;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + h / 2 + 1);
  ctx.restore();

  return w;
}

export const generateListingsImage = async (data: ListingsMarketUpdateImageData): Promise<Buffer> => {
  await registerBrandFonts();
  const { createCanvas } = await import('canvas');

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx: any = canvas.getContext('2d');

  const listings = data.listings || [];
  const featuredListing =
    listings.reduce<ListingItem | null>((top, listing) => {
      if (!top || listing.price > top.price) {
        return listing;
      }
      return top;
    }, null) || {
      address: 'No featured listing available',
      price: 0,
      beds: null,
      baths: null,
      sqft: null,
      status: 'Active'
    };

  const statValues = {
    medianSoldPrice: data.marketSnapshot?.medianSoldPrice ?? 0,
    newListingsCount: data.marketSnapshot?.newListingsCount ?? listings.length,
    avgDOM: data.marketSnapshot?.avgDOM ?? 0,
    priceReductions: data.marketSnapshot?.priceReductions ?? 0
  };

  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Header
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, WIDTH, 120);
  ctx.fillStyle = TEAL;
  ctx.fillRect(0, 115, WIDTH, 5);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = WHITE;
  ctx.font = `800 64px ${FONT_DISPLAY}, sans-serif`;
  ctx.fillText('2 RIVERS MARKET UPDATE', WIDTH / 2, 72);
  ctx.fillStyle = TEAL;
  ctx.font = `600 29px ${FONT_BODY}, sans-serif`;
  ctx.fillText(getWeekOfLabel(), WIDTH / 2, 104);
  ctx.restore();

  const stats = [
    { label: 'MEDIAN SOLD', value: formatCurrency(statValues.medianSoldPrice), x: 270, y: 280 },
    { label: 'NEW LISTINGS', value: safeNumber(statValues.newListingsCount, '0'), x: 810, y: 280 },
    { label: 'AVG. DAYS ON MARKET', value: safeNumber(statValues.avgDOM, '0'), x: 270, y: 520 },
    { label: 'PRICE REDUCTIONS', value: safeNumber(statValues.priceReductions, '0'), x: 810, y: 520 }
  ];

  stats.forEach((stat) => {
    const lineX = stat.x - 170;
    ctx.fillStyle = TEAL;
    ctx.fillRect(lineX, stat.y - 58, 4, 116);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = ORANGE;
    ctx.font = `700 36px ${FONT_BODY}, sans-serif`;
    ctx.fillText(stat.label, stat.x, stat.y - 56);
    ctx.fillStyle = NAVY;
    ctx.font = `800 96px ${FONT_DISPLAY}, sans-serif`;
    ctx.fillText(stat.value, stat.x, stat.y + 40);
    ctx.restore();
  });

  // Featured listing box
  const featuredY = 680;
  const featuredH = 180;
  const featuredX = 60;
  const featuredW = WIDTH - 120;
  ctx.save();
  roundedRectPath(ctx, featuredX, featuredY, featuredW, featuredH, 22);
  ctx.fillStyle = LIGHT_GRAY;
  ctx.fill();

  ctx.fillStyle = NAVY;
  ctx.font = `800 35px ${FONT_DISPLAY}, sans-serif`;
  ctx.fillText('Hottest Listing This Week', featuredX + 40, featuredY + 54);

  ctx.font = `800 41px ${FONT_DISPLAY}, sans-serif`;
  const featuredAddress = clampText(ctx, featuredListing.address || 'Address unavailable', featuredW - 80);
  ctx.fillText(featuredAddress, featuredX + 40, featuredY + 102);

  const details = `${featuredListing.beds ?? '—'} Bed | ${featuredListing.baths ?? '—'} Bath | ${featuredListing.sqft ? featuredListing.sqft.toLocaleString('en-US') : '—'} SqFt - ${formatCurrency(featuredListing.price)}`;
  ctx.font = `500 32px ${FONT_BODY}, sans-serif`;
  ctx.fillText(clampText(ctx, details, featuredW - 80), featuredX + 40, featuredY + 146);
  ctx.restore();

  // Footer
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 920, WIDTH, HEIGHT - 920);
  ctx.fillStyle = TEAL;
  ctx.fillRect(0, 920, WIDTH, 5);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = WHITE;
  ctx.font = `800 36px ${FONT_DISPLAY}, sans-serif`;
  ctx.fillText('MORE FLORIDA HOMES', WIDTH / 2, 970);

  ctx.fillStyle = TEAL;
  ctx.font = `600 26px ${FONT_BODY}, sans-serif`;
  ctx.fillText('863-225-0060 | team@morefla.com', WIDTH / 2, 1020);
  ctx.restore();

  return canvas.toBuffer('image/png');
};
