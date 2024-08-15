/**
 * Описывает адресс получателя для доставки
 */

type Coordinate = {
  lon: string,
  lat: string
}

export default interface Address {
  buildingName?: string;
  coordinate?: Coordinate;
  streetId?: string;
  home: string;
  comment?: string;
  city?: string;
  street: string;
  housing?: string;
  index?: string;
  entrance?: string;
  floor?: string;
  apartment?: string;
  doorphone?: string;
}
