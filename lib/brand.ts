/**
 * The brand, in one place (Phase 18, owner decision: "Nusantara Legacy" everywhere users see it).
 * Every page, navbar, footer, metadata entry and the Jelajah intro bumper read these constants, so a later
 * rename is a change here only. Feature names such as "Tur Virtual" are words, not the brand.
 */
export const SITE_NAME = 'Nusantara Legacy';

/** The landing hero's first sentence; also the bumper's brand scene subtitle. */
export const SITE_TAGLINE = 'Menjaga warisan, memainkan masa depan.';

/** Meta description (Indonesian, `<html lang="id">`). */
export const SITE_DESCRIPTION =
  'Platform budaya digital untuk mendokumentasikan, memverifikasi, dan menghidupkan kembali permainan tradisional Indonesia.';

/** The two words of the name, for the landing hero that shows them on two lines. */
export const SITE_NAME_WORDS = SITE_NAME.split(' ') as readonly string[];
