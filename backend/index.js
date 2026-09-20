import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import WebSocket from 'ws';
import { scrapeProduct } from './scraper.js';

dotenv.config();
globalThis.WebSocket = WebSocket;

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL and SUPABASE_KEY are required');
}
const supabase = createClient(supabaseUrl, supabaseKey);

// --- ENDPOINT 1: Health Check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- ENDPOINT 2: Live Product Search on Target Store ---
app.get('/api/products/search', async (req, res) => {
  const query = String(req.query.q || '').trim().toLowerCase();
  if (!query) return res.status(400).json({ error: 'Search query is required' });

  try {
    const catalogUrl = 'https://demo.inelabteamdev.com/api/catalog';
    const firstPage = await axios.get(catalogUrl, {
      params: { page: 1, pageSize: 60 },
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      timeout: 8000
    });

    const pages = Number(firstPage.data.pages || 1);
    const remainingPages = await Promise.all(
      Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
        axios.get(catalogUrl, {
          params: { page: index + 2, pageSize: 60 },
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
          timeout: 8000
        })
      )
    );

    const products = [firstPage, ...remainingPages].flatMap(({ data }) => data.items || []);
    const results = [...new Map(products
      .filter((product) => `${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(query))
      .map((product) => [product.id, product])).values()]
      .slice(0, 20)
      .map((product) => ({
        id: product.id,
        name: product.name,
        brand: product.brand,
        category: product.category,
        url: `https://demo.inelabteamdev.com/product/${product.id}`
      }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search target store', details: err.message });
  }
});

// --- ENDPOINT 3: Track a New Product ---
app.post('/api/products', async (req, res) => {
  const { name, url, targetPrice } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  let productName = name;
  try {
    productName ||= new URL(url).hostname;
  } catch {
    return res.status(400).json({ error: 'A valid product URL is required' });
  }

  try {
    // Insert product into Supabase
    const { data: product, error } = await supabase
      .from('products')
      .insert([{ name: productName, url }])
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

// --- ENDPOINT 7: Delete a Tracked Product ---
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product', details: err.message });
  }
});

// --- ENDPOINT 8: Trigger Scheduled Scrapes for All Products (Cron Target) ---
app.post('/api/scrape/trigger', async (req, res) => {
  try {
    // 1. Secret Key Check
    const authHeader = req.headers['x-cron-secret'] || req.query.secret;
    if (authHeader !== process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized cron request' });
    }

    // 2. Query Supabase
    const { data: products, error } = await supabase.from('products').select('*');
    
    if (error) {
      console.error('Supabase Query Error:', error.message);
      return res.status(500).json({ error: 'Database query failed', details: error.message });
    }

    // 3. Handle Empty Product Table Gracefully (Prevents 500 Crash)
    if (!products || products.length === 0) {
      return res.status(200).json({ 
        message: 'Cron job executed successfully. No products are currently tracked.', 
        summary: [] 
      });
    }

    // 4. Batch Scrape Active Products
    const summary = [];
    for (const product of products) {
      console.log(`[Cron Job] Processing product: ${product.name}`);
      const result = await scrapeProduct(product.url);
      const status = result.error ? 'FAILED' : (result.attempts > 1 ? 'RETRIED' : 'SUCCESS');

      await supabase.from('scrape_logs').insert([{
        product_id: product.id,
        status: status,
        error_message: result.error
      }]);

      if (result.price !== null) {
        await supabase.from('price_history').insert([{
          product_id: product.id,
          price: result.price,
          stock_status: result.stockStatus
        }]);
      }

      summary.push({ productId: product.id, status, price: result.price });
    }

    return res.status(200).json({ message: 'Scrape batch completed', summary });

  } catch (err) {
    console.error('Cron endpoint crash:', err.message);
    return res.status(500).json({ error: 'Cron endpoint failure', details: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));