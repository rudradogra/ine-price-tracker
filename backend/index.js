import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { scrapeProduct } from './scraper.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- ENDPOINT 1: Health Check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- ENDPOINT 2: Live Product Search on Target Store ---
app.get('/api/products/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'Search query is required' });

  try {
    const storeUrl = `https://demo.inelabteamdev.com/?s=${encodeURIComponent(query)}`;
    const response = await axios.get(storeUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 8000
    });

    const $ = cheerio.load(response.data);
    const results = [];

    $('.product, .product-item, .product-card, article').each((_, el) => {
      const title = $(el).find('.product-title, .title, h2, h3, a').first().text().trim();
      const link = $(el).find('a').first().attr('href');
      if (title && link) {
        results.push({ name: title, url: link });
      }
    });

    // Fallback if no specific wrapper classes matched
    if (results.length === 0) {
      $('a[href*="product"]').each((_, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr('href');
        if (text && href && !results.some(r => r.url === href)) {
          results.push({ name: text, url: href });
        }
      });
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search target store', details: err.message });
  }
});

// --- ENDPOINT 3: Track a New Product ---
app.post('/api/products', async (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'Name and URL are required' });

  try {
    // Insert product into Supabase
    const { data: product, error } = await supabase
      .from('products')
      .insert([{ name, url }])
      .select()
      .single();

    if (error) throw error;

    // Trigger initial scrape immediately upon tracking
    const scrapeResult = await scrapeProduct(product.url);
    const status = scrapeResult.error ? 'FAILED' : (scrapeResult.attempts > 1 ? 'RETRIED' : 'SUCCESS');

    // Save log
    await supabase.from('scrape_logs').insert([{
      product_id: product.id,
      status: status,
      error_message: scrapeResult.error
    }]);

    // Save initial price history if valid
    if (scrapeResult.price !== null) {
      await supabase.from('price_history').insert([{
        product_id: product.id,
        price: scrapeResult.price,
        stock_status: scrapeResult.stockStatus
      }]);
    }

    res.status(201).json({ product, initialScrape: scrapeResult });
  } catch (err) {
    res.status(500).json({ error: 'Failed to track product', details: err.message });
  }
});

// --- ENDPOINT 4: Get All Tracked Products ---
app.get('/api/products', async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products', details: err.message });
  }
});

// --- ENDPOINT 5: Get Price History for a Product ---
app.get('/api/products/:id/history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('product_id', req.params.id)
      .order('timestamp', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch price history', details: err.message });
  }
});

// --- ENDPOINT 6: Get Scrape Logs for a Product ---
app.get('/api/products/:id/logs', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('scrape_logs')
      .select('*')
      .eq('product_id', req.params.id)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scrape logs', details: err.message });
  }
});

// --- ENDPOINT 7: Trigger Scheduled Scrapes for All Products (Cron Target) ---
app.post('/api/scrape/trigger', async (req, res) => {
  // Simple auth check via secret header or query param
  const authHeader = req.headers['x-cron-secret'] || req.query.secret;
  if (authHeader !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized cron request' });
  }

  try {
    const { data: products, error } = await supabase.from('products').select('*');
    if (error) throw error;

    const summary = [];

    for (const product of products) {
      console.log(`[Cron Job] Processing product: ${product.name}`);
      const result = await scrapeProduct(product.url);
      const status = result.error ? 'FAILED' : (result.attempts > 1 ? 'RETRIED' : 'SUCCESS');

      // Log the scrape attempt honestly
      await supabase.from('scrape_logs').insert([{
        product_id: product.id,
        status: status,
        error_message: result.error
      }]);

      // Only record price history if price is valid (never save null or zero)
      if (result.price !== null) {
        await supabase.from('price_history').insert([{
          product_id: product.id,
          price: result.price,
          stock_status: result.stockStatus
        }]);
      }

      summary.push({ productId: product.id, status, price: result.price });
    }

    res.json({ message: 'Scrape batch completed', summary });
  } catch (err) {
    res.status(500).json({ error: 'Cron batch failed', details: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));