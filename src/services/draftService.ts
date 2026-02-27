import { Draft } from '@prisma/client';
import { prisma } from './db';
import { hashText } from '../utils/hash';
import { createDraftFromCandidate, formatFacebookMessage } from './contentService';
import { fetchCandidates, loadDenylist } from './sourceService';
import { appendDraftToSheet } from './googleSheetsService';
import { publishPhotoToFacebook, publishToFacebook } from './facebookService';
import { MarketDataProvider } from '../market/provider';
import { ParsedListingsCSV, ParsedMarketCSV } from './mlsParserService';
import { generateListingsImage, generateMarketImage } from './imageService';
import { fetchRedfinMarketData } from './redfinService';

const formatListingsMarketUpdatePost = (
  listings: ParsedListingsCSV['newListings'],
  marketSnapshot: { medianSoldPrice: number; newListingsCount: number; avgDOM: number; priceReductions: number }
): string => {
  const featured =
    listings.reduce((top, listing) => {
      if (!top || listing.price > top.price) {
        return listing;
      }
      return top;
    }, listings[0] ?? null) ?? {
      address: 'No featured listing available',
      price: 0,
      beds: null,
      baths: null,
      sqft: null,
      status: 'Active'
    };

  const featuredLine = `${featured.address} - $${featured.price.toLocaleString('en-US')} | ${featured.beds ?? '—'}bd/${featured.baths ?? '—'}ba | ${featured.sqft ? featured.sqft.toLocaleString('en-US') : '—'} sqft`;

  return [
    'Two Rivers Weekly Market Update',
    '',
    `New Listings: ${marketSnapshot.newListingsCount}`,
    `Median Sold Price: $${marketSnapshot.medianSoldPrice.toLocaleString('en-US')}`,
    `Avg Days on Market: ${marketSnapshot.avgDOM}`,
    `Price Reductions: ${marketSnapshot.priceReductions}`,
    '',
    `Hottest Listing: ${featuredLine}`,
    '',
    'Interested in Two Rivers? Contact us!',
    'team@morefla.com | 863-225-0060'
  ].join('\n');
};

export const createDailyDraft = async (): Promise<Draft | null> => {
  // Daily cap: max 1 queued draft per day
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const todayCount = await prisma.draft.count({
    where: {
      dateFound: { gte: todayStart, lte: todayEnd },
      type: { not: 'MARKET' }
    }
  });
  if (todayCount >= 1) {
    return null;
  }

  const [candidates, denylist] = await Promise.all([fetchCandidates(), loadDenylist()]);
  const { isRelevant } = await import('./contentService');

  for (const candidate of candidates) {
    if (!isRelevant(candidate, denylist)) {
      continue;
    }

    const urlHash = hashText(candidate.url);
    const titleHash = hashText(candidate.title);
    const exists = await prisma.draft.findFirst({ where: { urlHash, titleHash } });
    if (exists) {
      continue;
    }

    const generated = createDraftFromCandidate(candidate);
    const draft = await prisma.draft.create({
      data: {
        draftId: `${Date.now()}`,
        dateFound: candidate.publishedDate || new Date(),
        type: generated.type,
        headline: generated.headline,
        bullets: generated.bullets.join('\n'),
        localContext: generated.localContext,
        sourceUrl: candidate.url,
        sourceName: candidate.sourceName,
        status: 'QUEUED',
        urlHash,
        titleHash
      }
    });

    await approveDraft(draft.draftId);
    await appendDraftToSheet(draft);
    return prisma.draft.findUniqueOrThrow({ where: { draftId: draft.draftId } });
  }

  return null;
};

export const createWeeklyMarketDraft = async (provider: MarketDataProvider): Promise<Draft> => {
  const snapshot = await provider.getSnapshot();

  // Parse numeric values for historical storage
  const activeCount = parseInt(snapshot.activeHomes, 10) || 0;
  const pendingCount = 0; // Will be populated when MLS data is wired
  const soldLast30 = parseInt(snapshot.soldLast30Days, 10) || 0;
  const medianSold = parseInt(snapshot.medianSoldPrice.replace(/[^0-9]/g, ''), 10) || 0;
  const avgDom = parseInt(snapshot.avgDaysOnMarket, 10) || 0;

  // Store in MarketHistory (upsert to prevent duplicates)
  const today = new Date();
  const weekDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  await prisma.marketHistory.upsert({
    where: {
      community_weekDate: {
        community: 'Two Rivers',
        weekDate
      }
    },
    update: {
      activeCount,
      pendingCount,
      soldLast30,
      medianSold,
      avgDom
    },
    create: {
      community: 'Two Rivers',
      weekDate,
      activeCount,
      pendingCount,
      soldLast30,
      medianSold,
      avgDom
    }
  });

  const headline = 'Two Rivers Weekly Market Snapshot';
  const bullets = [
        `🏠 Active Homes: ${snapshot.activeHomes}`,
        `✅ Sold Last 30 Days: ${snapshot.soldLast30Days}`,
        `💰 Median Sold Price: ${snapshot.medianSoldPrice}`,
        `📉 Price Reductions: ${snapshot.priceReductions}`,
        `⏱️ Avg Days on Market: ${snapshot.avgDaysOnMarket}`
  ].join('\n');

  const draft = await prisma.draft.create({
    data: {
      draftId: `${Date.now()}`,
      dateFound: new Date(),
      type: 'MARKET',
      headline,
      bullets,
      localContext: '',
      sourceUrl: 'local-market-placeholder',
      sourceName: 'Market Module',
      status: 'QUEUED',
      urlHash: hashText(`${headline}-${Date.now()}`),
      titleHash: hashText(headline)
    }
  });

  await approveDraft(draft.draftId);
  await appendDraftToSheet(draft);
  return prisma.draft.findUniqueOrThrow({ where: { draftId: draft.draftId } });
};

export const approveDraft = async (
  draftId: string,
  publisher: (message: string, link?: string) => Promise<{ id: string }> = publishToFacebook
): Promise<Draft> => {
  const draft = await prisma.draft.findUnique({ where: { draftId } });
  if (!draft) {
    throw new Error('Draft not found');
  }
  if (draft.status === 'POSTED') {
    return draft;
  }

  const approved = await prisma.draft.update({ where: { draftId }, data: { status: 'APPROVED' } });
  const message = formatFacebookMessage(approved);
  const parsedImageData = approved.imageData ? JSON.parse(approved.imageData) : null;

  const fbPost =
    approved.type === 'MARKET' && parsedImageData
      ? await publishPhotoToFacebook(
          await generateMarketImage({
            activeCount: parsedImageData.activeCount,
            soldLast30: parsedImageData.soldLast30,
            medianSoldPrice: parsedImageData.medianSoldPrice,
            avgDOM: parsedImageData.avgDOM,
            priceReductions: parsedImageData.priceReductions
          }),
          message
        )
      : approved.type === 'LISTINGS' && parsedImageData
        ? await publishPhotoToFacebook(
            await generateListingsImage({
            listings: parsedImageData.listings || [],
            marketSnapshot: {
              medianSoldPrice: parsedImageData.medianSoldPrice,
              newListingsCount: parsedImageData.newListingsCount,
              avgDOM: parsedImageData.avgDOM,
              priceReductions: parsedImageData.priceReductions
            }
          }),
            message
          )
        : await publisher(message, approved.sourceUrl);

  return prisma.draft.update({
    where: { draftId },
    data: {
      status: 'POSTED',
      postedAt: new Date(),
      facebookPostId: fbPost.id
    }
  });
};

export const rejectDraft = async (draftId: string): Promise<Draft> => {
  return prisma.draft.update({
    where: { draftId },
    data: { status: 'REJECTED' }
  });
};

export const createMarketDraftFromEmail = async (csvData: ParsedMarketCSV): Promise<Draft> => {
  const weekDate = new Date();
  weekDate.setHours(0, 0, 0, 0);

  await prisma.marketHistory.upsert({
    where: {
      community_weekDate: {
        community: 'Two Rivers',
        weekDate
      }
    },
    update: {
      activeCount: csvData.activeCount,
      pendingCount: csvData.pendingCount,
      soldLast30: csvData.soldLast30 ?? 0,
      medianSold: csvData.medianSoldPrice,
      avgDom: csvData.avgDOM
    },
    create: {
      community: 'Two Rivers',
      weekDate,
      activeCount: csvData.activeCount,
      pendingCount: csvData.pendingCount,
      soldLast30: csvData.soldLast30 ?? 0,
      medianSold: csvData.medianSoldPrice,
      avgDom: csvData.avgDOM
    }
  });

  await generateMarketImage({
    activeCount: csvData.activeCount,
    soldLast30: csvData.soldLast30,
    medianSoldPrice: csvData.medianSoldPrice,
    avgDOM: csvData.avgDOM,
    priceReductions: csvData.priceReductions
  });

  const draft = await prisma.draft.create({
    data: {
      draftId: `${Date.now()}`,
      dateFound: new Date(),
      type: 'MARKET',
      headline: 'Two Rivers Weekly Market Snapshot',
      bullets: [
        `🏠 Active Homes: ${csvData.activeCount}`,
        `✅ Sold Last 30 Days: ${csvData.soldLast30 ?? 'NEEDS REVIEW'}`,
        `💰 Median Sold Price: $${csvData.medianSoldPrice.toLocaleString('en-US')}`,
        `⏱️ Avg Days on Market: ${csvData.avgDOM}`,
        `📉 Price Reductions: ${csvData.priceReductions}`
      ].join('\n'),
      localContext: '',
      sourceUrl: 'local-market-placeholder',
      sourceName: 'MLS Email',
      status: 'QUEUED',
      urlHash: hashText(`market-email-${Date.now()}`),
      titleHash: hashText(`market-email-title-${Date.now()}`),
      imageData: JSON.stringify(csvData)
    }
  });

  await approveDraft(draft.draftId);
  try {
    await appendDraftToSheet(draft);
  } catch (error) {
    console.error('Failed to append market draft to Google Sheets', error);
  }
  return prisma.draft.findUniqueOrThrow({ where: { draftId: draft.draftId } });
};

export const createListingsDraftFromEmail = async (
  csvData: ParsedListingsCSV
): Promise<Draft | null> => {
  if (csvData.newListingsCount === 0) {
    return null;
  }

  const redfinData = await fetchRedfinMarketData();

  if (redfinData) {
    const weekDate = new Date();
    weekDate.setHours(0, 0, 0, 0);

    await prisma.marketHistory.upsert({
      where: {
        community_weekDate: {
          community: 'Two Rivers',
          weekDate
        }
      },
      update: {
        soldLast30: redfinData.homesSoldCount,
        medianSold: redfinData.medianSoldPrice,
        avgDom: redfinData.avgDOM,
        newListingsCount: csvData.newListingsCount
      },
      create: {
        community: 'Two Rivers',
        weekDate,
        activeCount: 0,
        pendingCount: 0,
        soldLast30: redfinData.homesSoldCount,
        medianSold: redfinData.medianSoldPrice,
        avgDom: redfinData.avgDOM,
        newListingsCount: csvData.newListingsCount
      }
    });
  }

  const latestMarketHistory = !redfinData
    ? await prisma.marketHistory.findFirst({
        where: { community: 'Two Rivers' },
        orderBy: { weekDate: 'desc' }
      })
    : null;

  const marketSnapshot = {
    medianSoldPrice: redfinData?.medianSoldPrice ?? latestMarketHistory?.medianSold ?? 0,
    newListingsCount: csvData.newListingsCount,
    avgDOM: redfinData?.avgDOM ?? latestMarketHistory?.avgDom ?? 0,
    priceReductions: redfinData?.priceReductions ?? 0
  };

  await generateListingsImage({
    listings: csvData.newListings,
    marketSnapshot
  });

  const postSummary = formatListingsMarketUpdatePost(csvData.newListings, marketSnapshot);

  const draft = await prisma.draft.create({
    data: {
      draftId: `${Date.now()}`,
      dateFound: new Date(),
      type: 'LISTINGS',
      headline: 'Two Rivers New Listings This Week',
      bullets: postSummary,
      localContext: '',
      sourceUrl: 'local-listings-placeholder',
      sourceName: 'MLS Email',
      status: 'QUEUED',
      urlHash: hashText(`listings-email-${Date.now()}`),
      titleHash: hashText(`listings-email-title-${Date.now()}`),
      imageData: JSON.stringify({ listings: csvData.newListings, ...marketSnapshot })
    }
  });

  await approveDraft(draft.draftId);
  try {
    await appendDraftToSheet(draft);
  } catch (error) {
    console.error('Failed to append listings draft to Google Sheets', error);
  }
  return prisma.draft.findUniqueOrThrow({ where: { draftId: draft.draftId } });
};
