import MapAdapter from "@webresto/core/adapter/map/core/MapAdapter";
import Polygon from "@webresto/core/adapter/map/core/Polygon";
import Point from "@webresto/core/adapter/map/core/Point";

const request = require('request-promise');
const Geopoint = require('geopoint');

declare const sails;

export default class YandexMapAdapter extends MapAdapter {
  constructor(config) {
    super(config);
  }

  async getGeocode(street: string, home: number): Promise<Point> {
    street = street.replace(' ', '+');
    street = street.replace('(', '');
    street = street.replace(')', '');
    const link = 'https://geocode-maps.yandex.ru/1.x?format=json&apikey=' + this.config.api + '&geocode=' +
      encodeURIComponent(sails.config.restocore.city + '+' + street + '+' + home);
    const result = JSON.parse(await request(link));
    // const geo = result.response.GeoObjectCollection.featureMember[0].GeoObject.Point.pos.split(' ');
    // return geo[1] + ' ' + geo[0];
    const p = result.response.GeoObjectCollection.featureMember[0].GeoObject.Point.pos;
    return new Point(parseFloat(p.split(' ')[0]), parseFloat(p.split(' ')[1]));
  }

  checkDotInPolygon(dot, polygon) {
    return true;
  }

  async getPolygons(): Promise<Polygon[]> {
    return undefined;
  }

  getDistance(dot1: Point, dot2: Point): number {
    const p1 = new Geopoint(dot1.x, dot1.y);
    const p2 = new Geopoint(dot2.x, dot2.y);
    sails.log.info(dot1, dot2);
    return p1.distanceTo(p2, true);
  }
}
