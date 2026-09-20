import { Activity, BellDot, Globe } from 'lucide-react';

export default function Navbar({ lastSynced }) {
  return (
    <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-soft">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Insights</p>
            <h1 className="text-xl font-semibold text-white">Price Tracker</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-slate-300">
          <div className="hidden items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-2 md:flex">
            <Globe className="h-4 w-4 text-emerald-400" />
            <span>Live feed</span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-2">
            <BellDot className="h-4 w-4 text-amber-400" />
            <span>Last synced</span>
            <span className="font-medium text-white">{lastSynced || 'Just now'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
