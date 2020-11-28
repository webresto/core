/**
 * Описывает адресс получателя для доставки
 */
export default interface Address {
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
