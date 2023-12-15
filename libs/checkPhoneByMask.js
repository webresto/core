"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPhoneByMask = void 0;
const checkPhoneByMask = (phoneNumber, countryCode, phoneMasks) => {
    const cleanedPhoneNumber = phoneNumber.replace(/\D/g, '');
    const codeWithoutPlus = countryCode.slice(1);
    if (!phoneNumber.startsWith(countryCode)) {
        return false;
    }
    for (const mask of phoneMasks) {
        const maskDigits = [...mask.replace(/-/g, '')];
        const phoneNumberDigits = [...cleanedPhoneNumber.slice(codeWithoutPlus.length)];
        if (maskDigits.length === phoneNumberDigits.length) {
            const isValid = maskDigits.every((maskDigit, i) => {
                if (isNaN(parseInt(phoneNumberDigits[i]))) {
                    return false;
                }
                if (maskDigit === '#') {
                    return true;
                }
                else {
                    if (isNaN(parseInt(maskDigit))) {
                        return false;
                    }
                    else {
                        return phoneNumberDigits[i] === maskDigit;
                    }
                }
            });
            if (isValid) {
                return true;
            }
        }
    }
    return false;
};
exports.checkPhoneByMask = checkPhoneByMask;
