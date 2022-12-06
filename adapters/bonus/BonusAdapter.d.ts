import { InitBonusAdapter } from "../../interfaces/InitBonusAdapter";
/**
 * Абстрактный класс Bonus адаптера. Используется для создания новых адаптеров платежных систем.
 */
export default abstract class BonusAdapter {
    readonly InitBonusAdapter: InitBonusAdapter;
    protected constructor(InitBonusAdapter: InitBonusAdapter);
    /**
     * Return user balance
     * @param Bonus - Платежный документ
     * @return Результат работы функции, тело ответа и код результата
     */
    abstract static getUserBalance(): Promise<number>;
}
