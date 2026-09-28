/** `a` falls into `(from, to]`; an empty bound is open. */
export function between(from: number, to: number, a: number): boolean {
  return (!from && !to) || (!from && to >= a) || (!to && from < a) || (from < a && to >= a);
}
