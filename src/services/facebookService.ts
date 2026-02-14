import axios from 'axios';
import { env } from '../config/env';

const graph = axios.create({ baseURL: 'https://graph.facebook.com/v20.0', timeout: 15000 });

export const validateFacebookToken = async () => {
  if (!env.FB_PAGE_ACCESS_TOKEN) {
    return false;
  }
  try {
    await graph.get('/me', { params: { access_token: env.FB_PAGE_ACCESS_TOKEN } });
    return true;
  } catch {
    return false;
  }
};

export const publishToFacebook = async (message: string): Promise<{ id: string }> => {
  if (!env.FB_PAGE_ID || !env.FB_PAGE_ACCESS_TOKEN) {
    throw new Error('Facebook credentials missing');
  }

  let attempts = 0;
  let lastError: unknown;

  while (attempts < 3) {
    attempts += 1;
    try {
      const res = await graph.post(`/${env.FB_PAGE_ID}/feed`, null, {
        params: {
          message,
          access_token: env.FB_PAGE_ACCESS_TOKEN
        }
      });
      return { id: res.data.id };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempts * 600));
    }
  }

  throw lastError;
};
