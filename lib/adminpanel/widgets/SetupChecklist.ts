import { CustomBase } from "adminizer";
import { adminModuleUrl } from "../adminModules";

export default class SetupChecklistWidget extends CustomBase {
  readonly id = "setup-checklist-status";
  readonly accessRightsToken = "setup-checklist";
  readonly department = "restoapp_info";
  readonly name = "Setup checklist";
  readonly description = "Setup progress";
  readonly icon = "checklist";
  readonly backgroundCSS = "transparent";
  readonly size = { h: 1, w: 1 };
  readonly jsPath = {
    dev: adminModuleUrl("SetupChecklistWidget"),
    production: adminModuleUrl("SetupChecklistWidget"),
  };

  constructor(routePrefix: string) {
    super(routePrefix);
  }
}
