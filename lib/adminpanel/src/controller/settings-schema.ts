/**
 * The schema rules of a setting now live in `lib/settings/schema.ts`: the mobile API needs the same
 * sentences, and a controller of the admin panel is not something another door may depend on
 * (`settings.plan.md`, C23). Kept as a re-export so the controllers next to this file — and anything
 * outside core that imported it — go on working unchanged.
 */
export {
  getSettingSchema,
  getSettingPatternHint,
  describeSettingValueProblem,
} from "../../../settings/schema";
