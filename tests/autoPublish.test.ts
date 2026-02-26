import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.DATABASE_URL = 'file:./prisma/test.db';

vi.mock('../src/services/imageService', () => ({
  generateListingsImage: vi.fn(async () => Buffer.from('image')),
  generateMarketImage: vi.fn(async () => Buffer.from('image'))
}));

vi.mock('../src/services/facebookService', () => ({
  publishPhotoToFacebook: vi.fn(async () => ({ id: 'fb_photo_1' })),
  publishToFacebook: vi.fn(async () => ({ id: 'fb_post_1' }))
}));

const { prisma } = await import('../src/services/db');
const { createListingsDraftFromEmail } = await import('../src/services/draftService');

describe('auto-publish flow', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe('DELETE FROM Draft');
  });

  it('auto-publishes listing drafts immediately after creation', async () => {
    const draft = await createListingsDraftFromEmail({
      generatedAt: new Date().toISOString(),
      community: 'Two Rivers',
      periodLabel: 'Week of Test',
      newListingsCount: 1,
      newListings: [
        { address: '123 Test St', price: 420000, beds: 4, baths: 3, sqft: 2200, status: 'Active' }
      ]
    });

    expect(draft).toBeTruthy();
    expect(draft?.status).toBe('POSTED');
    expect(draft?.facebookPostId).toBe('fb_photo_1');
    expect(draft?.postedAt).toBeTruthy();
  });
});
