import express from 'express';
import smsWebhook from './routes/smsWebhook';
import { createDailyDraft } from './services/draftService';

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

  app.use('/', smsWebhook);

  return app;
};
