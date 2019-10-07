import Street from "@webresto/core/models/Street";

export default interface Address {
  streetId: string;
  home: number;
  comment: string;
  city: string;
  street: Street;
  streetClassifierId: string;
  housing?: string;
  index?: string;
  entrance?: string;
  floor?: string;
  apartment?: string;
  doorphone?: string;
}
