import MapConfig from "./MapConfig";
import Point from "./Point";
import Polygon from "./Polygon";

export default abstract class MapAdapter {
  protected readonly config: MapConfig;

  protected constructor(config: MapConfig) {
    this.config = config;
  }

  public abstract async getGeocode(street: string, home: number): Promise<Point>;

  public abstract async getPolygons(): Promise<Polygon[]>;

  public abstract checkDotInPolygon(dot: Point, polygon: Polygon): boolean;

  public abstract getDistance(dot1: Point, dot2: Point): number;
}
