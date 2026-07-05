function hasAccess(req: any, res: any): boolean {
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    res.redirect(`${config.routePrefix}/model/userap/login`);
    return false;
  }
  if (!hasModulePermission(req, NOTIFICATIONS_ACCESS, "view")) {
    res.sendStatus(403);
    return false;
  }
  return true;
}

function mapUser(user: any, deviceId?: string) {
  const phone = user?.phone && typeof user.phone === "object"
    ? `${user.phone.code || ""}${user.phone.number || ""}${user.phone.additionalNumber || ""}`
    : "";

  return {
    kind: "user",
    id: user?.id,
    login: user?.login || "",
    name: user?.name || user?.firstName || user?.email || user?.login || user?.id || "",
    phone,
    email: user?.email || "",
    ...(deviceId ? { deviceId, foundByDeviceId: true } : {}),
  };
}

// Cart as a target: addressed by device (order.deviceId), even without a user.
function mapCart(order: any) {
  return {
    kind: "cart",
    id: order?.id,
    orderId: order?.id,
    shortId: order?.shortId || "",
    state: order?.state || "",
    deviceId: order?.deviceId || "",
    userId: typeof order?.user === "string" ? order.user : (order?.user?.id || ""),
    createdAt: order?.createdAt || null,
  };
}

// Device as a target: addressed directly by UserDevice.id.
function mapDevice(device: any) {
  return {
    kind: "device",
    id: device?.id,
    deviceId: device?.id,
    name: device?.name || "",
    userId: typeof device?.user === "string" ? device.user : (device?.user?.id || ""),
    lastActivity: device?.lastActivity || null,
    hasToken: Boolean(device?.notificationToken),
  };
}

export default async function SearchNotificationUsersController(req: any, res: any) {
  try {
    if (!hasAccess(req, res)) return;

    const raw = String(req.query.q || "").trim();
    const q = raw.toLowerCase();
    if (!q || q.length < 2) {
      return res.json({ results: [] });
    }

    // Filter at the DB level so users beyond the first page are still found.
    // Text fields are matched with `contains`; phone is JSON so it is matched
    // in memory below.
    const textMatches: any[] = await User.find({
      where: {
        or: [
          { login: { contains: raw } },
          { firstName: { contains: raw } },
          { lastName: { contains: raw } },
          { email: { contains: raw } },
        ],
      },
    }).limit(50);

    // Phone is stored as JSON and cannot be queried with `contains`, so for the
    // phone case we scan users and match the concatenated phone string.
    const digits = raw.replace(/\D/g, "");
    let phoneMatches: any[] = [];
    if (digits.length >= 2) {
      const all: any[] = await User.find({});
      phoneMatches = all.filter((user: any) => {
        const phone = user?.phone && typeof user.phone === "object"
          ? `${user.phone.code || ""}${user.phone.number || ""}${user.phone.additionalNumber || ""}`
          : "";
        return phone.replace(/\D/g, "").includes(digits);
      });
    }

    // Merge and de-duplicate by id, preserving order (text matches first).
    const seen = new Set<any>();
    const results: any[] = [];
    for (const user of [...textMatches, ...phoneMatches]) {
      if (user && !seen.has(user.id)) {
        seen.add(user.id);
        results.push(mapUser(user));
      }
    }

    // Also resolve the query as a device id: a device is bound to its owner after
    // login, so an operator can paste a device id to reach the user behind it.
    const devices = await UserDevice.find({ where: { id: { contains: q } } })
      .populate("user")
      .limit(10);
    for (const device of devices as any[]) {
      const owner = device?.user && typeof device.user === "object" ? device.user : null;
      if (owner?.id) {
        // Device with an owner -> show the user, as before.
        if (seen.has(owner.id)) {
          const existing = results.find((item) => item.kind === "user" && item.id === owner.id);
          if (existing && !existing.deviceId) {
            existing.deviceId = device.id;
            existing.foundByDeviceId = true;
          }
          continue;
        } else {
          seen.add(owner.id);
          results.push(mapUser(owner, device.id));
        }
      } else {
        // Guest device without an owner -> can send directly to it.
        results.push(mapDevice(device));
      }
    }

    // Resolve the query as a cart/order: an operator can paste an order id or
    // shortId to send a notification straight to the device that cart was
    // processed on (works even for anonymous carts without a user).
    const OrderModel = (globalThis as any).Order;
    const orders = await OrderModel.find({
      where: {
        or: [
          { id: { contains: raw } },
          { shortId: { contains: raw.toUpperCase() } },
        ],
      },
      limit: 10,
    });
    for (const order of orders as any[]) {
      if (!order?.deviceId) continue; // There is nowhere to send without a device.
      results.push(mapCart(order));
    }

    return res.json({ results: results.slice(0, 15) });
  } catch (error) {
    sails.log.error("Search notification users error", error);
    return res.status(500).json({ error: String(error) });
  }
}
