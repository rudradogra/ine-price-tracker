# INE Product Price Tracker

Full-stack price tracker for INE's hosted mock storefront.

## Structure

- `backend/`: Express API, Supabase persistence, catalog integration, and Playwright scraper.
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
SUPABASE_KEY=your-publishable-or-anon-key
# Backend only. Never expose this in Vercel or frontend code.
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=replace-with-a-long-random-secret
```

`SUPABASE_SERVICE_ROLE_KEY` is required for server-side writes when Supabase RLS is enabled. Keep `backend/.env` out of Git.

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
- `GET /api/store/products`
- `POST /api/store/check`
- `GET /api/products/search?q=product-name`
- `POST /api/products`
- `POST /api/products/:id/check`
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

Example:

```bash
curl -X POST https://your-render-service.onrender.com/api/scrape/trigger \
	-H "x-cron-secret: $CRON_SECRET"
```

## Deployment variables

Render backend variables:

```env
NODE_VERSION=22.23.0
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-key
CRON_SECRET=your-random-cron-secret
```

Render commands from the repository root:

```text
Build command: npm install --prefix backend
Start command: node backend/index.js
```

Vercel frontend variable:

```env
VITE_API_URL=https://your-render-service.onrender.com/api
```

## Headed run

Install Playwright browsers once:

```bash
cd backend
npx playwright install chromium
```

Run a real product scrape in headed mode:

```bash
HEADED=true node --input-type=module -e "import { scrapeProduct } from './scraper.js'; console.log(await scrapeProduct('https://demo.inelabteamdev.com/product/845', 3));"
```

For the submission recording, show the pointer-driven price reveal, retry output when the store produces one, and the final honest result.

## Verification

```bash
cd backend && npm test
cd ../frontend && npm run build
```
