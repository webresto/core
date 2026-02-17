import { AbstractControls, Config, ControlType, Path } from "adminizer";

export class OrderLogsViewerControl extends AbstractControls {
  readonly name: string = "order-logs-viewer";
  readonly type: ControlType = "jsonEditor";

  readonly path: Path = {
    cssPath: "",
    jsPath: {
      dev: `${this.routPrefix}/assets/stockmanager/OrderLogsViewer.js`,
      production: `${this.routPrefix}/assets/stockmanager/OrderLogsViewer.js`,
    },
  };

  readonly config: Config = {
    theme: "dark",
    readOnly: true,
  };

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
