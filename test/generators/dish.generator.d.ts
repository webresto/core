interface DishData {
    id?: string;
    additionalInfo?: string;
    balance?: number;
    modifiers?: [];
    parentGroup?: string;
    weight?: number;
    price?: number;
    images?: string[];
    order?: number;
    name?: string;
    composition?: string;
    rmsId?: string;
    code?: string;
    tags?: {
        name: string;
    }[];
    isDeleted?: boolean;
}
export default function dishGenerator(config?: DishData): DishData;
export {};
