/**
 * Keeps the admin API out of browser and proxy caches.
 *
 * Mounted on `<routePrefix>/core` by both admin panel hosts (see `lib/adminpanel/manifest.ts`).
 */
export default function noStore(_req: any, res: any, next: any): void {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
  next();
}
