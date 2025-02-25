import { isValue } from "../utils/isValue";

/**
 * @notused
 */
export function stringsInArray(check: string[] | string, array: string[]): boolean {
    // If check is an array of strings
    if (Array.isArray(check)) {
        // Check each string in the check array
        for (const str of check) {
            // If any of the strings is not present in the array array, return false
            if (!array.includes(str)) {
                return false;
            }
        }
        // If all strings in the check array are present in the array array, return true
        return true;
    }
    // If check is a string
    else {
        // Check if the check string is present in the array array
        return array.includes(check);
    }
}

export function someInArray(check: string[] | string, array: string[]) {
    if(!isValue(check)) return false;

    if (typeof check === 'string') {
        check = [check];
    } else if(!Array.isArray(check)) {
        return false;
    }
  
    return array.some((e)=> check.includes(e));
}


//@ts-ignore
export function extractFieldValues(obj, fields, exclude = true, result = []) {
    if (typeof obj === 'object' && obj !== null) {
        for (let key in obj) {
            if (typeof obj[key] === 'object') {
                extractFieldValues(obj[key], fields, exclude, result);
            } else if (fields.includes(key) !== exclude) {
                if (Array.isArray(obj[key])) {
                    result.push(JSON.stringify(obj[key]));
                } else {
                    result.push(obj[key]);
                }
            }
        }
    }
    return result;
}

