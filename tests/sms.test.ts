import { describe, expect, it } from 'vitest';
import { parseSmsCommand } from '../src/utils/sms';

describe('parseSmsCommand', () => {
  it('parses approve command', () => {
    expect(parseSmsCommand('A123')).toEqual({ action: 'APPROVE', draftId: '123' });
  });

  it('parses reject command', () => {
    expect(parseSmsCommand('r456')).toEqual({ action: 'REJECT', draftId: '456' });
  });

  it('returns unknown for invalid body', () => {
    expect(parseSmsCommand('hello')).toEqual({ action: 'UNKNOWN' });
  });
});
