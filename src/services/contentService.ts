import { CandidateItem, DraftContent, DraftType } from '../types';

// V1 scope: broader Two Rivers + surrounding Pasco/Wesley Chapel coverage area.
const PRIMARY = ['two rivers', 'wesley chapel', 'pasco county', 'zephyrhills', 'sr-56', 'sr 56', 'epperson', 'bexley', 'asturia', 'connerton', 'shady hills', 'land o lakes', 'wiregrass'];

const TYPE_MAP: Array<{ keywords: string[]; type: DraftType }> = [
  { keywords: ['school', 'student', 'district'], type: 'SCHOOL' },
  { keywords: ['road', 'traffic', 'fdot', 'infrastructure', 'bridge', 'sr-56', 'i-75'], type: 'INFRA' },
  { keywords: ['event', 'festival', 'community', 'meeting'], type: 'EVENT' },
  { keywords: ['housing', 'market', 'home', 'real estate'], type: 'MARKET' },
  { keywords: ['development', 'builder', 'construction'], type: 'DEV' }
];

export const isRelevant = (candidate: CandidateItem, denylist: string[]): boolean => {
  const text = `${candidate.title} ${candidate.textForMatch}`.toLowerCase();

  // Hard rule: at least one PRIMARY keyword must appear in title OR fetched text
  const hasPrimaryKeyword = PRIMARY.some((keyword) => text.includes(keyword));
  if (!hasPrimaryKeyword) {
    return false;
  }

  // Denylist check (crime, politics, tragedy, generic events, etc.)
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
  const snippet = candidate.snippet?.trim() || '';

  // Use emojis instead of bullet points, no speculative lines
  const bullets: string[] = [];
  if (snippet) {
        bullets.push(`📌 ${snippet.substring(0, 140)}`);
  }
    bullets.push(`📰 Source: ${candidate.sourceName}`);

  return {
    type,
    headline,
    bullets,
    localContext: '',
  };
};

export const formatFacebookMessage = (draft: {
  headline: string;
  bullets: string;
  localContext: string;
  sourceUrl: string;
}) => {
  const parts = [draft.headline, draft.bullets];
  if (draft.localContext) {
    parts.push(draft.localContext);
  }
  return parts.join('\n');
};
