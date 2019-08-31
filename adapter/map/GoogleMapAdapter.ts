import MapAdapter from "@webresto/core/adapter/map/core/MapAdapter";
import Point from "@webresto/core/adapter/map/core/Point";
import Polygon from "@webresto/core/adapter/map/core/Polygon";
import {promisify} from "util";

const googleMaps = require('@google/maps');
const request = require('request-promise');
// const google = require('../../lib/googleMap');
const inside = require('point-in-polygon');
const xml2json = require('xml2js').parseString;
// @ts-ignore
const Promise = require('bluebird');

declare const sails;

export default class GoogleMapAdapter extends MapAdapter {
  private map: any;

  constructor(config) {
    super(config);
    this.map = googleMaps.createClient({
      key: config.apiKey
    });
  }


  public async getGeocode(street: string, home: number): Promise<Point> {
    const result = await this.map.geocode({address: 'Тюмень ' + street + ' ' + home}).asPromise();
    console.log(result.json.results);
    return new Point(0, 0);
  }

  public async getPolygons(): Promise<Polygon[]> {
    const result = await request(this.config.customMap);
    const json = await promisify(xml2json)(result);

    let polygons: Polygon[] = [];

    const data = json.kml.Document[0].Folder[0].Placemark;
    await Promise.each(data, async data1 => {
      const name = data1.name[0];
      const description = data1.description ? data1.description[0] : "";

      let polygon = data1.Polygon[0].outerBoundaryIs[0].LinearRing[0].coordinates[0];
      polygon = polygon.split('\n');
      polygon = polygon.map(p => p.trim());
      polygon = polygon.filter(p => p !== '');
      const polygonObj = new Polygon(name, description, polygon.map(p => new Point(parseFloat(p.split(',')[0]), parseFloat(p.split(',')[1]))));
      polygons.push(polygonObj);
    });

    return polygons;
  }

  public checkDotInPolygon(point: Point, polygon: Polygon | string[]): boolean {
    if (polygon instanceof Polygon) {
      sails.log.info(point, polygon, polygon.asArray);
      return inside([point.x, point.y], polygon.asArray);
    } else {
      const polygon1 = polygon.map(p => p.split(',').slice(0, 2));
      const polygon2 = polygon1.map(p => p.map(p1 => parseFloat(p1)));
      sails.log.info(point, polygon2);
      return inside([point.x, point.y], polygon2);
    }
  }

  getDistance(dot1: Point, dot2: Point): number {
    return 0;
  }
}
