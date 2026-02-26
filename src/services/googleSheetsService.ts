import { Draft } from '@prisma/client';
import { google } from 'googleapis';
import { env } from '../config/env';

const getAuth = () => {
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_PRIVATE_KEY || !env.GOOGLE_SHEETS_ID) {
    return null;
  }

  let privateKey = env.GOOGLE_PRIVATE_KEY;

  try {
    const parsedKey = JSON.parse(env.GOOGLE_PRIVATE_KEY) as { private_key?: string };
    if (parsedKey.private_key) {
      privateKey = parsedKey.private_key;
    }
  } catch {
    // GOOGLE_PRIVATE_KEY is already a PEM string.
  }

  return new google.auth.JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
};

export const appendDraftToSheet = async (draft: Draft) => {
  const auth = getAuth();
  if (!auth || !env.GOOGLE_SHEETS_ID) {
    return;
  }

  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId: env.GOOGLE_SHEETS_ID,
    range: 'More2Rivers_Queue!A:J',
    valueInputOption: 'RAW',
    requestBody: {
      values: [
        [
          draft.draftId,
          draft.dateFound.toISOString(),
          draft.type,
          draft.headline,
          draft.bullets,
          draft.localContext,
          draft.sourceUrl,
          draft.sourceName,
          draft.status,
          draft.postedAt?.toISOString() || ''
        ]
      ]
    }
  });
};
