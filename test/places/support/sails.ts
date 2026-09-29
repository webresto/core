/**
 * Root hooks of the integration run: one Sails app for the whole run, lifted
 * from `test/fixture` on sails-disk in memory, with core loaded as its hook.
 *
 * Settings come from core's manifests, as on a fresh installation. Tests start
 * once core has finished its boot (`restocore:ready`), not merely after lift.
 * The geocoder talks to a local Nominatim (`./nominatim`), never the network.
 * The installation's own working hours (`WORK_TIME`, 10:00–20:00 out of the
 * box) are lifted, so a checkout does not depend on the hour the run starts; a
 * test about working hours sets them.
 * Sails logs nothing unless `LOG_LEVEL` says otherwise (`LOG_LEVEL=error`).
 * The locales are a copy: Sails' i18n writes every phrase it meets back into
 * its files outside production, and the fixture's must stay as committed.
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { startNominatim, stopNominatim, nominatim } from "./nominatim";
import { snapshotSettings } from "./reset";

process.env.TZ = "Etc/GMT";
process.env.CORE_LOAD_SETTINGS_MANIFESTS = "true";

const locales = path.join(os.tmpdir(), `core-test-locales-${process.pid}`);

export const mochaHooks = {
  async beforeAll(this: Mocha.Context) {
    this.timeout(120000);
    await startNominatim();
    fs.cpSync(path.resolve(__dirname, "../../fixture/config/locales"), locales, { recursive: true });
    const { sails } = require("../../fixture/app-export");
    await new Promise<void>((resolve, reject) => {
      sails.after("restocore:ready", () => resolve());
      sails.lift({ port: 0, log: { level: process.env.LOG_LEVEL || "silent" }, i18n: { localesDirectory: locales } }, (error: unknown) => error && reject(error));
    });
    await Settings.set("NOMINATIM_URL", { value: nominatim.url });
    // Round the clock, as far as the setting can say it: an empty value falls
    // back to the manifest's hours, and a day cannot end later than 23:59.
    const everyDay = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    await Settings.set("WORK_TIME", { value: [{ dayOfWeek: everyDay, start: "00:00", stop: "23:59" }] });
    await snapshotSettings();
  },
  async afterAll(this: Mocha.Context) {
    this.timeout(30000);
    const sails = (global as any).sails;
    if (sails) await new Promise<void>((resolve) => sails.lower(() => resolve()));
    await stopNominatim();
    fs.rmSync(locales, { recursive: true, force: true });
  },
};
