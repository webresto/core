import Point from "./Point";
export default class Polygon {
    private readonly _name;
    private readonly _description;
    private readonly _points;
    constructor(name: string, description: string, points: Point[]);
    get points(): Point[];
    get name(): string;
    get asArray(): number[][];
    toString(): string;
}
