/**
 * Описывает экземпляр класса
 */
export default interface StateFlowModel {
  next(criteria: any, nextState?: any): Promise<void>;
  getState(criteria: any): Promise<any>;
  getStateObject(criteria: any): Promise<any>;
  addState(state: string, routes: string[], routeRules: void, stateValidation: void, inState: void, afterState: void): boolean;
  removeState(stateField: string): any;
}
