module.exports = function (obj) {
  if (!obj || !obj.additionalInfo)
    return true;

  try {
    const ai = JSON.parse(obj.additionalInfo);

    if (ai.visible !== undefined)
      if (!ai.visible)
        return false;


    return true;
  } catch (e) {
    return true;
  }
};
