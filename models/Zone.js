/**
 * @api {API} Zone Zone
 * @apiGroup Models
 * @apiDescription Модель зоны. Связана с условиями
 *
 * @apiParam {String} name Название
 * @apiParam {String} description Описание
 * @apiParam {JSON} polygons Массив точек полигона
 */
const MapAdapter = require('../adapter/index').Map;

module.exports = {
  attributes: {
    name: 'string',
    description: 'string',
    polygons: 'json'
  },

  getDeliveryCoast: async function (street, home) {
    const config = sails.config.restocore.map;
    const adapterGeo = Zone.getMapAdapter(config, 'geocode');
    const geo = await adapterGeo.getGeocode(street, home);
    const zones = await Zone.find();

    const adapterCDIP = Zone.getMapAdapter(config, 'check');
    let searched = null;
    for (let i in zones) {
      if (zones.hasOwnProperty(i)) {
        if (adapterCDIP.checkDotInPolygon(geo, zones[i].polygons)) {
          searched = zones[i];
          break;
        }
      }
    }

    return searched;
  },

  getMapAdapter: function (config, key) {
    const type = config[key].toLowerCase();
    return new (MapAdapter.getAdapter(type))(config);
  }
};
