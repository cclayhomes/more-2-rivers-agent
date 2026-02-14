import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

process.env.DATABASE_URL = 'file:./prisma/test.db';

const { prisma } = await import('../src/services/db');
const { approveDraft } = await import('../src/services/draftService');

describe('approval flow', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });
  beforeAll(async () => {
    await prisma.$executeRawUnsafe('DELETE FROM Draft');
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('DELETE FROM Draft');
  });

  it('approves and posts a draft', async () => {
    const draft = await prisma.draft.create({
      data: {
        draftId: '1001',
        dateFound: new Date(),
        type: 'NEWS',
        headline: 'Two Rivers roadway update',
        bullets: '• Line 1\n• Line 2',
        localContext: 'Calm context.',
        sourceUrl: 'https://example.com',
        sourceName: 'Example',
        status: 'QUEUED',
        urlHash: 'u1',
        titleHash: 't1'
      }
    });

    const updated = await approveDraft(draft.draftId, async () => ({ id: 'fb_123' }));

    expect(updated.status).toBe('POSTED');
    expect(updated.facebookPostId).toBe('fb_123');
    expect(updated.postedAt).toBeTruthy();
  });
});
