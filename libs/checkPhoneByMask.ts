export const checkPhoneByMask = (
  phoneNumber: string,
  countryCode: string,
  phoneMasks: string[]
): boolean => {
  const cleanedPhoneNumber: string = phoneNumber.replace(/\D/g, '');
  const codeWithoutPlus: string = countryCode.slice(1);

  if (!phoneNumber.startsWith(countryCode)) {
    return false;
  }

  for (const mask of phoneMasks) {
    const maskDigits: string[] = [...mask.replace(/-/g, '')];
    const phoneNumberDigits: string[] = [...cleanedPhoneNumber.slice(codeWithoutPlus.length)];

    if (maskDigits.length === phoneNumberDigits.length) {
      const isValid: boolean = maskDigits.every((maskDigit: string, i: number) => {
        if (isNaN(parseInt(phoneNumberDigits[i]))) {
          return false;
        }
        if (maskDigit === '#') {
          return true;
        } else {
          if (isNaN(parseInt(maskDigit))) {
            return false;
          } else {
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