import React, { useState, useEffect, useCallback } from 'react';
import { I18nProvider, useTranslation } from './i18n/I18nContext';

const {
  Card, CardContent,
  Badge, Button, Switch, Separator, Skeleton,
  Collapsible, CollapsibleTrigger, CollapsibleContent,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  TooltipProvider,
} = window.UIComponents || {};

const Lucide = window.LucideReact || {};
const Noop = () => null;
const IconDone = Lucide.CheckCircle2 || Lucide.CircleCheckBig || Lucide.Check || Noop;
const IconTodoReq = Lucide.XCircle || Lucide.CircleX || Lucide.AlertCircle || Noop;
const IconTodoRec = Lucide.AlertTriangle || Lucide.TriangleAlert || Lucide.AlertCircle || Noop;
const IconTodoOpt = Lucide.Circle || Noop;
const IconError = Lucide.AlertTriangle || Lucide.TriangleAlert || Noop;
const IconProgress = Lucide.Loader || Lucide.LoaderCircle || Lucide.Clock || Noop;
const IconKebab = Lucide.MoreVertical || Lucide.MoreHorizontal || Noop;
const IconChevron = Lucide.ChevronDown || Noop;
const IconRefresh = Lucide.RefreshCw || Lucide.RotateCw || Noop;
const IconArrow = Lucide.ArrowRight || Lucide.ExternalLink || Noop;
const IconHide = Lucide.EyeOff || Noop;
const IconRestore = Lucide.RotateCcw || Lucide.Undo2 || Noop;
const IconSkipped = Lucide.MinusCircle || Lucide.CircleSlash || Lucide.Circle || Noop;

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function getBaseAdminPath() {
  if (typeof window !== 'undefined' && typeof window.routePrefix === 'string' && window.routePrefix.trim()) {
    return window.routePrefix.replace(/\/$/, '');
  }
  const parts = (window.location.pathname || '').split('/');
  return '/' + (parts[1] || 'admin');
}

async function apiRequest(path, options = {}) {
  const axios = window.axios;
  if (!axios) throw new Error('window.axios is not available');
  const response = await axios({
    url: `${getBaseAdminPath()}${path}`,
    method: options.method || 'GET',
    data: options.data,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  return response.data;
}

/** Build an absolute href for a checkup target (internal path → routePrefix-relative). */
function resolveHref(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${getBaseAdminPath()}${url.startsWith('/') ? '' : '/'}${url}`;
}

// Status → icon + semantic colour. "done" uses the theme primary (blue); blockers use
// destructive; recommended-todo uses amber; optional/skipped stay muted.
const STATUS_META = {
  done: { Icon: IconDone, className: 'text-primary' },
  in_progress: { Icon: IconProgress, className: 'text-amber-500' },
  error: { Icon: IconError, className: 'text-destructive' },
  skipped: { Icon: IconSkipped, className: 'text-muted-foreground' },
};

function statusMeta(item) {
  if (STATUS_META[item.status]) return STATUS_META[item.status];
  if (item.severity === 'required') return { Icon: IconTodoReq, className: 'text-destructive' };
  if (item.severity === 'recommended') return { Icon: IconTodoRec, className: 'text-amber-500' };
  return { Icon: IconTodoOpt, className: 'text-muted-foreground' };
}

const SEVERITY_BADGE = {
  required: 'border-destructive/40 text-destructive',
  recommended: 'border-amber-500/40 text-amber-600 dark:text-amber-500',
  optional: 'border-border text-muted-foreground',
};

// ──────────────────────────────────────────────────────────────────────────────
// Presentational pieces
// ──────────────────────────────────────────────────────────────────────────────

function ProgressBar({ percent, className = '' }) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-muted ${className}`}>
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${pct}%` }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}

function CountChip({ label, done, total }) {
  if (!total) return null;
  const complete = done >= total;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`inline-block size-2 rounded-full ${complete ? 'bg-primary' : 'bg-amber-500'}`} />
      <span className="tabular-nums">{done}/{total}</span> {label}
    </span>
  );
}

// Link that reliably navigates to the target admin page (plain anchor → full navigation;
// settings-manager reads the #KEY hash on mount to select/scroll to the setting).
function GoToSetupLink({ target, label }) {
  const href = resolveHref(target.url);
  if (!href) return null;
  return (
    <a
      href={href}
      target={target.openInNewTab ? '_blank' : undefined}
      rel={target.openInNewTab ? 'noreferrer' : undefined}
      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-border px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
    >
      {label}
      <IconArrow className="size-3.5" />
    </a>
  );
}

function CheckupRow({ item, t, onDismiss, onRestore, busy }) {
  const { Icon, className } = statusMeta(item);
  const isSkipped = item.dismissed || item.status === 'skipped';

  return (
    <div className="flex items-start gap-3 py-3">
      <Icon className={`size-5 shrink-0 mt-0.5 ${className} ${item.status === 'in_progress' ? 'animate-pulse' : ''}`} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`text-sm font-medium ${isSkipped ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
            {item.title}
          </span>
          <Badge variant="outline" className={`text-[10px] font-normal ${SEVERITY_BADGE[item.severity] || ''}`}>
            {t(item.severity === 'required' ? 'Required' : item.severity === 'recommended' ? 'Recommended' : 'Optional')}
          </Badge>
          {item.progress && item.progress.total > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {t('{done} of {total}', { done: item.progress.done, total: item.progress.total })}
            </span>
          )}
          {item.status === 'error' && (
            <span className="text-xs text-destructive">{t('Could not check')}</span>
          )}
        </div>
        {item.description && <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>}
        {item.detail && (
          <p className="mt-1 truncate text-xs text-foreground/70" title={item.detail}>
            {item.detail}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {item.target && !isSkipped && (
          <GoToSetupLink target={item.target} label={item.target.label || t('Go to setup')} />
        )}

        {isSkipped && (
          <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" disabled={busy}
            onClick={() => onRestore(item.key)}>
            <IconRestore className="size-3.5" />
            {t('Restore')}
          </Button>
        )}

        {item.dismissible && !isSkipped && DropdownMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="size-8" disabled={busy} aria-label={t('Hide')}>
                <IconKebab className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onDismiss(item.key)}>
                <IconHide className="mr-2 size-4" />
                {t('Hide')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDismiss(item.key, 7)}>
                {t('Snooze for 7 days')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

function GroupCard({ group, t, showHidden, onDismiss, onRestore, busy }) {
  const [open, setOpen] = useState(!group.ready);
  const items = showHidden ? group.items : group.items.filter((i) => !(i.dismissed || i.status === 'skipped'));
  if (items.length === 0) return null;

  return (
    <Card className="overflow-hidden py-0 gap-0">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50">
            <IconChevron className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-foreground">{group.title}</span>
                {group.ready && <IconDone className="size-4 text-primary" />}
              </div>
              {group.description && <p className="text-xs text-muted-foreground">{group.description}</p>}
            </div>
            <div className="hidden w-40 items-center gap-2 sm:flex">
              <ProgressBar percent={group.progressPercent} />
              <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{group.progressPercent}%</span>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Separator />
          <div className="divide-y divide-border px-4">
            {items.map((item) => (
              <CheckupRow key={item.key} item={item} t={t} onDismiss={onDismiss} onRestore={onRestore} busy={busy} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Content
// ──────────────────────────────────────────────────────────────────────────────

function SetupChecklistContent() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchStatus = useCallback(async () => {
    setError(null);
    try {
      const data = await apiRequest('/core/setup-checklist/status');
      setStatus(data);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Re-check live whenever the operator comes back to the checklist (after filling a
    // setting in another tab/page). `visibilitychange` is more reliable than `focus`
    // across tab switches and SPA returns; `pageshow` covers bfcache restores.
    const refetch = () => fetchStatus();
    const onVisible = () => { if (document.visibilityState === 'visible') fetchStatus(); };
    window.addEventListener('focus', refetch);
    window.addEventListener('pageshow', refetch);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', refetch);
      window.removeEventListener('pageshow', refetch);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchStatus]);

  const onDismiss = useCallback(async (key, snoozeDays) => {
    setBusy(true);
    try {
      await apiRequest('/core/setup-checklist/dismiss', { method: 'POST', data: { key, snoozeDays } });
      await fetchStatus();
      window.sonner?.toast?.success?.(t('Hidden'));
    } catch (e) {
      window.sonner?.toast?.error?.(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [fetchStatus, t]);

  const onRestore = useCallback(async (key) => {
    setBusy(true);
    try {
      await apiRequest('/core/setup-checklist/restore', { method: 'POST', data: { key } });
      await fetchStatus();
    } catch (e) {
      window.sonner?.toast?.error?.(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [fetchStatus]);

  const requiredLeft = status ? status.counts.required.total - status.counts.required.done : 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{t('Finish the setup')}</h1>
            <p className="text-sm text-muted-foreground">{t('Complete these steps to get your store ready.')}</p>
          </div>
          <Button size="sm" variant="outline" className="gap-1" onClick={fetchStatus} disabled={loading || busy}>
            <IconRefresh className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            {t('Refresh')}
          </Button>
        </div>

        {status && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <ProgressBar percent={status.progressPercent} />
              <span className="w-10 text-right text-sm font-medium tabular-nums">{status.progressPercent}%</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {status.overallReady ? (
                <Badge className="bg-primary text-primary-foreground hover:bg-primary">{t('Ready to go')}</Badge>
              ) : (
                <Badge variant="outline" className="border-destructive/40 text-destructive">
                  {t('{count} required steps left', { count: requiredLeft })}
                </Badge>
              )}
              <CountChip label={t('Required')} done={status.counts.required.done} total={status.counts.required.total} />
              <CountChip label={t('Recommended')} done={status.counts.recommended.done} total={status.counts.recommended.total} />
              <CountChip label={t('Optional')} done={status.counts.optional.done} total={status.counts.optional.total} />
              <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                {Switch && <Switch checked={showHidden} onCheckedChange={setShowHidden} />}
                {t('Show hidden')}
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      {loading && !status && (
        <div className="space-y-6">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="flex items-center justify-between gap-3 py-4">
            <span className="text-sm text-destructive">{t('Failed to load the checklist')}: {error}</span>
            <Button size="sm" variant="outline" onClick={fetchStatus}>{t('Try again')}</Button>
          </CardContent>
        </Card>
      )}

      {status && status.groups.length === 0 && !error && (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">{t('No checkups yet')}</CardContent></Card>
      )}

      {status && status.groups.map((group) => (
        <GroupCard
          key={group.key}
          group={group}
          t={t}
          showHidden={showHidden}
          onDismiss={onDismiss}
          onRestore={onRestore}
          busy={busy}
        />
      ))}
    </div>
  );
}

export default function SetupChecklist(props) {
  let pageProps = props || {};
  try {
    const usePage = window.InertiajsReact?.usePage;
    if (typeof usePage === 'function') {
      const fromPage = usePage()?.props || {};
      pageProps = { locale: props?.locale ?? fromPage.locale, messages: props?.messages ?? fromPage.messages };
    }
  } catch (_e) { /* usePage unavailable — fall back to props */ }

  const Wrapper = TooltipProvider || React.Fragment;
  return (
    <I18nProvider initialLocale={pageProps.locale || 'en'} messages={pageProps.messages || null}>
      <Wrapper>
        <SetupChecklistContent />
      </Wrapper>
    </I18nProvider>
  );
}
