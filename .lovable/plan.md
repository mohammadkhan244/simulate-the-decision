# Workshop site rebuild + Notion submissions

## 1. Preserve the website (no redesign)
- Serve the uploaded HTML as the home page, keeping its markup, class names, CSS and JavaScript intact. Inline JS/CSS moves into the page as-is; no React rewrite of behaviour.
- Extract the large embedded images (card sheet, illustrations, portraits, headshot, icons) into hosted asset files unchanged, and point the original code at them, so the page loads fast. Pixel content is untouched.
- Fonts loaded via the same sources as the original.
- Page title, description and social tags taken from the existing copy.

## 2. Notion connection (server-side only)
- Link the native Notion connector (one workspace connection). You share the workshop database with it during sign-in. Token stays on the server; nothing in the browser.
- Two fixed server endpoints only: "submit enquiry" and "submit exercise". Each writes to its hard-coded data source (enquiry `d0e8afa0…`, exercise `6115f234…`) using `parent.data_source_id` and Notion-Version `2025-09-03`. No proxy, browsing, reading or editing.

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
- Stable UUID per submission generated in the browser and reused on retry; button disabled while sending; server checks Notion for an existing page with that Submission ID before creating (duplicate protection without a separate copy of responses).
- Spam protection: hidden honeypot field + minimum time-on-form check; light per-visitor rate limit (best effort, per server instance — noted as a limitation).
- Logs contain status codes only, never tokens or answers. Responses return just `{ ok, submissionId }`.
- No extra database copy of responses.

## 6. Verification
- Side-by-side screenshots of original vs rebuilt at desktop and mobile.
- Click through every decision choice, skill dialog, testimonial, card flip, timer, editing, reset, download.
- Real test enquiry and test exercise (labelled "TEST") land in the correct Notion sources; a 2,000+ character answer saves complete; simulated failure keeps answers; double-click/retry yields one record; confirm no Notion token in browser files or requests.
- Not published automatically.

## What you will need to do
- Approve the Notion connection card and share the workshop database with it.

## Technical details
- TanStack Start: `src/routes/index.tsx` renders the original body markup (dangerouslySetInnerHTML of the trusted, static source) and loads the original script after hydration; CSS into a route stylesheet.
- `createServerFn` handlers in `src/server/notion.functions.ts` with zod validation; gateway `https://connector-gateway.lovable.dev/notion/v1/pages` with `LOVABLE_API_KEY` + `NOTION_API_KEY`; duplicate check via `POST /data_sources/{id}/query` filtered on Submission ID.
- Unit tests for field mapping, chunking and validation limits.
