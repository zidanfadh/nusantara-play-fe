# Self-hosted fonts

Loaded with `next/font/local` in `app/layout.tsx`, so `pnpm build` never downloads anything from Google Fonts
(next/font/google failed intermittently on Vercel and locally; `tests/config/fonts.test.ts` forbids it).

Phase 27 (visual identity, design team's "Konsep Visual"): Poppins for body and UI, Cinzel Decorative for the logotype
and a few large display headings, Geist Mono where mono is used. Plus Jakarta Sans (Phase 13 to 26) was removed.

| File | Font | Weight | Source | SHA-256 of the source |
|---|---|---|---|---|
| `Poppins-Regular-latin.woff2` (8,712 B) | Poppins | 400 | `https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf` | `7e65201e9b79159e2300267cc885e16c8dcef2424cdfa09a29bfb0980a94a7ba` |
| `Poppins-Medium-latin.woff2` (8,532 B) | Poppins | 500 | `.../ofl/poppins/Poppins-Medium.ttf` | `90373e7d838d32468438fc3e152dca0bdb12edcab99ea639f158790b1ba1fd05` |
| `Poppins-SemiBold-latin.woff2` (8,852 B) | Poppins | 600 | `.../ofl/poppins/Poppins-SemiBold.ttf` | `d3bf1bdaf0550e83da9ac0b1d1d9fe6db086835a83aa28578e609a394b9a0286` |
| `Poppins-Bold-latin.woff2` (8,616 B) | Poppins | 700 | `.../ofl/poppins/Poppins-Bold.ttf` | `983676516167748b74de6f4771fb384c664fd913acb8b471122ecacf5da5ea6c` |
| `CinzelDecorative-Bold.woff2` (22,504 B) | Cinzel Decorative (Natanael Gama) | 700 | `https://raw.githubusercontent.com/google/fonts/main/ofl/cinzeldecorative/CinzelDecorative-Bold.ttf` | `e854e68a388aa50d742a4415c1ae5c17a617ef7956c95a70021d0a4a44f20518` |
| `GeistMono-latin.woff2` (23,128 B) | Geist Mono, variable | 100–900 | `https://fonts.gstatic.com/s/geistmono/v6/or3nQ6H-1_WfwkMZI_qYFrcdmg.woff2` (Phase 13) | `684ad5b531f81d43c1e8c7038262d5db7cdc1f68006e04d6c7769efa8d33c8cc` (of the woff2) |

google/fonts commits at download time (2026-11-24): `ofl/poppins` `8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5`,
`ofl/cinzeldecorative` `3dd78844021e948ceb633d1dcee3f7885561b5d9`.

How the woff2 files were made (fontTools 4.55.0 + brotli 1.1.0, installed to D: only):
- Poppins: `pyftsubset <ttf> --unicodes=<Google Fonts "latin" range> --layout-features='*' --flavor=woff2`
  (latin range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329,
  U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD).
- Cinzel Decorative: format conversion only (every glyph kept, no subsetting). Its OFL has the Reserved Font Name
  "Cinzel"; a subset could count as a Modified Version, which would have to be renamed. A plain woff2 conversion keeps
  the font data unchanged.

Licences: SIL Open Font License 1.1, copied from the google/fonts repository (`ofl/poppins/OFL.txt` →
`OFL-Poppins.txt`, `ofl/cinzeldecorative/OFL.txt` → `OFL-CinzelDecorative.txt`, `ofl/geistmono/OFL.txt` →
`OFL-GeistMono.txt`).
