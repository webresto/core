import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import Dish from "./Dish";
import Group from "./Group";
import { OptionalAll } from "../interfaces/toolsTS";
declare let attributes: {
    /** ID картинки */
    id: string;
    /** Данные о картинках, что содержит данная модель */
    images: any;
    /** Блюдо, которому принадлежит картинка */
    dish: Dish[];
    /** Порядок сортировки */
    order: number;
    /** */
    group: Group[];
    /** Группа, которой принажлежит картинка */
    uploadDate: string;
};
declare type attributes = typeof attributes;
interface MediaFile extends OptionalAll<attributes>, ORM {
}
export default MediaFile;
declare let Model: {
    beforeCreate(imageInit: any, next: any): void;
};
declare global {
    const MediaFile: typeof Model & ORMModel<MediaFile, null>;
}
