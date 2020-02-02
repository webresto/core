/**
 * Описывает Stateflow объекты, в этом модуле это Cart
 */
export default interface StateFlow {
  state: string;

  getState(): string;

  next(state?: string): Promise<void>;
}
