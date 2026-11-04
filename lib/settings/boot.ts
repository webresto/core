import fs from "fs";
import path from "path";
import { isPrimaryWorker } from "../cluster";

/**
 * Identifies this run of the installation. A setting that only takes effect at boot is applied once
 * the application comes back up with a different boot id, so the "restart to apply" reminder — the
 * settings page keeps it in `sessionStorage`, the mobile app in the server's storage — must not
 * survive the restart it asked for, and must not disappear before it.
 *
 * It used to be `${process.pid}-<start time>`, computed per process (C25). Production runs as a PM2
 * cluster, so a request that landed on another worker brought another id: the reminder vanished
 * early as often as it lingered. One value per installation, written by worker 0 into the
 * application's own `.tmp`, fixes that for every worker on the host — which is where a cluster is.
 * Hosts behind a balancer each have their own, and a reminder is a reminder, not a fact of record.
 */

/** This process, in the shape the page already understood: pid and the moment it came up. */
const ownId = `${process.pid}-${Math.round(Date.now() - process.uptime() * 1000)}`;

/** When this process started: a file older than that is a leftover of the previous run. */
const startedAt = Date.now() - process.uptime() * 1000;

let resolved: string | null = null;

function idFile(): string {
  const appPath = (typeof sails !== "undefined" && sails?.config?.appPath) || process.cwd();
  return path.join(appPath, ".tmp", "boot-id");
}

export function bootId(): string {
  if (resolved) return resolved;

  const where = idFile();
  try {
    if (isPrimaryWorker()) {
      fs.mkdirSync(path.dirname(where), { recursive: true });
      fs.writeFileSync(where, ownId);
      resolved = ownId;
      return resolved;
    }

    // A worker that came up before worker 0 wrote the file would otherwise read the id of the
    // previous run — worse than having none. Only a file written since this process started is
    // this run's, and until one appears the answer is this worker's own id and is not remembered,
    // so the next call looks again.
    const written = fs.statSync(where).mtimeMs;
    const kept = fs.readFileSync(where, "utf8").trim();
    if (kept && written >= startedAt) {
      resolved = kept;
      return resolved;
    }
  } catch {
    /* no file, no directory, no disk: this process answers for itself */
  }
  return ownId;
}
