import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, Search } from 'lucide-react';
import Navbar from './components/Navbar';
import ProductCard from './components/ProductCard';
import PriceHistoryModal from './components/PriceHistoryModal';
import { checkStoreProduct, getProductHistory, getProductLogs, getStoreProducts } from './api';

export default function App() {
  const [products, setProducts] = useState([]);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState([]);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [checkingId, setCheckingId] = useState(null);
  const [error, setError] = useState('');
  const [lastSynced, setLastSynced] = useState('Never');

  const stats = useMemo(() => {
    return { totalTracked: products.length };
  }, [products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getStoreProducts();
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

  const handleCheckPrice = async (product) => {
    try {
      setCheckingId(product.id);
      setError('');
      const result = await checkStoreProduct(product.url);
      setProducts((current) => current.map((item) => item.id === product.id
        ? { ...item, price: result.price, stockStatus: result.stockStatus, lastChecked: result.checkedAt }
        : item));
      setLastSynced(new Date(result.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.details || 'Price check failed.');
    } finally {
      setCheckingId(null);
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

  const visibleProducts = products.filter((product) => `${product.name} ${product.brand} ${product.category}`
    .toLowerCase()
    .includes(catalogQuery.trim().toLowerCase()));
  const emptyState = !loading && visibleProducts.length === 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar lastSynced={lastSynced} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 grid gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-soft">
            <p className="text-sm text-slate-400">Tracked products</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-bold text-white">{stats.totalTracked}</span>
              <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-xs text-indigo-300">Catalog</span>
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
                onViewHistory={handleViewHistory}
                onCheckPrice={handleCheckPrice}
                checking={checkingId === product.id}
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
