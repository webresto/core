import IikoApi from "@webresto/iiko-rms-adapter/models/IikoApi";
import ImageConfig from "@webresto/core/adapter/image/ImageConfig";
import {Time} from "@webresto/core/modelsHelp/Cause";

export default interface Config {
  prefix: string,
  iiko: IikoApi,
  timeSyncBalance: number, // seconds
  timeSyncMenu: number, // seconds
  timeSyncStreets: number, // hours
  images: ImageConfig
  development: boolean,
  masterKey: string,
  city: string,
  email: {
    server: {
      user: string,
      password: string,
      host: string,
      ssl: boolean
    },
    template: string
  },
  timezone: string,
  map: {
    geocode: string,
    customMaps: string,
    check: string,
    api: string,
    customMap: string
  },
  timeSyncMap: number,
  checkType: string,
  zoneDontWork: string,
  deliveryWorkTime: Time[],
  groupShift: string;
  rmsAdapter: string
};
