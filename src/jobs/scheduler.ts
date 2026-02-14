import cron from 'node-cron';
import { createDailyDraft, createWeeklyMarketDraft } from '../services/draftService';
import { PlaceholderMarketProvider } from '../market/provider';

export const startJobs = () => {
  cron.schedule('0 8 * * *', async () => {
    await createDailyDraft();
  }, { timezone: 'America/New_York' });

  cron.schedule('0 9 * * 2', async () => {
    const provider = new PlaceholderMarketProvider();
    await createWeeklyMarketDraft(provider);
  }, { timezone: 'America/New_York' });
};
