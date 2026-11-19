/**
 * Landing image sizes (Phase 18), from the boxes they are drawn in:
 * - Tur Virtual preview: object-contain inside the card's p-8 box with another p-8 (64 px less than the box);
 *   full card width below lg (section px-6 on both sides), half of the max-w-7xl card from lg.
 * - Feature cards: aspect 4:5 with object-cover, so a square photo is drawn 1.25 times the card width;
 *   one column below md, three from md (gap-12).
 * - Blockchain: lg-only square, half of the max-w-7xl grid minus half the gap-20.
 */
export const LANDING_IMAGE_SIZES = {
  tourPreview: '(min-width: 1280px) 552px, (min-width: 1024px) calc(50vw - 88px), calc(100vw - 112px)',
  feature: '(min-width: 1280px) 495px, (min-width: 768px) calc((100vw - 144px) * 0.42), calc((100vw - 48px) * 1.25)',
  blockchain: '(min-width: 1280px) 576px, calc(50vw - 88px)',
} as const;
