import { google } from 'googleapis';
import { env } from '../config/env';
import { classifyEmailType, isAllowedSender } from '../config/emailAllowlist';

export type IngestedEmailType = 'MARKET' | 'LISTINGS';

export interface LatestMLSEmail {
  id: string;
  subject: string;
  from: string;
  emailType: IngestedEmailType;
  htmlContent: string;
}

const getGmailClient = () => {
  if (!env.GMAIL_CLIENT_ID || !env.GMAIL_CLIENT_SECRET || !env.GMAIL_REFRESH_TOKEN) {
    throw new Error('Gmail credentials missing');
  }

  const oauth2Client = new google.auth.OAuth2(env.GMAIL_CLIENT_ID, env.GMAIL_CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: 'v1', auth: oauth2Client });
};

const decodePartBody = (data?: string): string => {
  if (!data) {
    return '';
  }
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf8');
};

const collectParts = (payload: any): any[] => {
  const parts: any[] = [];
  const stack: any[] = [payload];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    parts.push(current);
    if (current.parts) {
      for (const nested of current.parts) {
        stack.push(nested);
      }
    }
  }

  return parts;
};

const extractHtmlBody = (message: any): string => {
  const payload = message.payload;
  const parts = collectParts(payload);

  const htmlPart = parts.find((part) => part?.mimeType === 'text/html' && part?.body?.data);
  if (htmlPart?.body?.data) {
    return decodePartBody(htmlPart.body.data);
  }

  const plainTextPart = parts.find((part) => part?.mimeType === 'text/plain' && part?.body?.data);
  if (plainTextPart?.body?.data) {
    return decodePartBody(plainTextPart.body.data);
  }

  if (payload?.body?.data) {
    return decodePartBody(payload.body.data);
  }

  throw new Error('HTML or plain text body not found in MLS email');
};

export const fetchLatestMLSEmail = async (): Promise<LatestMLSEmail> => {
  const gmail = getGmailClient();
  const list = await gmail.users.messages.list({
    userId: 'me',
    q: 'in:inbox from:stellarmatrix.com',
    maxResults: 10
  });

  const messageIds = list.data.messages || [];
  for (const item of messageIds) {
    if (!item.id) {
      continue;
    }

    const message = await gmail.users.messages.get({ userId: 'me', id: item.id, format: 'full' });
    const headers = message.data.payload?.headers || [];
    const subject = headers.find((header) => header.name?.toLowerCase() === 'subject')?.value || '';
    const from = headers.find((header) => header.name?.toLowerCase() === 'from')?.value || '';

    if (!isAllowedSender(from)) {
      continue;
    }

    const emailType = classifyEmailType(subject);
    if (!emailType) {
      continue;
    }

    const htmlContent = extractHtmlBody(message.data);

    return {
      id: item.id,
      subject,
      from,
      emailType,
      htmlContent
    };
  }

  throw new Error('No matching MLS email found in inbox');
};
