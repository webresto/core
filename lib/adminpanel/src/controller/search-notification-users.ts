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

    const q = String(req.query.q || "").trim().toLowerCase();
    if (!q || q.length < 2) {
      return res.json({ results: [] });
    }

    const users = await User.find({}).limit(50);
    const filtered = users.filter((user: any) => {
      const phone = user?.phone && typeof user.phone === "object"
        ? `${user.phone.code || ""}${user.phone.number || ""}${user.phone.additionalNumber || ""}`
        : "";
      const haystack = [
        user?.id,
        user?.login,
        user?.name,
        user?.firstName,
        user?.lastName,
        user?.email,
        phone,
      ].map((item) => String(item || "").toLowerCase()).join(" ");
      return haystack.includes(q);
    });

    const results = filtered.slice(0, 10).map((user: any) => mapUser(user));

    // Also resolve the query as a device id: a device is bound to its owner after
    // login, so an operator can paste a device id to reach the user behind it.
    const seen = new Set(results.map((item) => item.id));
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
