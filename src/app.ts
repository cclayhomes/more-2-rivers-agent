import express from 'express';
import { createDailyDraft, approveDraft, rejectDraft } from './services/draftService';
import { fetchLatestMLSEmail } from './services/gmailService';
import {
  createListingsDraftFromEmail,
  createMarketDraftFromEmail
} from './services/draftService';
import { parseMarketSnapshotCsv, parseNewListingsCsv } from './services/mlsParserService';
import { prisma } from './services/db';
import { hashText } from './utils/hash';
import { generateMarketImage, generateListingsImage } from './services/imageService';

export const createApp = () => {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/test/trigger-draft', async (_req, res) => {
    try {
      const draft = await createDailyDraft();
      if (draft) {
        res.json({ success: true, draftId: draft.draftId, headline: draft.headline });
      } else {
        res.json({ success: false, message: 'No eligible candidates found' });
      }
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.get('/test/seed-draft', async (_req, res) => {
    try {
      const draftId = '1';
      const headline = 'Two Rivers Ranked Among Top Master-Planned Communities';
      const existing = await prisma.draft.findUnique({ where: { draftId } });
      if (existing) {
        return res.json({ success: true, draftId: existing.draftId, headline: existing.headline, status: existing.status, message: 'Already exists' });
      }
      const draft = await prisma.draft.create({
        data: {
          draftId,
          dateFound: new Date(),
          type: 'NEWS',
          headline,
          bullets: '\u2022 Two Rivers placed in top 50 nationally\n\u2022 Community continues rapid growth in Pasco County\n\u2022 New amenities and phases attracting buyers',
          localContext: 'This recognition highlights Two Rivers as a premier master-planned community in the Tampa Bay area.',
          sourceUrl: 'https://www.businessobserverfl.com/news/2026/jan/13/top-master-planned-communities/',
          sourceName: 'Business Observer',
          status: 'QUEUED',
          urlHash: hashText('test-seed-' + Date.now()),
          titleHash: hashText(headline + Date.now())
        }
      });
      const postedDraft = await approveDraft(draft.draftId);
      res.json({
        success: true,
        draftId: postedDraft.draftId,
        headline: postedDraft.headline,
        status: postedDraft.status,
        facebookPostId: postedDraft.facebookPostId
      });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.get('/test/approve/:id', async (req, res) => {
    try {
      const draft = await approveDraft(req.params.id);
      res.json({ success: true, draftId: draft.draftId, status: draft.status, facebookPostId: draft.facebookPostId });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.get('/test/reject/:id', async (req, res) => {
    try {
      const draft = await rejectDraft(req.params.id);
      res.json({ success: true, draftId: draft.draftId, status: draft.status });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.get('/test/ingest-latest-mls-email', async (_req, res) => {
    try {
      const email = await fetchLatestMLSEmail();

      if (email.emailType === 'MARKET') {
        const parsed = parseMarketSnapshotCsv(email.csvContent);
        const draft = await createMarketDraftFromEmail(parsed);
        return res.json({ success: true, emailType: email.emailType, draft });
      }

      const parsed = parseNewListingsCsv(email.csvContent);
      const draft = await createListingsDraftFromEmail(parsed);
      return res.json({
        success: true,
        emailType: email.emailType,
        draft,
        skipped: draft === null ? 'No new listings in CSV' : undefined
      });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Admin endpoint: return last 12 weeks of market history
  app.get('/admin/market-history', async (_req, res) => {
    try {
      const history = await prisma.marketHistory.findMany({
        where: { community: 'Two Rivers' },
        orderBy: { weekDate: 'desc' },
        take: 12
      });
      res.json({ success: true, community: 'Two Rivers', weeks: history.length, data: history });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

    // Preview endpoints for branded graphics
  app.get('/test/preview-market-image', async (_req, res) => {
    try {
      const sampleData = {
        activeCount: 142,
        soldLast30: 38,
        medianSoldPrice: 425000,
        avgDOM: 47,
        priceReductions: 23
      };
      const buffer = await generateMarketImage(sampleData);
      res.set('Content-Type', 'image/png');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.get('/test/preview-listings-image', async (_req, res) => {
    try {
      const sampleData = {
        listings: [
          { address: '1234 River Oak Dr, Titusville', price: 389000, beds: 3, baths: 2, sqft: 1850, status: 'Active' },
          { address: '5678 Palm Bay Rd NE', price: 475000, beds: 4, baths: 3, sqft: 2400, status: 'Active' },
          { address: '910 Crane Creek Blvd', price: 529900, beds: 4, baths: 2.5, sqft: 2750, status: 'Active' },
          { address: '2468 Merritt Island Cswy', price: 349000, beds: 3, baths: 2, sqft: 1650, status: 'Active' },
          { address: '1357 Cocoa Beach Ave', price: 615000, beds: 5, baths: 3, sqft: 3200, status: 'Active' },
          { address: '7890 Viera Blvd', price: 445000, beds: 3, baths: 2, sqft: 2100, status: 'Active' },
          { address: '3456 Satellite Beach Dr', price: 520000, beds: 4, baths: 3, sqft: 2600, status: 'Active' }
        ]
      };
      const buffer = await generateListingsImage(sampleData);
      res.set('Content-Type', 'image/png');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  return app;
};
