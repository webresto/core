class MapInterface {
  constructor(config) {
    this.config = config;
  }

  async getGeocode(street, home) {
    throw new Error('getGeocode method must be implemented');
  }

  async getArrayOfPolygons() {
    throw new Error('getGeocode method must be implemented');
  }

  async checkDotInPolygon(dot, polygon) {
    throw new Error('getGeocode method must be implemented');
  }

  async getCustomMap(dot, polygon) {
    throw new Error('getCustomMap method must be implemented');
  }
}

module.exports = MapInterface;
