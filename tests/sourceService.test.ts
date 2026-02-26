import { describe, expect, it } from 'vitest';

import { sanitizeSnippet } from '../src/services/sourceService';

describe('sanitizeSnippet', () => {
  it('sanitizes garbage JavaScript prompt snippets to empty string', () => {
    expect(sanitizeSnippet('To continue reading, please enable JavaScript in your browser.')).toBe('');
  });

  it('passes through normal snippets unchanged', () => {
    const snippet = 'New road improvements near Two Rivers are expected to start next month.';

    expect(sanitizeSnippet(snippet)).toBe(snippet);
  });

  it('sanitizes very short snippets to empty string', () => {
    expect(sanitizeSnippet('Short update')).toBe('');
  });
});
