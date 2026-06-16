const REPORT_STATES = ['ORDER', 'COOKING', 'ON_THE_WAY', 'DONE', 'REJECT'];

function parseDateParam(value: unknown, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? fallback : d;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export default async function GetOrdersReportDataController(req: any, res: any) {
  try {
    const { config } = req.adminizer || {};
    if (config?.auth?.enable && !req.user) {
      return res.redirect(`${config.routePrefix}/model/userap/login`);
    } else if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission(`orders-report`, req.user)) {
      return res.sendStatus(403);
    }

    const now = new Date();
    const fromDate = parseDateParam(req.query.from, startOfMonth(now));
    const toDate = parseDateParam(req.query.to, endOfMonth(now));

    // Filter by createdAt, not orderedAt: orderedAt is only written inside
    // Order.next() (see Order.ts), but checkout sets state directly to "ORDER"
    // via Order.update() and bypasses next(), so orderedAt stays null on every
    // real order — keying the report on it returned zero rows ("no statistics").
    // createdAt is always set by Waterline (epoch ms), which is what we want here.
    const fromMs = fromDate.getTime();
    const toMs = toDate.getTime();

    const orders = await Order.find({
      where: {
        // createdAt is stored as epoch-ms (number) at runtime, though the model
        // type declares it as Date — hence the cast on the comparator object.
        createdAt: { '>=': fromMs, '<=': toMs } as any,
        state: REPORT_STATES,
      },
    });

    // Group by platform + state
    const platformMap: Record<string, { total: number; revenue: number; byState: Record<string, number> }> = {};

    for (const order of orders) {
      const platform = order.orderedOnPlatform ?? null;
      const key = platform === null ? '__null__' : platform;

      if (!platformMap[key]) {
        platformMap[key] = { total: 0, revenue: 0, byState: {} };
      }

      platformMap[key].total += 1;
      platformMap[key].revenue += typeof order.total === 'number' ? order.total : 0;

      const state = String(order.state || '');
      platformMap[key].byState[state] = (platformMap[key].byState[state] || 0) + 1;
    }

    const rows = Object.entries(platformMap).map(([key, data]) => ({
      platform: key === '__null__' ? null : key,
      total: data.total,
      totalRevenue: data.revenue,
      byState: data.byState,
    }));

    // Sort: named platforms first (alphabetically), null last
    rows.sort((a, b) => {
      if (a.platform === null) return 1;
      if (b.platform === null) return -1;
      return a.platform.localeCompare(b.platform);
    });

    // Summary row
    const summary = rows.reduce(
      (acc, row) => {
        acc.total += row.total;
        acc.totalRevenue += row.totalRevenue;
        for (const [state, count] of Object.entries(row.byState)) {
          acc.byState[state] = (acc.byState[state] || 0) + count;
        }
        return acc;
      },
      { total: 0, totalRevenue: 0, byState: {} as Record<string, number> }
    );

    return res.json({
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      states: REPORT_STATES,
      rows,
      summary,
    });
  } catch (error) {
    sails.log.error("Get orders report data error", error);
    return res.status(500).json({ error: String(error) });
  }
}
