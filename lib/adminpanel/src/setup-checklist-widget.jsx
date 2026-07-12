import React, { useCallback, useEffect, useMemo, useState } from 'react';

const Lucide = window.LucideReact || {};
const Check = Lucide.CheckCircle2 || Lucide.Check || (() => null);
const Alert = Lucide.CircleAlert || Lucide.AlertCircle || (() => null);
const Arrow = Lucide.ArrowRight || (() => null);
const Refresh = Lucide.RefreshCw || (() => null);

function adminPath(path) {
  const prefix = (window.routePrefix || '/admin').replace(/\/$/, '');
  return `${prefix}${path}`;
}

export default function SetupChecklistWidget() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await window.adminApi.get(adminPath('/core/setup-checklist/summary'));
      setSummary(response.data);
    } catch (_error) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [load]);

  const totals = useMemo(() => {
    if (!summary) return { done: 0, total: 0 };
    return ['required', 'recommended', 'optional'].reduce((acc, key) => ({
      done: acc.done + summary.counts[key].done,
      total: acc.total + summary.counts[key].total,
    }), { done: 0, total: 0 });
  }, [summary]);

  if (!summary) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl bg-card p-6 text-muted-foreground">
        {error ? (
          <button type="button" className="inline-flex items-center gap-2 text-sm" onClick={load}>
            <Refresh className="size-4" /> Retry
          </button>
        ) : <Refresh className="size-6 animate-spin" />}
      </div>
    );
  }

  const StateIcon = summary.overallReady ? Check : Alert;
  const stateClass = summary.overallReady ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400';

  return (
    <a href={adminPath('/setup-checklist')} className="group flex h-full w-full flex-col justify-between gap-5 rounded-xl bg-card p-5 text-card-foreground transition-colors hover:bg-muted/50">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{summary.labels.title}</p>
          <div className={`mt-2 flex items-center gap-2 ${stateClass}`}>
            <StateIcon className="size-5 shrink-0" />
            <span className="text-base font-semibold">{summary.overallReady ? summary.labels.ready : summary.labels.incomplete}</span>
          </div>
        </div>
        <span className="text-2xl font-semibold tabular-nums">{summary.progressPercent}%</span>
      </div>

      <div className="space-y-2.5">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${summary.progressPercent}%` }} />
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{summary.labels.checked || `${totals.done}/${totals.total}`}</span>
          <span className="inline-flex items-center gap-1 font-medium text-primary">
            {summary.labels.open}<Arrow className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </a>
  );
}
