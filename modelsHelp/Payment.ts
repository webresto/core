/**
 * Описывает платежный документ
 */



export default interface Payment {
  total: number;
  id: string;
  is_core_payment: boolean;
  origin: string;
  data?: any;
  comment?: string;
}
