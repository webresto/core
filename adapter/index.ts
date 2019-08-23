import RMSAdapter from '@webresto/core/adapter/rms/RMSAdapter';
import MapAdapter from '@webresto/core/adapter/map/core/MapAdapter';

export class RMS {
  public static getAdapter(adapterName: string): RMSAdapter {
    const adapterFind = '@webresto/' + adapterName.toLowerCase() + '-rms-adapter';
    try {
      const adapter = require(adapterFind);
      return adapter.RMS[adapterName.toUpperCase()];
    } catch (e) {
      throw new Error('Module ' + adapterFind + ' not found');
    }
  }
}

export class Map {
  public static getAdapter(adapterName: string): MapAdapter {
    const adapterFind = adapterName.toLowerCase().charAt(0).toUpperCase() + adapterName.toLowerCase().slice(1) + 'MapAdapter';
    try {
      const adapter = require('./map/' + adapterFind);
      return adapter.default;
    } catch (e) {
      throw new Error('Module ' + adapterName + ' not found');
    }
  }
}
