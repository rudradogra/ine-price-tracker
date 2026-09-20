import { ArrowDownRight, ArrowUpRight, CircleDollarSign, PackageCheck, Trash2, TrendingUp } from 'lucide-react';

export default function ProductCard({ product, onDelete, onViewHistory }) {
  const change = Number(product.change ?? product.priceChange ?? 0);
  const trendPositive = change >= 0;
  const price = Number(product.price ?? 0);
  const targetPrice = Number(product.targetPrice ?? product.price ?? 0);
  const stockStatus = product.stockStatus || 'In Stock';

  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-soft transition hover:-translate-y-1 hover:border-indigo-500/50">
      <div className="h-40 overflow-hidden bg-slate-950">
        <img
          src={product.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80'}
          alt={product.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="line-clamp-2 text-base font-semibold text-white">{product.name}</h3>
            <p className="mt-1 text-xs text-slate-400">{product.category || 'Consumer electronics'}</p>
          </div>
          <button
            type="button"
            onClick={() => onDelete(product.id)}
            className="rounded-xl border border-slate-700 p-2 text-slate-300 transition hover:border-red-500 hover:text-red-400"
            aria-label={`Delete ${product.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-950/70 p-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Current price</p>
            <div className="mt-1 flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-xl font-bold text-white">${price.toFixed(2)}</span>
            </div>
          </div>

          <div className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${trendPositive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}>
            {trendPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(change).toFixed(2)}%
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <PackageCheck className={`h-4 w-4 ${stockStatus.toLowerCase().includes('in stock') ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="truncate">{stockStatus}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <TrendingUp className="h-4 w-4 text-indigo-400" />
            <span>Target ${targetPrice.toFixed(2)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onViewHistory(product)}
          className="w-full rounded-xl border border-indigo-500/50 bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-200 transition hover:bg-indigo-500/20"
        >
          View history
        </button>
      </div>
    </div>
  );
}
