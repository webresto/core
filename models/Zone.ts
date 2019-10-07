/**
 * @api {API} Zone Zone
 * @apiGroup Models
 * @apiDescription Модель зоны. Связана с условиями
 *
 * @apiParam {String} name Название
 * @apiParam {String} description Описание
 * @apiParam {JSON} polygons Массив точек полигона
 */

import MapConfig from "@webresto/core/adapter/map/MapConfig";
import {Map} from "@webresto/core/adapter/index";
import MapAdapter from "@webresto/core/adapter/map/MapAdapter";
import Polygon from "@webresto/core/adapter/map/Polygon";

declare const sails;
declare const Zone;

module.exports = {
  attributes: {
    name: 'string',
    description: 'string',
    polygons: 'json'
  },

  getDeliveryCoast: async function (street: string, home: number): Promise<Zone> {
    const config = <MapConfig>sails.config.restocore.map;
    const adapterGeo = <MapAdapter>Zone.getMapAdapter(config, 'geocode');
    const geo = await adapterGeo.getGeocode(street, home);
    const zones = <Zone[]>await Zone.find();

    const adapterCDIP = <MapAdapter>Zone.getMapAdapter(config, 'check');
    let searched: Zone = null;
    for (let zone of zones) {
      if (adapterCDIP.checkDotInPolygon(geo, zone.polygons)) {
        searched = zone;
        break;
      }
    }

    return searched;
  },

  getMapAdapter: function (config: MapConfig, key: string): MapAdapter {
    const type = config[key].toLowerCase();
    // @ts-ignore
    return new (Map.getAdapter(type))(config);
  }
};

export default interface Zone {
  id: number,
  name: string;
  description: string;
  polygons: Polygon;
}
