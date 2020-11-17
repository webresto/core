interface GroupData {
    id?: string;
    additionalInfo?: string;
    code?: string;
    description?: string;
    parentGroup?: string;
    images?: string;
    order?: number;
    name?: string;
    tags?: {
        name: string;
    }[];
    isDeleted?: boolean;
    dishesTags?: {
        name: string;
    }[];
    isIncludedInMenu?: boolean;
    dishes?: [];
    slug?: string;
}
export default function groupGenerator(config?: GroupData): GroupData;
export {};
