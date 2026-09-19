import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { parsePrice, scrapeProduct } from '../scraper.js';

function startMockServer() {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <body>
          <div class="price">$19.99</div>
          <div class="stock-status">In Stock</div>
        </body>
      </html>
    `);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

test('parsePrice strips non-numeric characters and keeps valid values', () => {
  assert.equal(parsePrice('$19.99'), 19.99);
  assert.equal(parsePrice('€12,50'), 12.5);
  assert.equal(parsePrice('1.250,99'), 1250.99);
  assert.equal(parsePrice('1,250.99'), 1250.99);
  assert.equal(parsePrice('0'), null);
  assert.equal(parsePrice('N/A'), null);
});

test('scrapeProduct succeeds with a real local HTML page', async () => {
  const { server, url } = await startMockServer();
  try {
    const result = await scrapeProduct(url, 1);
    assert.equal(result.price, 19.99);
    assert.equal(result.stockStatus.trim(), 'In Stock');
    assert.equal(result.error, null);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
});
