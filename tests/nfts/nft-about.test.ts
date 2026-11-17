import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const pagePath = fileURLToPath(new URL('../../app/nfts/[slug]/page.tsx', import.meta.url));
const source = readFileSync(pagePath, 'utf8');

describe('NFT detail page "about" rendering (finding F2)', () => {
  it('does not use dangerouslySetInnerHTML anywhere', () => {
    expect(source).not.toContain('dangerouslySetInnerHTML');
  });

  it('renders nft.about as plain text with whitespace-pre-line', () => {
    expect(source).toMatch(/className="whitespace-pre-line">\{nft\.about\}</);
  });
});
