import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
declare let attributes: {
    /** ID картинки */
    id: string;
    /** Данные о картинках, что содержит данная модель */
    images: any;
    /** Блюдо, которому принадлежит картинка */
    dish: {};
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
    beforeValidate(imageInit: any, next: any): void;
};
declare global {
    const Image: typeof Model & ORMModel<Image>;
}
