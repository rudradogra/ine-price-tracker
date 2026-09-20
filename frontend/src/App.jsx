import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Plus, RefreshCw } from 'lucide-react';
import Navbar from './components/Navbar';
import SearchBar from './components/SearchBar';
import ProductCard from './components/ProductCard';
import PriceHistoryModal from './components/PriceHistoryModal';
import { deleteProduct, getProductHistory, getProductLogs, getProducts, searchProducts, trackProduct } from './api';

const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`;

export default function App() {
  const [products, setProducts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState([]);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastSynced, setLastSynced] = useState('Never');

  const stats = useMemo(() => {
    const totalTracked = products.length;
    const avgPrice = totalTracked
      ? products.reduce((sum, product) => sum + Number(product.price ?? 0), 0) / totalTracked
      : 0;
    const inStock = products.filter((product) => String(product.stockStatus || '').toLowerCase().includes('in stock')).length;

    return {
      totalTracked,
      avgPrice: formatMoney(avgPrice),
      inStock
    };
  }, [products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getProducts();
      setProducts(data);
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to load tracked products.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleSearch = async (query) => {
    try {
      setSearchLoading(true);
      setError('');
      const results = await searchProducts(query);
      setSearchResults(results);
    } catch (err) {
      setError(err?.response?.data?.error || 'Search failed.');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleTrackResult = async (result) => {
    try {
      setError('');
      const payload = {
        url: result.url,
        targetPrice: Number(result.targetPrice ?? result.price ?? 0)
      };

      if (!payload.url) {
        setError('This result is missing a URL and cannot be tracked.');
        return;
      }

      const saved = await trackProduct(payload);
      const normalized = saved?.product ?? saved;

      if (normalized) {
        setProducts((current) => [normalized, ...current]);
      }

      setSearchResults([]);
      setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to add this product to tracking.');
    }
  };

  const handleDelete = async (id) => {
    try {
      setError('');
      await deleteProduct(id);
      setProducts((current) => current.filter((product) => product.id !== id));
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to delete this product.');
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

  const emptyState = !loading && products.length === 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar lastSynced={lastSynced} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-soft">
            <p className="text-sm text-slate-400">Tracked products</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-bold text-white">{stats.totalTracked}</span>
              <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-xs text-indigo-300">Live</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-soft">
            <p className="text-sm text-slate-400">Average price</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-bold text-white">{stats.avgPrice}</span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">Stable</span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-soft">
            <p className="text-sm text-slate-400">In stock</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-bold text-white">{stats.inStock}</span>
              <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-300">Alert</span>
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-soft sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Automation</p>
              <h2 className="mt-1 text-2xl font-semibold text-white">Track a product</h2>
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

          <SearchBar
            onSearch={handleSearch}
            loading={searchLoading}
            results={searchResults}
            onSelectResult={handleTrackResult}
          />
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
        ) : emptyState ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/60 p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-300">
              <Plus className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-semibold text-white">No tracked products yet</h3>
            <p className="mt-2 text-slate-400">Search for a product above to start monitoring prices.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onDelete={handleDelete}
                onViewHistory={handleViewHistory}
              />
            ))}
          </div>
        )}
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
