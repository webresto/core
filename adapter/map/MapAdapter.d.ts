import MapConfig from "@webresto/core/adapter/map/MapConfig";
import Point from "@webresto/core/adapter/map/Point";
import Polygon from "@webresto/core/adapter/map/Polygon";

export default abstract class MapAdapter {
  protected readonly config: MapConfig;

  protected constructor(config: MapConfig);

  abstract getGeocode(street: string, home: number): Promise<Point>;

  abstract getPolygons(): Promise<Polygon[]>;

  abstract checkDotInPolygon(dot: Point, polygon: Polygon): boolean;

  abstract getDistance(dot1: Point, dot2: Point): number;
}
