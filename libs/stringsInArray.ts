export function stringsInArray(check: string[] | string, array: string[]) {
    if (typeof check === 'string') {
        check = [check];
    }
  
    return array.some((e)=> check.includes(e))
}
