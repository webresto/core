import axios from "axios";
import { Adapter } from "../../index";
import { importAddresses, validateAddressNodes } from "./address-import";
import { ADDRESS_TYPES } from "./defaultGeo";

declare const mcp: any;

/**
 * The MCP tools of the address catalog: load a city's catalog from a file, see
 * what is in it, and search it the way the storefront does.
 *
 * They live in the default geo adapter because the catalog is its model.
 *
 * A catalog is tens of thousands of nodes and a megabytes-long file, which is
 * exactly what the admin page's upload stumbles on: a body the proxies refuse,
 * a request that outlives their timeouts, and an operator who sees an error and
 * loads the same file again. So the file is fetched by the server from a link,
 * and the load runs in the background with a status to ask.
 */

/** A file larger than this is not a city catalog. */
const MAX_FILE_BYTES = 100 * 1024 * 1024;

/** How many finished loads are remembered for `address-import-status`. */
const KEPT_JOBS = 20;

interface ImportJob {
  id: string;
  city: string;
  url: string;
  replace: boolean;
  status: "running" | "done" | "failed";
  startedAt: string;
  finishedAt: string | null;
  nodes: number | null;
  created: number | null;
  deleted: number | null;
  errors: string[];
}

/** Per process: a restart forgets the jobs, and a load cut by it is repeated with replace. */
const jobs = new Map<string, ImportJob>();

function remember(job: ImportJob): void {
  jobs.set(job.id, job);
  const finished = [...jobs.values()].filter((entry) => entry.status !== "running");
  for (const old of finished.slice(0, Math.max(0, finished.length - KEPT_JOBS))) jobs.delete(old.id);
}

async function assertDefaultAdapter(): Promise<void> {
  if (!(await Adapter.isDefault("geo"))) {
    throw new Error("The address catalog belongs to the default geo adapter, and this installation uses another one");
  }
}

async function assertCity(city: unknown): Promise<string> {
  if (typeof city !== "string" || !city.trim()) throw new Error("city (id) is required");
  const record = await City.findOne({ id: city.trim() });
  if (!record) throw new Error(`City ${city} not found. Create it first (city-create).`);
  return record.id;
}

async function runImport(job: ImportJob): Promise<void> {
  try {
    const response = await axios.get(job.url, {
      responseType: "text",
      timeout: 120000,
      maxContentLength: MAX_FILE_BYTES,
      validateStatus: (status) => status >= 200 && status < 300,
    });
    const document = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
    const nodes = document?.nodes;
    job.nodes = Array.isArray(nodes) ? nodes.length : null;

    const result = await importAddresses({ city: job.city, nodes, replace: job.replace });
    job.created = result.created;
    job.deleted = result.deleted;
    job.errors = result.errors;
    job.status = result.errors.length ? "failed" : "done";
  } catch (error) {
    job.errors = [error instanceof Error ? error.message : String(error)];
    job.status = "failed";
  } finally {
    job.finishedAt = new Date().toISOString();
    remember(job);
  }
}

export function registerAddressTools(): void {
  mcp.registerTool({
    name: "address-import",
    group: "addresses",
    description:
      "Loads the address catalog of a city from a JSON file at a URL ({ nodes: [{ key, parent, type, name, names, point, lo, hi }] }, " +
      "the format of the admin page's upload). The server downloads the file and loads it in the background: the answer is a job, " +
      "ask address-import-status for its end. The whole file is checked before anything is written. " +
      "A city that already has addresses is refused unless replace: true, which deletes them first (what geocoders found is kept) - " +
      "a second load without it would create every node twice.",
    mode: "protected",
    schema: {
      type: "object",
      properties: {
        city: { type: "string", description: "City ID the catalog belongs to.", example: "abc123" },
        url: { type: "string", description: "Where the JSON file is, http(s).", example: "https://cdn.example.com/ekaterinburg.json" },
        replace: { type: "boolean", description: "Delete the city's addresses before loading. Required when the city already has some.", example: false },
      },
      required: ["city", "url"],
    },
    handler: async ({ city, url, replace }: { city: string; url: string; replace?: boolean }) => {
      await assertDefaultAdapter();
      const cityId = await assertCity(city);
      if (typeof url !== "string" || !/^https?:\/\//i.test(url.trim())) throw new Error("url must be an http(s) address");

      const running = [...jobs.values()].find((job) => job.city === cityId && job.status === "running");
      if (running) throw new Error(`A load into this city is already running: job ${running.id}`);

      if (replace !== true) {
        const existing = await Address.count({ city: cityId, cache: null });
        if (existing > 0) {
          throw new Error(`The city already has ${existing} addresses. Pass replace: true to delete them and load the file.`);
        }
      }

      const job: ImportJob = {
        id: `${cityId}:${Date.now()}`,
        city: cityId,
        url: url.trim(),
        replace: replace === true,
        status: "running",
        startedAt: new Date().toISOString(),
        finishedAt: null,
        nodes: null,
        created: null,
        deleted: null,
        errors: [],
      };
      remember(job);
      void runImport(job);
      return job;
    },
  });

  mcp.registerTool({
    name: "address-import-status",
    group: "addresses",
    description: "The state of an address-import job: running, done (with created/deleted) or failed (with the errors). Without jobId - the recent jobs.",
    mode: "protected",
    schema: {
      type: "object",
      properties: { jobId: { type: "string", description: "Job id returned by address-import.", example: "abc123:1792546966084" } },
    },
    handler: async ({ jobId }: { jobId?: string }) => {
      if (!jobId) return [...jobs.values()].reverse();
      const job = jobs.get(jobId);
      if (!job) throw new Error(`Job ${jobId} is not known to this process (finished long ago, or the server restarted)`);
      return job;
    },
  });

  mcp.registerTool({
    name: "address-validate",
    group: "addresses",
    description: "Checks a catalog file at a URL without loading it: node count by type, and every mistake the load would refuse.",
    mode: "protected",
    schema: {
      type: "object",
      properties: { url: { type: "string", description: "Where the JSON file is, http(s).", example: "https://cdn.example.com/ekaterinburg.json" } },
      required: ["url"],
    },
    handler: async ({ url }: { url: string }) => {
      if (typeof url !== "string" || !/^https?:\/\//i.test(url.trim())) throw new Error("url must be an http(s) address");
      const response = await axios.get(url.trim(), { responseType: "text", timeout: 120000, maxContentLength: MAX_FILE_BYTES });
      const document = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
      const nodes = Array.isArray(document?.nodes) ? document.nodes : [];
      const byType: Record<string, number> = {};
      for (const node of nodes) byType[node?.type] = (byType[node?.type] ?? 0) + 1;
      const errors = validateAddressNodes(document?.nodes, ADDRESS_TYPES);
      return { nodes: nodes.length, byType, errors: errors.slice(0, 100), errorCount: errors.length };
    },
  });

  mcp.registerTool({
    name: "address-stats",
    group: "addresses",
    description:
      "What the address catalog of a city holds: nodes by type, how many came from geocoders, nodes without a point, " +
      "nodes whose parent is missing, and duplicates (same parent, type and name).",
    mode: "protected",
    schema: {
      type: "object",
      properties: { city: { type: "string", description: "City ID.", example: "abc123" } },
      required: ["city"],
    },
    handler: async ({ city }: { city: string }) => {
      await assertDefaultAdapter();
      const cityId = await assertCity(city);
      const rows: any[] = await Address.find({ city: cityId });

      const ids = new Set(rows.map((row) => row.id));
      const byType: Record<string, number> = {};
      const withoutPoint: Record<string, number> = {};
      const seen = new Set<string>();
      let duplicates = 0;
      let orphans = 0;
      let fromGeocoders = 0;

      for (const row of rows) {
        byType[row.type] = (byType[row.type] ?? 0) + 1;
        if (!row.point) withoutPoint[row.type] = (withoutPoint[row.type] ?? 0) + 1;
        if (row.cache) fromGeocoders++;
        const parent = typeof row.parent === "string" ? row.parent : row.parent?.id ?? null;
        if (parent && !ids.has(parent)) orphans++;
        const identity = JSON.stringify([parent, row.type, row.name]);
        if (seen.has(identity)) duplicates++;
        seen.add(identity);
      }

      return { city: cityId, total: rows.length, byType, withoutPoint, fromGeocoders, orphans, duplicates };
    },
  });

  mcp.registerTool({
    name: "address-search",
    group: "addresses",
    description: "Searches the catalog of a city the way the storefront's address field does, and returns each hit with its path from the city.",
    mode: "protected",
    schema: {
      type: "object",
      properties: {
        city: { type: "string", description: "City ID.", example: "abc123" },
        query: { type: "string", description: "What the customer types: the first letters of a street, a house number under a parent.", example: "Ленина" },
        parent: { type: "string", description: "Search among this node's children (e.g. the houses of a street).", example: "def456" },
      },
      required: ["city", "query"],
    },
    handler: async ({ city, query, parent }: { city: string; query: string; parent?: string }) => {
      await assertDefaultAdapter();
      const cityId = await assertCity(city);
      const geo = await Adapter.get("geo");
      const hits = await geo.search({ city: cityId, parent: parent ?? null, query: query ?? "" });
      return await Promise.all(
        hits.map(async (hit: any) => ({
          id: hit.id,
          type: hit.type,
          name: hit.name,
          point: hit.point ?? null,
          path: (await geo.path(hit.id)).map((node: any) => node.name).join(", "),
        })),
      );
    },
  });
}
