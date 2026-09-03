import { adminModuleUrl } from "../../../lib/adminpanel/adminModules";

type Config = Record<string, string | string[] | object | number | boolean>;
type ControlType = "jsonEditor";
type Path = {
  jsPath: {
    dev: string;
    production: string;
  };
  cssPath: string;
};
type AdminizerLike = {
  config: {
    routePrefix?: string;
  };
};

export class WorktimeViewerControl {
  readonly name: string = "worktime-viewer";
  readonly type: ControlType = "jsonEditor";
  readonly path: Path;
  readonly config: Config = {
    theme: "dark",
    readOnly: true,
  };

  constructor(adminizer: AdminizerLike) {
    const routePrefix = adminizer?.config?.routePrefix || "/admin";
    this.path = {
      cssPath: "",
      // Custom admin modules are served by restocore hook bindAssets.ts
      jsPath: {
        dev: adminModuleUrl("WorktimeViewer"),
        production: adminModuleUrl("WorktimeViewer"),
      },
    };

    // Keep routePrefix access for future conditional paths if needed.
    void routePrefix;
  }

  getConfig(): Config {
    return this.config;
  }

  getJsPath(): string {
    return process.env.VITE_ENV === "dev"
      ? this.path.jsPath.dev
      : this.path.jsPath.production;
  }

  getCssPath(): string | undefined {
    return undefined;
  }

  getName(): string {
    return this.name;
  }
}
