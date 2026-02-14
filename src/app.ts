import express from 'express';
import smsWebhook from './routes/smsWebhook';
import { createDailyDraft } from './services/draftService';
import { prisma } from './services/db';
import { hashText } from './utils/hash';
import { sendApprovalRequestSms } from './services/twilioService';

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
      await sendApprovalRequestSms(draft.draftId, draft.headline);
      res.json({ success: true, draftId: draft.draftId, headline: draft.headline, status: draft.status });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  app.use('/', smsWebhook);

  return app;
};
