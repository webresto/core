const checkTime = require('./causes').checkTime;

module.exports = function (obj) {
  if (!obj || !obj.additionalInfo) {
    return '';
  }

  try {
    const ai = JSON.parse(obj.additionalInfo);

    if (ai.visible !== undefined)
      if (!ai.visible)
        return 'visible';

    if (ai.workTime) {
      if (!checkTime(ai.workTime)) {
        return 'time';
      }
    }

    if (ai.promo !== undefined)
      if (ai.promo)
        return 'promo';

    if (ai.modifier !== undefined)
      if (ai.modifier)
        return 'modifier';

    return '';
  } catch (e) {
    return '';
  }
};
