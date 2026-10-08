import React, { useCallback, useEffect, useState } from 'react';
import { requireAdminApi } from './lib/admin-api';

/**
 * Setup checklist dashboard tile, shaped like Adminizer's built-in info widgets:
 * 1×1, name and caption on top, value and icon at the bottom.
 * The background is the status: red until every required item is done, green at 100 %.
 *
 * Styling rules:
 * - Only Tailwind utilities that Adminizer's own info tile uses. This bundle is not scanned by
 *   Adminizer's Tailwind build, so any other utility would silently be missing from its CSS.
 * - Colours and geometry go through inline styles for the same reason.
 *
 * Text: every string comes from GET /core/setup-checklist/summary, already translated on the
 * server (core `lib/adminpanel/i18n/locales`). The dashboard gives custom widgets no i18n context.
 */

const BACKGROUND = {
  incomplete: '#dc2626',
  ready: '#15803d',
};

// Adminizer wraps a custom widget in a 1px-bordered box, its info tiles have no border.
// Spreading the tile 1px over that border makes it look like its built-in neighbours.
const COVER_WRAPPER_BORDER = { margin: -1, width: 'calc(100% + 2px)', height: 'calc(100% + 2px)' };

function adminPath(path) {
  const prefix = (window.routePrefix || '/admin').replace(/\/$/, '');
  return `${prefix}${path}`;
}

/** Same icon markup as Adminizer's info tiles (Material Icons, outlined). */
function MaterialIcon({ name, className = '', size }) {
  return (
    <span className={`material-icons-outlined ${className}`} style={size ? { fontSize: size } : undefined}>
      {name}
    </span>
  );
}

/**
 * Counter for the caption. The server sends it translated; the fallback counts the same items
 * as `progressPercent`: required ones, or recommended ones when a set has no required items.
 */
function counterLabel(summary) {
  if (summary.labels?.checked) return summary.labels.checked;
  const { required, recommended } = summary.counts;
  const scale = required.total > 0 ? required : recommended;
  return `${scale.done}/${scale.total}`;
}

export default function SetupChecklistWidget() {
  const [summary, setSummary] = useState(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const response = await requireAdminApi().get(adminPath('/core/setup-checklist/summary'));
      setSummary(response.data);
    } catch (_error) {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [load]);

  if (!summary) {
    // Same spinner size and colour as the placeholder Adminizer shows while it loads the module.
    if (!failed) return <MaterialIcon name="autorenew" className="animate-spin text-neutral-500" size={40} />;
    return (
      <button
        type="button"
        onClick={load}
        aria-label="Retry"
        className="flex justify-center items-center w-full h-full cursor-pointer text-neutral-500"
      >
        <MaterialIcon name="refresh" size={40} />
      </button>
    );
  }

  const { labels } = summary;
  const percent = summary.progressPercent;
  const ready = percent >= 100;
  const status = ready ? labels.ready : labels.incomplete;
  const counter = counterLabel(summary);

  return (
    <a
      href={adminPath('/setup-checklist')}
      title={`${labels.title}: ${status}`}
      aria-label={`${labels.title}: ${status}, ${percent}%, ${counter}`}
      className="relative block transition rounded-md cursor-pointer hover:brightness-110"
      style={{ ...COVER_WRAPPER_BORDER, backgroundColor: ready ? BACKGROUND.ready : BACKGROUND.incomplete }}
    >
      <div className="text-amber-50 flex flex-col justify-between gap-2.5 p-3 w-full h-full">
        {/* A 1×1 cell is ~140×131 px. Long translations may only clip the text block,
            never push the percentage row out; the counter stays on one line. */}
        <div className="min-w-0 overflow-hidden" style={{ minHeight: 0 }}>
          <span className="font-bold">{labels.title}</span>
          <p className="text-sm truncate">{counter}</p>
        </div>
        <div className="flex items-end justify-between gap-5 shrink-0">
          <div>{percent}%</div>
          <span className="admin-widgets__icon">
            <MaterialIcon name={ready ? 'check_circle' : 'checklist'} />
          </span>
        </div>
      </div>
    </a>
  );
}
