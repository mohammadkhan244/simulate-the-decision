<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Workshop site
- The home page is the original workshop HTML in `src/site/workshop.html`, served verbatim by the `/` route's server GET handler — edit that file directly; do not port it to React (preserves script/style order and single initialisation).
- Embedded images/fonts were extracted unchanged to Lovable Assets (`src/assets/site/*.asset.json`); interactive SVGs stay inline.
- Form submissions go to plain JSON POST routes `/api/public/enquiry` and `/api/public/exercise`, which write to fixed Notion data sources via the Notion connector gateway (server-only).
- Duplicate protection uses `submission_receipts` (IDs/status/page IDs only, never answers) with an atomic claim + Notion reconcile on retry; rate limiting uses the shared `rate_limits` table.
- Webinar testimonials use a continuously translated track with duplicate slides excluded from the reading order; pause for reading and show a static list for reduced motion to keep the loop accessible.
