import MapConfig from "./MapConfig";
import Point from "./Point";
import Polygon from "./Polygon";
export default abstract class MapAdapter {
  protected readonly config: MapConfig;
  protected constructor(config: MapConfig);
  abstract getGeocode(street: string, home: string): Promise<Point>;
  abstract getPolygons(): Promise<Polygon[]>;
  abstract checkDotInPolygon(dot: Point, polygon: Polygon): boolean;
  abstract getDistance(dot1: Point, dot2: Point): number;
}
