import cron from 'node-cron';
import { createDailyDraft, createListingsDraftFromEmail } from '../services/draftService';
import { fetchLatestMLSEmail } from '../services/gmailService';
import { parseListingsFromHtml } from '../services/mlsParserService';

export const startJobs = () => {
  cron.schedule('0 8 * * *', async () => {
    await createDailyDraft();
  }, { timezone: 'America/New_York' });

  cron.schedule('0 9 * * 2', async () => {
    const email = await fetchLatestMLSEmail();
    const parsed = parseListingsFromHtml(email.htmlContent);
    await createListingsDraftFromEmail(parsed);
  }, { timezone: 'America/New_York' });
};
