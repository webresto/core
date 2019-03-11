/**
 * @api {API} Zone Zone
 * @apiGroup Models
 * @apiDescription Модель зоны. Связана с условиями
 *
 * @apiParam {String} name Название
 * @apiParam {String} description Описание
 * @apiParam {JSON} polygons Массив точек полигона
 * @apiParam {Condition[]} conditions Условия
 */

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

    if (!searched) {
      throw 'zone not found';
    }

    return searched;
  },

  getMapAdapter: function (config, key) {
    const type = config[key].toLowerCase();
    const adapterName = type[0].toUpperCase() + type.substr(1, type.length - 1);
    const Adapter = require('../adapter/map/' + adapterName + 'MapAdapter');
    return new Adapter(config);
  }
};

// sails.on('lifted', async () => {
//   try {
//     sails.log.info('start');
//     const res = await Zone.getDeliveryCoast('Республики', '30');
//     sails.log.info('end', res);
//   } catch (e) {
//     sails.log.error('err100', e);
//   } finally {
//     sails.lower();
//   }
// });
