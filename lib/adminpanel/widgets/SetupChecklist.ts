import { CustomBase } from "adminizer";

export default class SetupChecklistWidget extends CustomBase {
  readonly id = "setup-checklist-status";
  readonly accessRightsToken = "setup-checklist";
  readonly department = "restoapp_info";
  readonly name = "Setup checklist";
  readonly description = "Setup progress";
  readonly icon = "checklist";
  readonly backgroundCSS = "transparent";
  readonly size = { h: 2, w: 2 };
  readonly jsPath = {
    dev: "/restocore/assets/core-adminizer-assets/SetupChecklistWidget.js",
    production: "/restocore/assets/core-adminizer-assets/SetupChecklistWidget.js",
  };

  constructor(routePrefix: string) {
    super(routePrefix);
  }
}
