/**
 * Describes Stateflow objects, in this module it's Cart
 */
export default interface StateFlow {
  state: string;
  getState(): string;
  next(state?: string): Promise<void>;
}
