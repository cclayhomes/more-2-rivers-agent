import { describe, expect, it } from 'vitest';

import { createDraftFromCandidate, isRelevant } from '../src/services/contentService';
import { CandidateItem } from '../src/types';

const createCandidate = (title: string, textForMatch = ''): CandidateItem => ({
  title,
  textForMatch,
  url: 'https://example.com/story',
  sourceName: 'Example Source'
});

describe('content relevance filtering', () => {
  it('accepts direct Two Rivers community mentions', () => {
    const candidate = createCandidate('Two Rivers adds new amenities');

    expect(isRelevant(candidate, [])).toBe(true);
  });

  it('rejects broader-area mentions without community-impact signals', () => {
    const candidate = createCandidate('Wesley Chapel hosts weekend art fair');

    expect(isRelevant(candidate, [])).toBe(false);
  });

  it('accepts broader-area mentions with community-impact signals', () => {
    const candidate = createCandidate('Wesley Chapel new school approved by county');

    expect(isRelevant(candidate, [])).toBe(true);
  });

  it('applies denylist filtering across tiers', () => {
    const candidate = createCandidate('Two Rivers community update');

    expect(isRelevant(candidate, ['update'])).toBe(false);
  });
});


describe('draft creation', () => {
  it('does not include a snippet bullet when snippet sanitizes to empty', () => {
    const candidate = createCandidate('Two Rivers adds new amenities', 'Two Rivers update');
    candidate.snippet = 'please enable JavaScript to continue reading';

    const draft = createDraftFromCandidate(candidate);

    expect(draft.bullets.some((bullet) => bullet.startsWith('📌 '))).toBe(false);
  });
});
