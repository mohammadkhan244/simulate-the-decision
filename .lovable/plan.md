# Workshop site rebuild + Notion submissions

## 1. Preserve the website (no redesign)
- Serve the uploaded HTML as the home page, keeping its markup, class names, CSS and JavaScript intact. Inline JS/CSS moves into the page as-is; no React rewrite of behaviour.
- Keep every script and data block in its original dependency order, and every stylesheet in its original order.
- Behaviour initialises exactly once per page mount, with cleanup (timers, listeners, dialogs) on unmount so remounts don't double-bind. Tested with a hard refresh and with navigating away and back.
- Extract only large embedded raster images (card sheet, portraits, headshot, photos) into hosted asset files unchanged. SVGs stay inline wherever animation or JavaScript references their internal elements or IDs; interactive illustrations are never flattened to images.
- Fonts loaded via the same sources as the original.
- Page title, description and social tags taken from the existing copy.

## 2. Notion connection (server-side only)
- Link Lovable's native Notion connector (one workspace connection) using its documented pattern: the connection key and platform key are managed automatically and exposed only to server code. No manually created Notion token is requested unless the connector proves unable to do the writes (I'd tell you first). During Notion sign-in, share only the workshop response database.
- Two fixed, ordinary HTTP POST JSON endpoints: `/api/public/enquiry` and `/api/public/exercise`, so `WORKSHOP_ENQUIRY_CONFIG.endpoint` and the exercise button can call them with plain `fetch`. Each writes only to its hard-coded data source (enquiry `d0e8afa0…`, exercise `6115f234…`) using `parent.data_source_id` and Notion-Version `2025-09-03`. No proxy, browsing, reading or editing.
- Enable Lovable Cloud for a small private store used only for idempotency and rate limiting (see section 5).

## 3. Enquiry form
- Set `WORKSHOP_ENQUIRY_CONFIG.endpoint` to the new endpoint; keep existing validation and prefilling.
- Map fields exactly as specified (Name title, Work email, Company, Team decision, Decision deadline as free text, Participants number, Skill of interest when present, Source, Submission ID, Status = New). "Received at" not written.
- "Continue to calendar": validate → save → redirect to the existing TidyCal URL (name/email prefilled) only after Notion confirms. On failure: keep answers, show a clear error, allow retry. Never set "Booked".

## 4. Decision exercise
- On the completed decision-check screen add a "Submit my decision check" button styled like existing buttons, plus a one-line notice that submitting shares the scenario and answers with the facilitator.
- Sent only on click; no name/email; download keeps working regardless.
- Records the actual role and prompts shown at submission time (situation, character, emotion, lens, reflection), selected timer duration, all five answers, the existing generated summary, decision type select, Source = workshop-website-exercise, Submission ID, Status = New, and a generated title like "Replace a system – Engineer – 12 Oct 2026".
- "Submitted" appears only after confirmed save; failures keep answers and the download.

## 5. Reliability and privacy
- Server-side allowlist + length limits matching the page's limits; unknown fields rejected.
- Long text split into 2,000-character rich-text chunks (no truncation).
- Stable UUID per submission generated in the browser and reused on retry; button disabled while sending.
- Durable, atomic duplicate protection: a private table holding only submission ID, kind, status (processing / saved / failed), Notion page ID and timestamps — no form answers. The server claims the ID with a single atomic insert; a concurrent request with the same ID gets "in progress" or the existing receipt instead of creating a second page.
- Uncertain outcomes (timeout or network error from Notion): before any retry creates a page, the server queries the data source for that Submission ID and records the found page; only if none exists does it create one.
- Spam protection: shared rate limiter backed by the same store (per hashed IP + per kind, fixed window), plus the hidden honeypot. The time-on-form check is a very low threshold and only applied together with other signals, so autofill and assistive-tech submissions are not rejected.
- Logs contain status codes only, never tokens or answers. Responses return just `{ ok, submissionId }`.
- No copy of responses stored outside Notion.

## 6. Verification
- Side-by-side screenshots of original vs rebuilt at desktop and mobile.
- Click through every decision choice, skill dialog, testimonial, card flip, timer, editing, reset, download.
- Real test enquiry and test exercise (labelled "TEST") land in the correct Notion sources; a 2,000+ character answer saves complete; simulated failure keeps answers; double-click, retry and parallel concurrent requests with the same ID (from separate clients) yield one record; simulated timeout reconciles instead of duplicating; confirm no Notion token in browser files or requests.
- Hard refresh and navigate-away-and-back checks for single initialisation.
- Not published until you review desktop/mobile previews and the real Notion test records.

## What you will need to do
- Approve the Notion connection card and share the workshop database with it.

## Technical details
- TanStack Start: `src/routes/index.tsx` renders the original body markup (static trusted source, inline SVGs intact) and, in a mount effect guarded by a module flag + cleanup, injects the original scripts sequentially in source order; stylesheets linked in original order.
- Server routes `src/routes/api/public/enquiry.ts` and `exercise.ts` (POST + same-origin check), zod allowlist; Notion helpers in `*.server.ts`; gateway `https://connector-gateway.lovable.dev/notion/v1` with `LOVABLE_API_KEY` + connector-provided `NOTION_API_KEY`, verified via `get_connection_secrets` before coding.
- Cloud tables (service-role only, RLS on, no public policies): `submission_receipts(submission_id pk, kind, status, notion_page_id, created_at, updated_at)` and `rate_limits(key, window_start, count)` with an atomic upsert-increment function.
- Unit tests for field mapping, chunking, validation limits and idempotency state transitions.
