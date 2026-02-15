import { Draft } from '@prisma/client';
import { prisma } from './db';
import { hashText } from '../utils/hash';
import { createDraftFromCandidate, formatFacebookMessage } from './contentService';
import { fetchCandidates, loadDenylist } from './sourceService';
import { sendApprovalRequestSms } from './twilioService';
import { appendDraftToSheet } from './googleSheetsService';
import { publishToFacebook } from './facebookService';
import { MarketDataProvider } from '../market/provider';

export const createDailyDraft = async (): Promise<Draft | null> => {
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
    await sendApprovalRequestSms(draft.draftId, draft.headline);
    await appendDraftToSheet(draft);
    return draft;
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
    `\u2022 Active Homes: ${snapshot.activeHomes}`,
    `\u2022 Sold Last 30 Days: ${snapshot.soldLast30Days}`,
    `\u2022 Price Reductions: ${snapshot.priceReductions}`,
    `\u2022 Median Sold Price: ${snapshot.medianSoldPrice}`,
    `\u2022 Avg Days on Market: ${snapshot.avgDaysOnMarket}`
  ].join('\n');

  const draft = await prisma.draft.create({
    data: {
      draftId: `${Date.now()}`,
      dateFound: new Date(),
      type: 'MARKET',
      headline,
      bullets,
      localContext:
        'Inventory and pricing pace can shift week to week, so this snapshot is best used as a calm directional check-in.',
      sourceUrl: 'local-market-placeholder',
      sourceName: 'Market Module',
      status: 'QUEUED',
      urlHash: hashText(`${headline}-${Date.now()}`),
      titleHash: hashText(headline)
    }
  });
  await sendApprovalRequestSms(draft.draftId, draft.headline);
  await appendDraftToSheet(draft);
  return draft;
};

export const approveDraft = async (
  draftId: string,
  publisher: (message: string) => Promise<{ id: string }> = publishToFacebook
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
  const fbPost = await publisher(message);
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
