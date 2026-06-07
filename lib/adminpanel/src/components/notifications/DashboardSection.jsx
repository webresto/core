import React, { useEffect, useMemo, useState } from 'react';
import { styles, notificationsApi, COST_NUM_STYLE } from './shared';

const { Button } = window.UIComponents;

// Distinct, theme-agnostic palette for channels (cycled if there are more channels than colors).
const CHANNEL_COLORS = ['#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#ec4899', '#14b8a6', '#a855f7', '#ef4444'];

// Status → badge color, aligned with the channels view in notifications-manager.jsx.
const STATUS_COLORS = {
  sent: '#16a34a',
  read: '#0ea5e9',
  pending: '#d97706',
  failed: '#dc2626',
  cancelled: '#64748b',
};

const RANGE_OPTIONS = [
  { days: 7, key: '7 days' },
  { days: 30, key: '30 days' },
  { days: 90, key: '90 days' },
];

const PLOT_HEIGHT = 200;

// Compact number formatting for axis/labels (1.2k, 3.4M).
function formatCount(value, language) {
  const n = Number(value) || 0;
  try {
    return new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  } catch {
    return String(n);
  }
}

function formatCost(value, language) {
  const n = Number(value) || 0;
  try {
    return new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(n);
  } catch {
    return n.toFixed(2);
  }
}

function formatDayLabel(dateStr, language) {
  const parts = String(dateStr || '').split('-');
  if (parts.length !== 3) return dateStr || '';
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(d.getTime())) return dateStr;
  try {
    return new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric' }).format(d);
  } catch {
    return `${parts[2]}.${parts[1]}`;
  }
}

function formatFullDate(dateStr, language) {
  const parts = String(dateStr || '').split('-');
  if (parts.length !== 3) return dateStr || '';
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(d.getTime())) return dateStr;
  try {
    return new Intl.DateTimeFormat(language, { weekday: 'short', month: 'short', day: 'numeric' }).format(d);
  } catch {
    return dateStr;
  }
}

// Summary metric tile.
function StatCard({ label, value, hint }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 14, background: 'var(--card)', padding: 18, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</span>
      <strong style={{ fontSize: 28, lineHeight: '32px', ...COST_NUM_STYLE }}>{value}</strong>
      {hint ? <span style={styles.help}>{hint}</span> : null}
    </div>
  );
}

// Horizontal bar list — one row per channel, bar width proportional to its count.
function ChannelBars({ channels, channelLabel, colorForType, t, language }) {
  const maxCount = useMemo(() => channels.reduce((max, c) => Math.max(max, c.count || 0), 0), [channels]);
  if (channels.length === 0) {
    return <div style={styles.help}>{t('No channel activity in this period')}</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {channels.map((channel) => {
        const pct = maxCount > 0 ? Math.max((channel.count / maxCount) * 100, 2) : 0;
        const color = colorForType(channel.type);
        return (
          <div key={channel.type} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, minWidth: 0 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flex: 'none' }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channelLabel(channel.type)}</span>
              </span>
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', ...COST_NUM_STYLE }}>
                {formatCount(channel.count, language)} · {t('Cost')} {formatCost(channel.cost, language)}
              </span>
            </div>
            <div style={{ height: 10, borderRadius: 6, background: 'var(--muted)', overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', borderRadius: 6, background: color, transition: 'width .3s ease' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Stacked time-series chart: X = days, Y = absolute value (count or cost), each day's bar
 * split into per-channel segments ("which channel contributes what + the total"). A legend
 * on the right toggles channels in/out of the stack; hovering a day shows a tooltip with the
 * per-channel breakdown and the day's total. Pure SVG/CSS — no charting dependency.
 */
function StackedTrendChart({ title, description, series, channels, field, colorForType, channelLabel, formatValue, t, language, hidden, onToggleChannel }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const visibleChannels = useMemo(() => channels.filter((c) => !hidden.has(c.type)), [channels, hidden]);

  // Per-day visible total + max, used for bar scaling.
  const dayTotals = useMemo(
    () => series.map((point) => visibleChannels.reduce((sum, c) => sum + (Number(point?.[field]?.[c.type]) || 0), 0)),
    [series, visibleChannels, field],
  );
  const maxTotal = useMemo(() => dayTotals.reduce((max, v) => Math.max(max, v), 0), [dayTotals]);
  const hasData = maxTotal > 0;

  // Legend totals (over the whole range), per channel — shown even for hidden channels.
  const channelTotals = useMemo(() => {
    const totals = {};
    for (const c of channels) {
      totals[c.type] = series.reduce((sum, point) => sum + (Number(point?.[field]?.[c.type]) || 0), 0);
    }
    return totals;
  }, [channels, series, field]);

  const labelEvery = series.length > 31 ? 7 : series.length > 14 ? 3 : 1;

  const hoverPoint = hoverIndex != null ? series[hoverIndex] : null;
  const hoverTotal = hoverIndex != null ? dayTotals[hoverIndex] : 0;

  return (
    <section style={styles.panel}>
      <div>
        <h3 style={styles.subsectionTitle}>{title}</h3>
        {description ? <p style={styles.help}>{description}</p> : null}
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'stretch', flexWrap: 'wrap' }}>
        {/* Plot */}
        <div style={{ flex: '1 1 360px', minWidth: 280, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {!hasData ? (
            <div style={{ ...styles.help, height: PLOT_HEIGHT, display: 'flex', alignItems: 'center' }}>{t('No notifications in this period')}</div>
          ) : (
            <>
              <div style={{ position: 'relative', height: PLOT_HEIGHT }} onMouseLeave={() => setHoverIndex(null)}>
                {/* Bars */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: series.length > 45 ? 1 : 3, height: '100%' }}>
                  {series.map((point, index) => {
                    const total = dayTotals[index];
                    const colPct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                    const active = hoverIndex === index;
                    return (
                      <div
                        key={point.date}
                        onMouseEnter={() => setHoverIndex(index)}
                        style={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', cursor: 'default' }}
                      >
                        {/* Stack column (channels bottom-up via column-reverse) */}
                        <div style={{ width: '100%', maxWidth: 28, height: `${colPct}%`, display: 'flex', flexDirection: 'column-reverse', borderRadius: '4px 4px 0 0', overflow: 'hidden', outline: active ? '2px solid var(--ring, #94a3b8)' : 'none', opacity: hoverIndex == null || active ? 1 : 0.55, transition: 'opacity .15s ease' }}>
                          {visibleChannels.map((c) => {
                            const value = Number(point?.[field]?.[c.type]) || 0;
                            if (value <= 0) return null;
                            const segPct = total > 0 ? (value / total) * 100 : 0;
                            return <div key={c.type} style={{ height: `${segPct}%`, background: colorForType(c.type) }} />;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Y max marker */}
                <span style={{ position: 'absolute', top: 0, left: 0, fontSize: 10, color: 'var(--muted-foreground)', background: 'var(--card)', padding: '0 2px', ...COST_NUM_STYLE }}>
                  {formatValue(maxTotal, language)}
                </span>

                {/* Hover tooltip */}
                {hoverPoint && hoverTotal > 0 && (
                  <div
                    style={{
                      position: 'absolute', top: 4, zIndex: 10, pointerEvents: 'none',
                      left: `${((hoverIndex + 0.5) / series.length) * 100}%`,
                      transform: `translateX(${hoverIndex < series.length * 0.25 ? '0' : hoverIndex > series.length * 0.75 ? '-100%' : '-50%'})`,
                      background: 'var(--popover, var(--card))', color: 'var(--foreground)',
                      border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 10px 24px rgba(0,0,0,0.18)',
                      padding: '8px 10px', minWidth: 150, fontSize: 12,
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{formatFullDate(hoverPoint.date, language)}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {visibleChannels.map((c) => {
                        const value = Number(hoverPoint?.[field]?.[c.type]) || 0;
                        if (value <= 0) return null;
                        return (
                          <div key={c.type} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                              <span style={{ width: 9, height: 9, borderRadius: 2, background: colorForType(c.type), flex: 'none' }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channelLabel(c.type)}</span>
                            </span>
                            <strong style={COST_NUM_STYLE}>{formatValue(value, language)}</strong>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)', fontWeight: 700 }}>
                      <span>{t('Total')}</span>
                      <span style={COST_NUM_STYLE}>{formatValue(hoverTotal, language)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* X axis labels */}
              <div style={{ display: 'flex', gap: series.length > 45 ? 1 : 3 }}>
                {series.map((point, index) => (
                  <div key={point.date} style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 10, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {index % labelEvery === 0 ? formatDayLabel(point.date, language) : ''}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Legend (right) — click a channel to toggle it in the stack */}
        <div style={{ flex: '0 0 190px', minWidth: 170, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: 0.4 }}>{t('Channels')}</span>
          {channels.length === 0 ? (
            <span style={styles.help}>{t('No channel activity in this period')}</span>
          ) : channels.map((c) => {
            const isHidden = hidden.has(c.type);
            return (
              <button
                key={c.type}
                type="button"
                onClick={() => onToggleChannel(c.type)}
                title={t('Toggle channel')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between',
                  border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px',
                  background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer',
                  opacity: isHidden ? 0.45 : 1, textAlign: 'left',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ width: 11, height: 11, borderRadius: 3, background: colorForType(c.type), flex: 'none', boxShadow: isHidden ? 'inset 0 0 0 99px var(--muted)' : 'none' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: isHidden ? 'line-through' : 'none' }}>
                    {channelLabel(c.type)}
                  </span>
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', ...COST_NUM_STYLE }}>
                  {formatValue(channelTotals[c.type] || 0, language)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Status breakdown as a single proportional stacked bar + legend.
function StatusBar({ statuses, total, statusLabel, t }) {
  if (statuses.length === 0 || total === 0) {
    return <div style={styles.help}>{t('No notifications in this period')}</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', background: 'var(--muted)' }}>
        {statuses.map((s) => {
          const pct = total > 0 ? (s.count / total) * 100 : 0;
          if (pct <= 0) return null;
          return (
            <div
              key={s.status}
              title={`${statusLabel(s.status)}: ${s.count}`}
              style={{ width: `${pct}%`, background: STATUS_COLORS[s.status] || '#94a3b8' }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {statuses.map((s) => (
          <span key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted-foreground)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_COLORS[s.status] || '#94a3b8' }} />
            <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{statusLabel(s.status)}</span>
            <span style={COST_NUM_STYLE}>{s.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Dashboard section (Activity overview) — visualizes notification volume and spend:
 * summary tiles, per-channel bars, status breakdown, and stacked-by-channel trend charts
 * (volume + cost) over a selectable range. Data comes from /core/notifications-manager/stats.
 */
export default function DashboardSection({ t, language, channelLabel, statusLabel }) {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hiddenChannels, setHiddenChannels] = useState(() => new Set());

  const loadStats = async (rangeDays) => {
    setLoading(true);
    setError('');
    try {
      const response = await notificationsApi(`/core/notifications-manager/stats?days=${encodeURIComponent(rangeDays)}`);
      if (!response.ok) throw new Error(response.payload?.error || 'Failed to load stats');
      setStats(response.payload || null);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const summary = stats?.summary || { totalNotifications: 0, totalCost: 0, avgCost: 0, capped: false };
  const channels = Array.isArray(stats?.channels) ? stats.channels : [];
  const series = Array.isArray(stats?.series) ? stats.series : [];
  const statuses = Array.isArray(stats?.statuses) ? stats.statuses : [];

  // Stable channel → color map, shared across every chart and legend.
  const colorForType = useMemo(() => {
    const order = channels.map((c) => c.type);
    return (type) => {
      const idx = order.indexOf(type);
      return CHANNEL_COLORS[(idx < 0 ? 0 : idx) % CHANNEL_COLORS.length];
    };
  }, [channels]);

  const toggleChannel = (type) => {
    setHiddenChannels((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section style={styles.panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <h2 style={styles.sectionTitle}>{t('Dashboard')}</h2>
            <p style={styles.sectionDescription}>{t('Notification volume and delivery cost by channel over time.')}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', gap: 4, padding: 4, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--muted)' }}>
              {RANGE_OPTIONS.map((option) => {
                const active = option.days === days;
                return (
                  <button
                    key={option.days}
                    type="button"
                    onClick={() => setDays(option.days)}
                    style={{
                      border: '1px solid transparent', borderRadius: 9,
                      background: active ? 'var(--card)' : 'transparent',
                      color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
                      padding: '6px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    {t(option.key)}
                  </button>
                );
              })}
            </div>
            <Button variant="outline" size="sm" onClick={() => loadStats(days)} disabled={loading}>
              {loading ? t('Refreshing...') : t('Refresh')}
            </Button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--destructive)', color: '#fff', opacity: 0.9 }}>{error}</div>
        )}

        {summary.capped && (
          <div style={{ ...styles.help, color: '#d97706' }}>{t('Showing a capped sample of the most recent notifications.')}</div>
        )}

        {/* Summary tiles */}
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
          <StatCard label={t('Total notifications')} value={formatCount(summary.totalNotifications, language)} />
          <StatCard label={t('Total cost')} value={formatCost(summary.totalCost, language)} hint={t('Sum of delivery cost across all channels')} />
          <StatCard label={t('Average cost')} value={formatCost(summary.avgCost, language)} hint={t('Per notification')} />
          <StatCard label={t('Channels used')} value={formatCount(channels.length, language)} />
        </div>
      </section>

      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(min(360px, 100%), 1fr))', alignItems: 'start' }}>
        {/* Channels chart */}
        <section style={styles.panel}>
          <div>
            <h3 style={styles.subsectionTitle}>{t('Notifications by channel')}</h3>
            <p style={styles.help}>{t('How many notifications used each channel and their accumulated cost.')}</p>
          </div>
          <ChannelBars channels={channels} channelLabel={channelLabel} colorForType={colorForType} t={t} language={language} />
        </section>

        {/* Status breakdown */}
        <section style={styles.panel}>
          <div>
            <h3 style={styles.subsectionTitle}>{t('By status')}</h3>
            <p style={styles.help}>{t('Delivery status distribution for the selected period.')}</p>
          </div>
          <StatusBar statuses={statuses} total={summary.totalNotifications} statusLabel={statusLabel} t={t} />
        </section>
      </div>

      {/* Stacked trend — volume */}
      <StackedTrendChart
        title={t('Notifications over time')}
        description={t('Notifications sent per day, stacked by channel. Hover a day for the breakdown.')}
        series={series}
        channels={channels}
        field="channelCounts"
        colorForType={colorForType}
        channelLabel={channelLabel}
        formatValue={formatCount}
        t={t}
        language={language}
        hidden={hiddenChannels}
        onToggleChannel={toggleChannel}
      />

      {/* Stacked trend — cost */}
      <StackedTrendChart
        title={t('Delivery cost over time')}
        description={t('Delivery cost per day, stacked by channel. Hover a day for the breakdown.')}
        series={series}
        channels={channels}
        field="channelCosts"
        colorForType={colorForType}
        channelLabel={channelLabel}
        formatValue={formatCost}
        t={t}
        language={language}
        hidden={hiddenChannels}
        onToggleChannel={toggleChannel}
      />
    </div>
  );
}
