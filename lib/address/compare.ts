/**
 * House numbers in the order a person reads them: 1, 2, 2а, 10, 11.
 *
 * Sorting them as strings puts 10 before 2, which in a list of twenty houses is
 * the difference between finding yours and scrolling for it. Names that do not
 * start with a digit — streets, districts — fall back to a plain comparison and
 * sit after the numbered ones.
 */
export function compareAddressNames(a: string, b: string): number {
  const left = /^(\d+)(.*)$/.exec(a ?? "");
  const right = /^(\d+)(.*)$/.exec(b ?? "");

  if (left && right) {
    const byNumber = Number(left[1]) - Number(right[1]);
    return byNumber !== 0 ? byNumber : left[2].localeCompare(right[2]);
  }
  if (left) return -1;
  if (right) return 1;
  return (a ?? "").localeCompare(b ?? "");
}
