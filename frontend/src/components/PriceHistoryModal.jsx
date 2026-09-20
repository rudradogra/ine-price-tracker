import { CheckCircle2, CircleAlert, Loader2, X } from 'lucide-react';

export default function PriceHistoryModal({ product, history, logs, loading, onClose }) {
  if (!product) return null;

  const trend = history.length > 1 ? history.slice(-8) : history;
  const values = trend.map((entry) => Number(entry.price ?? 0));
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-900 shadow-soft">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Price history</p>
            <h3 className="text-xl font-semibold text-white">{product.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 p-2 text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-5">
          {loading && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading history and scrape logs...
            </div>
          )}

          <div className="mb-4 flex items-end gap-2">
            {trend.length === 0 ? (
              <div className="w-full rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-center text-sm text-slate-400">
                No price history is available yet.
              </div>
            ) : (
              trend.map((entry, index) => {
                const height = ((Number(entry.price ?? 0) - minValue) / Math.max(maxValue - minValue, 1)) * 100;

                return (
                  <div key={`${entry.id || index}-bar`} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-24 w-full items-end justify-center rounded-t-xl bg-gradient-to-t from-indigo-500/70 to-violet-400/30 p-1">
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-indigo-500 to-violet-400"
                        style={{ height: `${Math.max(18, height)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(entry.timestamp || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <h4 className="mb-3 text-sm font-medium text-slate-300">Scrape log</h4>
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-sm text-slate-400">No scrape attempts recorded yet.</p>
              ) : (
                logs.slice(0, 8).map((log, index) => {
                  const succeeded = String(log.status || '').toUpperCase() === 'SUCCESS';
                  return (
                    <div key={`${log.id || index}-log`} className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
                      <div className="flex min-w-0 items-start gap-2">
                        {succeeded ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">{log.status || 'UNKNOWN'}</p>
                          <p className="truncate text-xs text-slate-400">{log.error_message || 'No error recorded'}</p>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-slate-500">{new Date(log.timestamp || Date.now()).toLocaleString()}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <h4 className="mb-3 text-sm font-medium text-slate-300">History list</h4>
            <div className="space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-slate-400">No historical data available yet.</p>
              ) : (
                [...history].reverse().slice(0, 6).map((entry, index) => (
                  <div key={`${entry.id || index}-row`} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
                    <span className="text-sm text-slate-300">
                      {new Date(entry.timestamp || Date.now()).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                    <span className="font-semibold text-white">${Number(entry.price ?? 0).toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
