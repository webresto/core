/**
 * Описывает платежный документ
 */



export default interface Payment {
  total: number;
  id: string;
  isCorePayment: boolean;
  originModel: string;
  data?: any;
  comment?: string;
}
