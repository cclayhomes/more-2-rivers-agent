import { describe, expect, it } from 'vitest';

import { parseListingsFromHtml } from '../src/services/mlsParserService';

describe('parseListingsFromHtml', () => {
  it('extracts OneHome/Stellar MLS listing details and ignores footer content', () => {
    const html = `
      <table>
        <tr><td><span>$577,777</span></td></tr>
        <tr><td><div>Residential</div></td></tr>
        <tr><td><div>1673 SUTTONSET TRL</div></td></tr>
        <tr><td><div>ZEPHYRHILLS, Florida 33541</div></td></tr>
        <tr><td><div>4 bd  •    •  2,109 sqft  MLS #O6384771</div></td></tr>
        <tr><td><div>New Listing</div></td></tr>
      </table>
      <hr />
      <div>Delivered By Cotality, Inc. 40 Pacifica, Irvine, CA 92618</div>
      <div>Unsubscribe</div>
    `;

    const parsed = parseListingsFromHtml(html);

    expect(parsed.newListingsCount).toBe(1);
    expect(parsed.newListings).toEqual([
      {
        address: '1673 SUTTONSET TRL, ZEPHYRHILLS, Florida 33541',
        price: 577777,
        beds: 4,
        baths: null,
        sqft: 2109,
        mlsNumber: 'O6384771',
        status: 'Active'
      }
    ]);
  });
});
