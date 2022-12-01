export default abstract class BonusAdapter {
  public readonly InitBonusAdapter: InitBonusAdapter;

  protected constructor(InitBonusAdapter: InitBonusAdapter) {
    this.InitBonusAdapter = InitBonusAdapter;
    BonusProgram.alive(this);
  }

  /**
   * Return user balance
   * @param Bonus - Платежный документ
   * @return Результат работы функции, тело ответа и код результата
   */
   public abstract getUserBalance(): Promise<number>;


   

}
