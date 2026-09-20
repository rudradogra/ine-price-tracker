import { CircleDollarSign, Loader2, PackageCheck, Star, Trash2 } from 'lucide-react';

export default function ProductCard({ product, tracked, onTrack, onUntrack, onDelete, onViewHistory, onCheckPrice, checking, tracking }) {
  const price = Number(product.price ?? 0);
  const stockStatus = product.stockStatus || 'In Stock';

  return (
    <div className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-soft transition hover:-translate-y-1 hover:border-indigo-500/50">
      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {tracked && onUntrack ? (
                <button
                  type="button"
                  onClick={() => onUntrack(product)}
                  className="rounded-md p-1 text-amber-400 transition hover:bg-amber-400/10 hover:text-amber-300"
                  aria-label={`Unstar ${product.name}`}
                  title="Unstar product"
                >
                  <Star className="h-4 w-4 fill-current" />
                </button>
              ) : tracked && (
                <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" aria-label="Starred product" />
              )}
              <h3 className="line-clamp-2 text-base font-semibold text-white">{product.name}</h3>
            </div>
            <p className="mt-1 text-xs text-slate-400">{product.category || 'Consumer electronics'}</p>
          </div>
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(product.id)}
              className="rounded-xl border border-slate-700 p-2 text-slate-300 transition hover:border-red-500 hover:text-red-400"
              aria-label={`Delete ${product.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between rounded-xl bg-slate-950/70 p-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Current price</p>
            <div className="mt-1 flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-xl font-bold text-white">{price ? `$${price.toFixed(2)}` : 'Not checked'}</span>
            </div>
          </div>

        </div>

        <div className="flex items-center gap-2 text-sm text-slate-300">
          <div className="flex items-center gap-2 text-slate-300">
            <PackageCheck className={`h-4 w-4 ${stockStatus.toLowerCase().includes('in stock') ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="truncate">{price ? stockStatus : 'Awaiting check'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {!tracked && onTrack && (
            <button
              type="button"
              onClick={() => onTrack(product)}
              disabled={tracking}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-wait disabled:opacity-60"
              aria-label={`Star ${product.name} to track it`}
            >
              {tracking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
              {tracking ? 'Saving...' : 'Star to track'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onCheckPrice(product)}
            disabled={checking}
            className={`inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-wait disabled:opacity-60 ${!tracked && onTrack ? '' : 'col-span-2'}`}
          >
            {checking && <Loader2 className="h-4 w-4 animate-spin" />}
            {checking ? 'Checking...' : 'Check price'}
          </button>
          {tracked && (
            <button
              type="button"
              onClick={() => onViewHistory(product)}
              className="col-span-2 rounded-xl border border-indigo-500/50 bg-indigo-500/10 px-3 py-2 text-sm font-medium text-indigo-200 transition hover:bg-indigo-500/20"
            >
              History
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Last checked: {product.lastChecked ? new Date(product.lastChecked).toLocaleString() : 'Never'}
        </p>
      </div>
    </div>
  );
}
