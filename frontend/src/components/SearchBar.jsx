import { Loader2, Search, Sparkles } from 'lucide-react';
import { useState } from 'react';

export default function SearchBar({ onSearch, loading, results, onSelectResult }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearch(query);
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-3 shadow-soft transition focus-within:border-indigo-500">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product to track..."
            className="w-full bg-transparent text-base text-white placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {loading && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-sm text-indigo-200">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching the live catalog...
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-3 shadow-soft">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
            <Sparkles className="h-4 w-4 text-violet-400" />
            Search results
          </div>

          <div className="space-y-2">
            {results.map((result, index) => (
              <button
                key={`${result.url || result.name}-${index}`}
                type="button"
                onClick={() => onSelectResult(result)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-left transition hover:border-indigo-500/60 hover:bg-slate-800/80"
              >
                <div className="min-w-0 pr-3">
                  <div className="truncate font-medium text-white">{result.name}</div>
                  <div className="truncate text-xs text-slate-400">{result.url}</div>
                </div>
                <span className="shrink-0 rounded-lg bg-indigo-500/10 px-2 py-1 text-xs text-indigo-300">Track</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
