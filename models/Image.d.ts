import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
declare let attributes: {
    /** ID картинки */
    id: string;
    /** Данные о картинках, что содержит данная модель */
    images: any;
    /** Блюдо, которому принадлежит картинка */
    dish: {};
    /** Порядок сортировки */
    order: number;
    /** */
    group: {};
    /** Группа, которой принажлежит картинка */
    uploadDate: string;
};
declare type attributes = typeof attributes;
interface Image extends attributes, ORM {
}
export default Image;
declare let Model: {
    beforeCreate(imageInit: any, next: any): void;
};
declare global {
    const Image: typeof Model & ORMModel<Image>;
}
