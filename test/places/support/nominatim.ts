import http from "http";
import { AddressInfo } from "net";

/**
 * A local Nominatim for the default geo adapter: the adapter itself is real,
 * only the server it asks is not.
 *
 * It knows no address unless a test says so: `/search` answers `[]` and
 * `/reverse` answers Nominatim's "nothing here". A test that needs another
 * answer sets `reply`; a `reply` that throws makes the server answer 500, the
 * way a Nominatim that is down does. `resetDatabase` clears both.
 */
export const nominatim = {
  reply: undefined as undefined | ((path: string, query: Record<string, string>) => unknown),
  /** Every request, for a test that checks what the adapter asked. */
  requests: [] as { path: string; query: Record<string, string> }[],
  url: "",
};

let server: http.Server | undefined;

export async function startNominatim(): Promise<void> {
  server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    const path = url.pathname.replace(/^\/+/, "");
    const query = Object.fromEntries(url.searchParams);
    nominatim.requests.push({ path, query });

    let body: unknown;
    try {
      body = nominatim.reply?.(path, query);
    } catch {
      response.statusCode = 500;
      return response.end();
    }
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify(body ?? (path === "reverse" ? { error: "Unable to geocode" } : [])));
  });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  nominatim.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

export async function stopNominatim(): Promise<void> {
  if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
}
