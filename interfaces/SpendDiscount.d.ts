export interface SpendDiscount {
    discountType: "flat" | "percentage";
    discountAmount: number;
    discountProgramId: string;
}
