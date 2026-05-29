function hasAccess(req: any, res: any): boolean {
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    res.redirect(`${config.routePrefix}/model/userap/login`);
    return false;
  }
  if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission("notifications-manager", req.user)) {
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
    id: user?.id,
    login: user?.login || "",
    name: user?.name || user?.firstName || user?.email || user?.login || user?.id || "",
    phone,
    email: user?.email || "",
    ...(deviceId ? { deviceId } : {}),
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
      if (!owner?.id || seen.has(owner.id)) continue;
      seen.add(owner.id);
      results.push(mapUser(owner, device.id));
    }

    return res.json({ results: results.slice(0, 10) });
  } catch (error) {
    sails.log.error("Search notification users error", error);
    return res.status(500).json({ error: String(error) });
  }
}
