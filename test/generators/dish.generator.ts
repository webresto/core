import { MockSet } from '../generators/lib/mockSet';


export default async function generate(): Promise<any>{
  let mock = MockSet.getInstance().mock(["Dish"]);
  return mock;
}
