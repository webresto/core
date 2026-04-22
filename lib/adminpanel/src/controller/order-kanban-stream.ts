const SSE_RETRY_MS = 5000;
const SSE_HEARTBEAT_MS = 25000;
const EMITTER_LISTENER_PREFIX = "restocore-order-kanban-stream";

type StreamClient = {
  id: string;
  res: any;
  userId: string | null;
};

type StreamState = {
  clients: Map<string, StreamClient>;
  heartbeatTimer: NodeJS.Timeout | null;
  sequence: number;
  emitterBound: boolean;
};

const STREAM_STATE_KEY = "__restocoreOrderKanbanStreamState";

function getStreamState(): StreamState {
  const globalScope = globalThis as any;
  if (!globalScope[STREAM_STATE_KEY]) {
    globalScope[STREAM_STATE_KEY] = {
      clients: new Map(),
      heartbeatTimer: null,
      sequence: 0,
      emitterBound: false,
    } satisfies StreamState;
  }
  return globalScope[STREAM_STATE_KEY];
}

function safeJson(value: any): string {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ error: "Failed to stringify payload" });
  }
}

function sendEvent(res: any, event: string, data: any, sequence: number): void {
  res.write(`id: ${sequence}\n`);
  res.write(`event: ${event}\n`);
  res.write(`data: ${safeJson(data)}\n\n`);
}

function removeClient(clientId: string): void {
  const state = getStreamState();
  state.clients.delete(clientId);

  if (state.clients.size === 0 && state.heartbeatTimer) {
    clearInterval(state.heartbeatTimer);
    state.heartbeatTimer = null;
  }
}

function broadcast(event: string, data: Record<string, any>): void {
  const state = getStreamState();
  const sequence = ++state.sequence;
  const payload = {
    ...data,
    sequence,
    at: new Date().toISOString(),
  };

  for (const [clientId, client] of state.clients.entries()) {
    if (client.res.writableEnded || client.res.destroyed) {
      removeClient(clientId);
      continue;
    }

    try {
      sendEvent(client.res, event, payload, sequence);
    } catch (error) {
      sails.log.debug("OrderKanban SSE: failed to write event", { clientId, error });
      try {
        client.res.end();
      } catch {
        // ignore
      }
      removeClient(clientId);
    }
  }
}

function bindEmitterOnce(): void {
  const state = getStreamState();
  if (state.emitterBound) return;

  const coreEmitter = (globalThis as any).emitter;
  if (!coreEmitter || typeof coreEmitter.on !== "function") {
    return;
  }

  coreEmitter.on("core:order-after-create", `${EMITTER_LISTENER_PREFIX}-create`, (order: any) => {
    broadcast("order-changed", {
      type: "created",
      orderId: order?.id || null,
      state: order?.state || null,
      updatedAt: order?.updatedAt || null,
    });
  });

  coreEmitter.on("core:order-after-update", `${EMITTER_LISTENER_PREFIX}-update`, (order: any) => {
    broadcast("order-changed", {
      type: "updated",
      orderId: order?.id || null,
      state: order?.state || null,
      updatedAt: order?.updatedAt || null,
    });
  });

  state.emitterBound = true;
}

function ensureHeartbeat(): void {
  const state = getStreamState();
  if (state.heartbeatTimer || state.clients.size === 0) return;

  state.heartbeatTimer = setInterval(() => {
    if (state.clients.size === 0) {
      if (state.heartbeatTimer) {
        clearInterval(state.heartbeatTimer);
        state.heartbeatTimer = null;
      }
      return;
    }
    broadcast("heartbeat", { ok: true });
  }, SSE_HEARTBEAT_MS);

  if (typeof state.heartbeatTimer.unref === "function") {
    state.heartbeatTimer.unref();
  }
}

function checkAccess(req: any, res: any): boolean {
  const { config } = req.adminizer || {};

  if (config?.auth?.enable && !req.user) {
    res.sendStatus(401);
    return false;
  }

  if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission("order-kanban", req.user)) {
    res.sendStatus(403);
    return false;
  }

  return true;
}

export default function OrderKanbanStreamController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  if (!checkAccess(req, res)) return;

  bindEmitterOnce();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  const state = getStreamState();
  const clientId = `order-kanban-${req.user?.id || "unknown"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  res.write(`retry: ${SSE_RETRY_MS}\n\n`);

  state.clients.set(clientId, {
    id: clientId,
    res,
    userId: req.user?.id || null,
  });

  ensureHeartbeat();

  const sequence = ++state.sequence;
  sendEvent(res, "connected", {
    message: t("Connected to order kanban stream"),
    clientId,
    sequence,
    at: new Date().toISOString(),
  }, sequence);

  req.on("close", () => {
    removeClient(clientId);
    try {
      res.end();
    } catch {
      // ignore
    }
  });
}
