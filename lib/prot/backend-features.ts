/**
 * Phase 26: frontend use of PROT backend features that are NOT in the production backend yet (shared CLAUDE.md
 * "Pending deployment" item 13). Each flag is off by default; turn it on (Vercel env, build time) only after the
 * backend deploy. Sending a field the deployed DTO does not know would fail the whole request
 * (`forbidNonWhitelisted`), so code that sends such a field must check its flag.
 *
 * Read as the literal `process.env.NEXT_PUBLIC_…` so Next inlines it at build time.
 */

export function parseFlag(value: string | undefined): boolean {
  return (value ?? '').trim().toLowerCase() === 'true';
}

/**
 * `NEXT_PUBLIC_PROT_RESUBMIT_NOTE=true`: the contributor's note is also sent with `POST /prot/:id/resubmit`
 * (`{ catatan }`). The old route takes no body (the note would be silently lost), so without the flag the form says
 * that the note is available after the server update.
 */
export const PROT_RESUBMIT_NOTE = parseFlag(process.env.NEXT_PUBLIC_PROT_RESUBMIT_NOTE);

/**
 * `NEXT_PUBLIC_PROT_SELF_REVIEW_RULE=true`: the backend refuses self-review; an admin may override it with a reason
 * (`selfReviewOverrideReason` on review and publish). Without the flag the review page only WARNS and never sends the
 * field (the old DTO would reject it).
 */
export const PROT_SELF_REVIEW_RULE = parseFlag(process.env.NEXT_PUBLIC_PROT_SELF_REVIEW_RULE);
