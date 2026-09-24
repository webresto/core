export function phoneValidByMask(phoneNumber: string, countryCode: string, phoneMasks: string[]): boolean {
  const cleanedPhoneNumber: string = phoneNumber.replace(/\D/g, '');
  const codeWithoutPlus: string = countryCode.slice(1);

  if (!phoneNumber.startsWith(countryCode)) {
    return false;
  }

  for (const mask of phoneMasks) {
    const maskDigits: string[] = mask.replace(/[^\d#]/g, '').split('');
    const phoneNumberDigits: string[] = cleanedPhoneNumber.slice(codeWithoutPlus.length).split('');

    if (maskDigits.length === phoneNumberDigits.length) {
      let isValid: boolean = true;
      for (let i = 0; i < maskDigits.length; i++) {
        if (isNaN(parseInt(phoneNumberDigits[i]))) {
          isValid = false;
          break;
        }
        if (maskDigits[i] === '#') {
          continue;
        } else {
          if (isNaN(parseInt(maskDigits[i]))) {
            isValid = false;
            break;
          } else {
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
