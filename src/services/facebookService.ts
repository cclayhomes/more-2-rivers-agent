import axios from 'axios';
import FormData from 'form-data';
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

export const publishToFacebook = async (
  message: string,
  link?: string
): Promise<{ id: string }> => {
  if (!env.FB_PAGE_ID || !env.FB_PAGE_ACCESS_TOKEN) {
    throw new Error('Facebook credentials missing');
  }

  let attempts = 0;
  let lastError: unknown;

  while (attempts < 3) {
    attempts += 1;
    try {
      const params: Record<string, string> = {
        message,
        access_token: env.FB_PAGE_ACCESS_TOKEN
      };
      // If link is provided, use Graph API link param for article preview
      if (link && link !== 'local-market-placeholder') {
        params.link = link;
      }
      const res = await graph.post(`/${env.FB_PAGE_ID}/feed`, null, { params });
      return { id: res.data.id };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempts * 600));
    }
  }
  throw lastError;
};

export const publishPhotoToFacebook = async (
  imageBuffer: Buffer,
  caption: string
): Promise<{ id: string }> => {
  if (!env.FB_PAGE_ID || !env.FB_PAGE_ACCESS_TOKEN) {
    throw new Error('Facebook credentials missing');
  }

  const form = new FormData();
  form.append('caption', caption);
  form.append('access_token', env.FB_PAGE_ACCESS_TOKEN);
  form.append('source', imageBuffer, {
    filename: 'more-2-rivers.png',
    contentType: 'image/png'
  });

  const res = await graph.post(`/${env.FB_PAGE_ID}/photos`, form, {
    headers: form.getHeaders()
  });

  return { id: res.data.id };
};
