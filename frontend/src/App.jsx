import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, Search } from 'lucide-react';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import PriceHistoryModal from './components/PriceHistoryModal';
import { checkStoreProduct, deleteProduct, getProductHistory, getProductLogs, getProducts, getStoreProducts, trackProduct } from './api';

export default function App() {
  const [products, setProducts] = useState([]);
  const [trackedProducts, setTrackedProducts] = useState([]);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState([]);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [checkingId, setCheckingId] = useState(null);
  const [trackingId, setTrackingId] = useState(null);
  const [error, setError] = useState('');
  const [lastSynced, setLastSynced] = useState('Never');

  const stats = useMemo(() => {
    return { totalCatalog: products.length, totalTracked: trackedProducts.length };
  }, [products, trackedProducts]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const [catalogResult, trackedResult] = await Promise.allSettled([getStoreProducts(), getProducts()]);

      if (catalogResult.status === 'fulfilled') {
        setProducts(catalogResult.value);
      } else {
        throw catalogResult.reason;
      }

      if (trackedResult.status === 'fulfilled') {
        setTrackedProducts(trackedResult.value);
      } else {
        setTrackedProducts([]);
        setError('Catalog loaded, but tracked products are unavailable. Check Supabase permissions.');
      }
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to load tracked products.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackProduct = async (product) => {
    try {
      setTrackingId(product.id);
      setError('');
      const saved = await trackProduct({ name: product.name, url: product.url });
      const tracked = {
        ...(saved?.product || {}),
        ...product,
        ...(saved?.initialScrape?.price !== null && saved?.initialScrape?.price !== undefined
          ? {
              price: saved.initialScrape.price,
              stockStatus: saved.initialScrape.stockStatus,
              lastChecked: new Date().toISOString()
            }
          : {})
      };
      setTrackedProducts((current) => [tracked, ...current.filter((item) => item.url !== tracked.url)]);
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to track this product.');
    } finally {
      setTrackingId(null);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleCheckPrice = async (product) => {
    try {
      setCheckingId(product.id);
      setError('');
      const result = await checkStoreProduct(product.url);
      setProducts((current) => current.map((item) => item.id === product.id
        ? { ...item, price: result.price, stockStatus: result.stockStatus, lastChecked: result.checkedAt }
        : item));
      setTrackedProducts((current) => current.map((item) => item.url === product.url
        ? { ...item, price: result.price, stockStatus: result.stockStatus, lastChecked: result.checkedAt }
        : item));
      setLastSynced(new Date(result.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      setError(
        err?.response?.data?.error
        || err?.response?.data?.details
        || (err?.code === 'ECONNABORTED' ? 'Price check timed out while Render was starting the scraper.' : err?.message)
        || 'Price check failed.'
      );
    } finally {
      setCheckingId(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      setError('');
      await deleteProduct(id);
      setTrackedProducts((current) => current.filter((product) => product.id !== id));
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to remove this tracked product.');
    }
  };

  const handleUntrackProduct = async (product) => {
    try {
      setError('');
      const trackedProduct = trackedProducts.find((item) => item.url === product.url);
      if (!trackedProduct?.id) {
        setError('This product is not available in tracked records.');
        return;
      }
      await deleteProduct(trackedProduct.id);
      setTrackedProducts((current) => current.filter((item) => item.url !== product.url));
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to unstar this product.');
    }
  };

  const handleViewHistory = async (product) => {
    try {
      setSelectedProduct(product);
      setHistoryLoading(true);
      const [history, logs] = await Promise.all([
        getProductHistory(product.id),
        getProductLogs(product.id)
      ]);
      setSelectedHistory(history);
      setSelectedLogs(logs);
    } catch (err) {
      setSelectedHistory([]);
      setSelectedLogs([]);
      setError(err?.response?.data?.error || 'Unable to fetch price history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const normalizedQuery = catalogQuery.trim().toLowerCase();
  const visibleProducts = normalizedQuery
    ? products
      .filter((product) => `${product.name} ${product.brand} ${product.category}`
        .toLowerCase()
        .includes(normalizedQuery))
      .sort((left, right) => {
        const leftStarred = trackedProducts.some((item) => item.url === left.url);
        const rightStarred = trackedProducts.some((item) => item.url === right.url);
        return Number(rightStarred) - Number(leftStarred);
      })
    : [];
  const emptyState = !loading && normalizedQuery && visibleProducts.length === 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar lastSynced={lastSynced} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 grid gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-soft">
            <p className="text-sm text-slate-400">Available products</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-bold text-white">{stats.totalCatalog}</span>
              <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-xs text-indigo-300">Available</span>
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-soft sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Automation</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">INE product catalog</h2>
            </div>
            <button
              type="button"
              onClick={loadProducts}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 transition hover:border-indigo-500 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-950/60 p-3 focus-within:border-indigo-500">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              value={catalogQuery}
              onChange={(event) => setCatalogQuery(event.target.value)}
              placeholder="Filter all products by name, brand, or category..."
              className="w-full bg-transparent text-base text-white placeholder:text-slate-500 focus:outline-none"
            />
            {searchLoading && <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />}
          </div>
        </section>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="mb-4 h-40 rounded-xl bg-slate-800" />
                <div className="mb-3 h-5 w-2/3 rounded bg-slate-800" />
                <div className="mb-2 h-4 w-1/2 rounded bg-slate-800" />
                <div className="h-12 rounded-xl bg-slate-800" />
              </div>
            ))}
          </div>
        ) : !loading && !normalizedQuery ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center">
            <Search className="mx-auto mb-4 h-10 w-10 text-indigo-300" />
            <h3 className="text-xl font-semibold text-white">Search the catalog</h3>
            <p className="mt-2 text-slate-400">Enter a product name, brand, or category to find products to track.</p>
          </div>
        ) : emptyState ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center">
            <h3 className="text-xl font-semibold text-white">No matching products</h3>
            <p className="mt-2 text-slate-400">Try a different name, brand, or category.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                tracked={trackedProducts.some((item) => item.url === product.url)}
                onTrack={handleTrackProduct}
                onUntrack={handleUntrackProduct}
                onViewHistory={handleViewHistory}
                onCheckPrice={handleCheckPrice}
                checking={checkingId === product.id}
                tracking={trackingId === product.id}
              />
            ))}
          </div>
        )}

        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Persistence</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">Tracked products</h2>
            </div>
              <span className="text-sm text-slate-400">{stats.totalTracked} starred</span>
          </div>

          {trackedProducts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center text-slate-400">
              Star a catalog product above to start recording price history.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {trackedProducts.map((product) => (
                <ProductCard
                  key={`tracked-${product.id}`}
                  product={product}
                  tracked
                  onUntrack={handleUntrackProduct}
                  onDelete={handleDelete}
                  onViewHistory={handleViewHistory}
                  onCheckPrice={handleCheckPrice}
                  checking={checkingId === product.id}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <PriceHistoryModal
        product={selectedProduct}
        history={selectedHistory}
        logs={selectedLogs}
        loading={historyLoading}
        onClose={() => {
          setSelectedProduct(null);
          setSelectedHistory([]);
          setSelectedLogs([]);
        }}
      />
    </div>
  );
}
