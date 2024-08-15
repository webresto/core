"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.phoneValidByMask = phoneValidByMask;
function phoneValidByMask(phoneNumber, countryCode, phoneMasks) {
    const cleanedPhoneNumber = phoneNumber.replace(/\D/g, '');
    const codeWithoutPlus = countryCode.slice(1);
    if (!phoneNumber.startsWith(countryCode)) {
        return false;
    }
    for (const mask of phoneMasks) {
        const maskDigits = mask.replace(/[^\d#]/g, '').split('');
        const phoneNumberDigits = cleanedPhoneNumber.slice(codeWithoutPlus.length).split('');
        if (maskDigits.length === phoneNumberDigits.length) {
            let isValid = true;
            for (let i = 0; i < maskDigits.length; i++) {
                if (isNaN(parseInt(phoneNumberDigits[i]))) {
                    isValid = false;
                    break;
                }
                if (maskDigits[i] === '#') {
                    continue;
                }
                else {
                    if (isNaN(parseInt(maskDigits[i]))) {
                        isValid = false;
                        break;
                    }
                    else {
                        if (phoneNumberDigits[i] !== maskDigits[i]) {
                            isValid = false;
                            break;
                        }
                    }
                }
            }
            if (isValid) {
                return true;
            }
        }
    }
    return false;
}
