import { CandidateItem, DraftContent, DraftType } from '../types';
import { sanitizeSnippet } from './sourceService';

// Tier 1: direct community mentions are auto-relevant.
const DIRECT_COMMUNITY = ['two rivers', 'epperson', 'bexley', 'asturia', 'connerton'];

// Tier 2: broader area keywords need an additional community-impact signal.
const BROADER_AREA = ['wesley chapel', 'pasco county', 'zephyrhills', 'sr-56', 'sr 56', 'shady hills', 'land o lakes', 'wiregrass'];

const COMMUNITY_IMPACT_SIGNALS = [
  'school', 'zoning', 'development', 'new homes', 'builder', 'construction',
  'road', 'infrastructure', 'water', 'sewer', 'utility', 'permit',
  'parks', 'recreation', 'library', 'fire station', 'hospital',
  'hoa', 'community meeting', 'town hall', 'rezoning', 'land use',
  'grocery', 'shopping', 'retail', 'restaurant', 'opening',
  'traffic', 'intersection', 'bridge', 'fdot', 'i-75', 'sr 54',
  'property tax', 'assessment', 'flood', 'hurricane', 'storm',
  'master plan', 'comprehensive plan', 'impact fee'
];

const TYPE_MAP: Array<{ keywords: string[]; type: DraftType }> = [
  { keywords: ['school', 'student', 'district'], type: 'SCHOOL' },
  { keywords: ['road', 'traffic', 'fdot', 'infrastructure', 'bridge', 'sr-56', 'i-75'], type: 'INFRA' },
  { keywords: ['event', 'festival', 'community', 'meeting'], type: 'EVENT' },
  { keywords: ['housing', 'market', 'home', 'real estate'], type: 'MARKET' },
  { keywords: ['development', 'builder', 'construction'], type: 'DEV' }
];

export const isRelevant = (candidate: CandidateItem, denylist: string[]): boolean => {
  const text = `${candidate.title} ${candidate.textForMatch}`.toLowerCase();

  // Tier 1: Direct community mention = auto-pass
  const hasDirect = DIRECT_COMMUNITY.some((kw) => text.includes(kw));

  // Tier 2: Broader area requires a community-impact signal
  const hasBroader = BROADER_AREA.some((kw) => text.includes(kw));
  const hasImpact = COMMUNITY_IMPACT_SIGNALS.some((kw) => text.includes(kw));

  if (!hasDirect && !(hasBroader && hasImpact)) {
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
  const snippet = sanitizeSnippet(candidate.snippet);

  // Use emojis instead of bullet points, no speculative lines
  const bullets: string[] = [];
  if (snippet && snippet.length > 0) {
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
