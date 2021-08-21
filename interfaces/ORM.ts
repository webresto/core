/**
 * Описывает экземпляр класса
 */
export default interface ORM {
  destroy(): Promise<void>;

  save(): Promise<void>;

  remove();

  add();
}
