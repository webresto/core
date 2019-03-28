const request = require('request-promise');

const MapInterface = require('./MapInterface');

class Map extends MapInterface {
  constructor(config) {
    super(config);
  }

  async getGeocode(street, home) {
    street = street.replace(' ', '+');
    street = street.replace('(', '');
    street = street.replace(')', '');
    const link = 'https://geocode-maps.yandex.ru/1.x?format=json&apikey=' + this.config.api + '&geocode=' +
      encodeURIComponent(sails.config.restocore.city + '+' + street + '+' + home);
    const result = JSON.parse(await request(link));
    // const geo = result.response.GeoObjectCollection.featureMember[0].GeoObject.Point.pos.split(' ');
    // return geo[1] + ' ' + geo[0];
    return result.response.GeoObjectCollection.featureMember[0].GeoObject.Point.pos;
  }

  async getArrayOfPolygons() {
    return [];
  }

  async checkDotInPolygon(dot, polygon) {
    return true;
  }
}

module.exports = Map;
