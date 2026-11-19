# Self-hosted fonts

Loaded with `next/font/local` in `app/layout.tsx`, so `pnpm build` never downloads anything from Google Fonts
(next/font/google failed intermittently on Vercel and locally). Downloaded once on 2026-11-19 from the official
Google Fonts CSS API (`fonts.googleapis.com/css2`, the same files next/font/google used), latin subset only.

| File | Font | Weights | Source (latin subset) | SHA-256 |
|---|---|---|---|---|
| `PlusJakartaSans-latin.woff2` (27,348 B) | Plus Jakarta Sans, variable | 300–800 used | `https://fonts.gstatic.com/s/plusjakartasans/v12/LDIoaomQNQcsA88c7O9yZ4KMCoOg4Ko20yw.woff2` | `153fc85b70298beeb1d61a5f723331649e7f23bb77302a66e61cb3e2fbdb5e79` |
| `GeistMono-latin.woff2` (23,128 B) | Geist Mono, variable | 100–900 | `https://fonts.gstatic.com/s/geistmono/v6/or3nQ6H-1_WfwkMZI_qYFrcdmg.woff2` | `684ad5b531f81d43c1e8c7038262d5db7cdc1f68006e04d6c7769efa8d33c8cc` |

Licences: SIL Open Font License 1.1, copied from the google/fonts repository
(`ofl/plusjakartasans/OFL.txt` → `OFL-PlusJakartaSans.txt`, `ofl/geistmono/OFL.txt` → `OFL-GeistMono.txt`).
