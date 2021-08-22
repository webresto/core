import MapConfig from "./MapConfig";
import Point from "./Point";
import Polygon from "./Polygon";

export default abstract class MapAdapter {
  protected readonly config: MapConfig;

  protected constructor(config: MapConfig) {
    this.config = config;
  }

  public abstract getGeocode(street: string, home: string): Promise<Point>;

  public abstract getPolygons(): Promise<Polygon[]>;

  public abstract checkDotInPolygon(dot: Point, polygon: Polygon): boolean;

  public abstract getDistance(dot1: Point, dot2: Point): number;
}
