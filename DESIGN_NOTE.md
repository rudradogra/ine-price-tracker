# Design Note

## Scraping strategy

The mock store is a JavaScript application. Its initial HTML does not contain the product catalog or live quote, so the backend searches the store's paginated `/api/catalog` endpoint and returns product detail URLs. Price and stock are read from the rendered product page with Playwright.

The store returns `/api/layout` metadata whose class names can change between layouts. The browser scraper reads that metadata instead of relying on a permanently hard-coded randomized class name. It then moves the pointer across the price area before clicking `Reveal price`, because the store deliberately requires real pointer movement and asynchronous readiness before enabling the control.

The scraper tries Axios and Cheerio first for ordinary HTML pages. If no valid price is present, it falls back to Playwright. Each attempt validates that the parsed price is positive. Failed attempts use exponential backoff, and the final failure returns `price: null` and `stockStatus: "Unknown"`.

## Data integrity

A scrape log is written for every tracked-product scrape with `SUCCESS`, `RETRIED`, or `FAILED`. Price history is written only when a positive price was extracted. This prevents failed requests from creating fake zero-price or empty history records.

The external cron endpoint processes products sequentially so each result is logged independently. This is slower than unrestricted parallelism but keeps failures attributable and avoids creating an uncontrolled request burst against the mock store.

## Scheduling and deployment

The backend is deployed on Render and the frontend on Vercel. Because free-tier services can sleep, cron-job.org calls the protected `POST /api/scrape/trigger` endpoint every two hours. The frontend receives the Render API base URL through `VITE_API_URL`.

## First-attempt corrections

The first implementation used generic `.price` and `.stock` selectors and assumed the storefront search page contained server-rendered product cards. The mock store is a JavaScript SPA, uses paginated catalog data, hides prices until pointer interaction, and randomizes layout class names. Those assumptions caused empty searches and invalid price extraction. The corrected implementation inspects the store's catalog and layout contracts, performs the required browser interaction, handles currency punctuation such as `Rs. 4,215.00`, and preserves honest failure logs.
