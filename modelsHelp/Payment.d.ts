export interface Payment {
    paid?: boolean;
    total: number;
    id: string;
    isCartPayment?: boolean;
    originModel: string;
    paymentAdapter: string;
    data?: any;
    comment?: string;
    error?: any;
}
export interface PaymentResponse extends Payment {
    redirectLink: string;
}
