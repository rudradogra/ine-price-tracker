# INE Product Price Tracker

Full-stack price tracker for INE's hosted mock storefront.

## Structure

- `backend/`: Express API, Supabase persistence, Axios/Cheerio scraper, and Playwright fallback.
- `frontend/`: React + Vite + Tailwind dashboard.
- `DESIGN_NOTE.md`: scraping decisions, reliability strategy, and first-attempt corrections.
- `ASSIGNMENT_CHECKLIST.md`: implementation and submission checklist.

## Local setup

### Backend

Use Node.js 22 or later.

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
PORT=5001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key
# Prefer the server-only service-role key for Render/local backend writes.
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=replace-with-a-long-random-secret
```

Start the API:

```bash
node index.js
```

Verify it:

```bash
curl http://localhost:5001/api/health
```

### Frontend

Create `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:5001/api
```

Then run:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## API routes

- `GET /api/products`
- `GET /api/products/search?q=product-name`
- `POST /api/products`
- `DELETE /api/products/:id`
- `GET /api/products/:id/history`
- `GET /api/products/:id/logs`
- `POST /api/scrape/trigger`

The cron request must include `x-cron-secret` or `?secret=` matching `CRON_SECRET`.

## Scraping schedule

Configure cron-job.org to call the deployed cron endpoint every two hours:

```text
0 */2 * * *
```

Use `POST https://your-render-service.onrender.com/api/scrape/trigger` and send the `x-cron-secret` header.

## Headed run

Install Playwright browsers once:

```bash
cd backend
npx playwright install chromium
```

Run the scraper tests in headed mode:

```bash
HEADED=true npm run test:headed
```

For the submission recording, show a real product URL from the mock store, the pointer-driven price reveal, retry output, and the final honest result.

## Verification

```bash
cd backend && npm test
cd ../frontend && npm run build
```
