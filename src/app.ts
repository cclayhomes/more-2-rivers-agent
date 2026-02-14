import express from 'express';
import smsWebhook from './routes/smsWebhook';

export const createApp = () => {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/', smsWebhook);

  return app;
};
