import { google } from 'googleapis';
import { env } from '../config/env';
import { classifyEmailType, isAllowedSender } from '../config/emailAllowlist';

export type IngestedEmailType = 'MARKET' | 'LISTINGS';

export interface LatestMLSEmail {
  id: string;
  subject: string;
  from: string;
  emailType: IngestedEmailType;
  csvContent: string;
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
  return Buffer.from(data, 'base64').toString('utf8');
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

const extractCsvAttachment = async (gmail: ReturnType<typeof google.gmail>, message: any): Promise<string> => {
  const payload = message.payload;
  const parts = collectParts(payload);

  const csvPart = parts.find(
    (part) =>
      part?.filename?.toLowerCase().endsWith('.csv') ||
      part?.mimeType === 'text/csv' ||
      part?.mimeType === 'application/vnd.ms-excel'
  );

  if (!csvPart) {
    throw new Error('CSV attachment not found');
  }

  if (csvPart.body?.data) {
    return decodePartBody(csvPart.body.data);
  }

  if (!csvPart.body?.attachmentId) {
    throw new Error('CSV attachment body missing');
  }

  const attachment = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId: message.id,
    id: csvPart.body.attachmentId
  });

  return decodePartBody(attachment.data.data || '');
};

export const fetchLatestMLSEmail = async (): Promise<LatestMLSEmail> => {
  const gmail = getGmailClient();
  const list = await gmail.users.messages.list({
    userId: 'me',
    q: 'in:inbox has:attachment filename:csv',
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

    const csvContent = await extractCsvAttachment(gmail, message.data);

    return {
      id: item.id,
      subject,
      from,
      emailType,
      csvContent
    };
  }

  throw new Error('No matching MLS email found in inbox');
};
