/**
 * Where this process stands in a PM2 cluster (`pm2-runtime start … -i max`, .ci/bootstrap).
 *
 * PM2 numbers cluster workers through NODE_APP_INSTANCE, 0-based; outside a cluster (fork mode,
 * plain node, tests) the variable is absent. Anything that must happen once per installation
 * rather than once per process — a background loop, a healthcheck that writes a shared row —
 * asks here instead of re-deriving the rule (review2 §2.2).
 */

/** PM2 worker index, or 0 when the process is not a cluster worker. */
export function workerIndex(): number {
  const raw = process.env.NODE_APP_INSTANCE;
  if (raw === undefined || raw === "") return 0;
  const index = Number(raw);
  return Number.isFinite(index) && index >= 0 ? index : 0;
}

/**
 * True for the process that owns installation-wide side effects: worker 0 in a cluster, and the
 * only process everywhere else.
 */
export function isPrimaryWorker(): boolean {
  return workerIndex() === 0;
}
