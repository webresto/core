import Point from "@webresto/core/adapter/map/core/Point";

export default class Polygon {
  private readonly _name: string;
  private readonly _description: string;
  private readonly _points: Point[];

  constructor(name: string, description: string, points: Point[]) {
    this._name = name;
    this._description = description;
    this._points = points;
  }

  get points(): Point[] {
    return this._points;
  }

  get name(): string {
    return this._name;
  }

  get asArray(): number[][] {
    return this._points.map(point => [point.x, point.y]);
  }

  public toString(): string {
    return this._points.toString();
  }
}
