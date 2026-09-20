# INE Assignment Checklist

## Implemented and verified

- [x] React dashboard with responsive product cards.
- [x] Search endpoint integration for partial or full product names.
- [x] Supabase-backed tracked products.
- [x] Initial scrape when a product is tracked.
- [x] Price and stock history display.
- [x] Per-product scrape log display.
- [x] HTTP-first scraper with Playwright fallback.
- [x] Store-specific catalog search through `/api/catalog`.
- [x] Store-specific dynamic price reveal using `/api/layout` metadata and real pointer movement.
- [x] Three-attempt retry loop with exponential backoff.
- [x] No price-history row is written when scraping fails.
- [x] Failed and retried outcomes are written to `scrape_logs`.
- [x] External cron endpoint protected by `CRON_SECRET`.
- [x] Local backend tests pass.
- [x] Frontend production build passes.
- [x] Real mock-store scrape verified with live price and stock output.

## Before deployment

- [ ] Commit and push the latest changes to the public GitHub repository.
- [ ] Deploy backend on Render with Node 22+ and start command `node backend/index.js` or the configured backend command.
- [ ] Set Render variables: `SUPABASE_URL`, `SUPABASE_KEY`, `CRON_SECRET`, and `PORT` if required.
- [ ] Deploy frontend on Vercel with `VITE_API_URL=https://<render-service>/api`.
- [ ] Confirm Vercel can call Render health, products, search, tracking, history, and logs routes.
- [ ] Configure cron-job.org as `POST https://<render-service>/api/scrape/trigger` with `x-cron-secret`.
- [ ] Set the cron schedule to every two hours: `0 */2 * * *`.
- [ ] Test the cron job once and verify both `scrape_logs` and `price_history` in Supabase.
- [ ] Configure Supabase writes: set the backend-only `SUPABASE_SERVICE_ROLE_KEY`, or create narrowly scoped RLS policies for the backend operations.
- [ ] Run a headed scraper recording against the mock store, including a retry/failure case.
- [ ] Add the hosted site URL and public GitHub URL to the submission email.
- [ ] Attach the PDF resume.
- [ ] Include the design note in the repository.
