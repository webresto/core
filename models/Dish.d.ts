import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
declare let attributes: any;
declare type Dish = typeof attributes & ORM;
export default Dish;
declare let Model: {
    afterUpdate: (record: any, proceed: any) => any;
    /**
     * Принимает waterline criteria и дописывает, туда isDeleted = false, balance != 0. Таким образом эта функция позволяет
     * находить в базе блюда по критерию и при этом такие, что с ними можно работать юзеру.
     * @param criteria - критерии поиска
     * @return найденные блюда
     */
    getDishes(criteria?: any): Promise<any[]>;
    /**
     * Популяризирует модификаторы блюда, то есть всем груповым модификаторам дописывает группу и блюда, которые им соответствуют,
     * а обычным модификаторам дописывает их блюдо.
     * @param dish
     */
    getDishModifiers(dish: any): Promise<void>;
    /**
     * Проверяет существует ли блюдо, если не сущестует, то создаёт новое и возвращает его. Если существует, то сверяет
     * хеш существующего блюда и новых данных, если они идентифны, то сразу же отдаёт блюда, если нет, то обновляет его данные
     * на новые
     * @param values
     * @return обновлённое или созданное блюдо
     */
    createOrUpdate(values: any): Promise<any>;
};
declare global {
    const Dish: typeof Model & ORMModel<Dish>;
}
