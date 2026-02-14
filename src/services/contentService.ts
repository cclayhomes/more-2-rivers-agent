import { DraftType } from '@prisma/client';
import { CandidateItem, DraftContent } from '../types';

const PRIMARY = ['two rivers', 'zephyrhills', 'sr-56', 'pasco county'];
const TYPE_MAP: Array<{ keywords: string[]; type: DraftType }> = [
  { keywords: ['school', 'student', 'district'], type: 'SCHOOL' },
  { keywords: ['road', 'traffic', 'fdot', 'infrastructure', 'bridge', 'sr-56', 'i-75'], type: 'INFRA' },
  { keywords: ['event', 'festival', 'community', 'meeting'], type: 'EVENT' },
  { keywords: ['housing', 'market', 'home', 'real estate'], type: 'MARKET' },
  { keywords: ['development', 'builder', 'construction'], type: 'DEV' }
];

export const isRelevant = (candidate: CandidateItem, denylist: string[]): boolean => {
  const text = `${candidate.title} ${candidate.textForMatch}`.toLowerCase();
  const hasPrimary = PRIMARY.some((k) => text.includes(k));
  if (!hasPrimary) {
    return false;
  }

  const denied = denylist.some((word) => text.includes(word.toLowerCase()));
  return !denied;
};

export const classifyType = (candidate: CandidateItem): DraftType => {
  const text = `${candidate.title} ${candidate.snippet || ''}`.toLowerCase();
  const found = TYPE_MAP.find((entry) => entry.keywords.some((k) => text.includes(k)));
  return found?.type ?? 'NEWS';
};

export const createDraftFromCandidate = (candidate: CandidateItem): DraftContent => {
  const type = classifyType(candidate);
  const headline = candidate.title.trim();
  const snippet = candidate.snippet?.trim() || 'New update relevant to Two Rivers and Zephyrhills residents.';

  const bullets = [
    `• ${snippet.substring(0, 140)}`,
    `• Coverage is tied to ${candidate.sourceName} and local area updates.`,
    `• This may affect planning for residents near Two Rivers.`
  ];

  return {
    type,
    headline,
    bullets,
    localContext:
      'This update appears relevant for neighbors tracking growth and day-to-day changes around the Two Rivers area.',
  };
};

export const formatFacebookMessage = (draft: {
  headline: string;
  bullets: string;
  localContext: string;
  sourceUrl: string;
}) => {
  return `${draft.headline}\n${draft.bullets}\n${draft.localContext}\nSource: ${draft.sourceUrl}`;
};
