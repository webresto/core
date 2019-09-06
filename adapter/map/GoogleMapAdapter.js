const googleMaps = require('@google/maps');
const request = require('request-promise');
const fs = require('fs');
// const google = require('../../lib/googleMap');
const inside = require('point-in-polygon');

const MapInterface = require('./MapInterface');

class Map extends MapInterface {
  constructor(config) {
    super(config);
    this.map = googleMaps.createClient({
      key: config.apiKey
    });
  }

  async getGeocode(street, home) {
    const result = await googleMapsClient.geocode({address: 'Тюмень ' + street + ' ' + home}).asPromise();
    console.log(result.json.results);
    return 0;
  }

  async getArrayOfPolygons() {
    return [];
  }

  checkDotInPolygon(point, polygon) {
    point = point.split(' ');
    polygon = polygon.map(p => p.split(',').slice(0, 2));
    point = point.map(p => parseFloat(p));
    polygon = polygon.map(p => p.map(p1 => parseFloat(p1)));
    return inside(point, polygon);
  }

  async getCustomMap() {
    const result = await request(this.config.map.customMap).pipe(fs.createWriteStream('map.kml'));
    sails.log.info(result);
    fs.read('map.kml', data => {
      sails.log.info(data);
    });
  }
}


module.exports = Map;
