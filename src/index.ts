import { createApp } from './app';
import { env } from './config/env';
import { startJobs } from './jobs/scheduler';
import { validateFacebookToken } from './services/facebookService';

const app = createApp();

const boot = async () => {
  const fbValid = await validateFacebookToken();
  if (!fbValid) {
    console.warn('Facebook token validation failed or skipped at startup.');
  }

  startJobs();

  app.listen(Number(env.PORT), () => {
    console.log(`Server listening on ${env.PORT}`);
  });
};

void boot();
