const checkTime = require('../lib/causes').checkTime;
const moment = require('moment');

module.exports = function (req, res, next) {
  if (!sails.config.restocore || !sails.config.restocore.deliveryWorkTime) {
    return next();
  }

  const workTime = sails.config.restocore.deliveryWorkTime;

  if (checkTime(workTime)) {
    return next();
  }

  const todayWorkTime = getWorkTimeForCurrentDay(workTime);
  return res.json({
    message: {
      type: 'info',
      title: 'Не работаем',
      body: 'Доставка работает с ' + todayWorkTime.start + ' до ' + todayWorkTime.stop
    }
  });
};

function getWorkTimeForCurrentDay(timeArray) {
  if (!timeArray || !timeArray.length)
    return {};

  const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const date = moment();

  try {
    const all = timeArray.filter(t => t.dayOfWeek === 'all')[0];
    if (all) {
      return all;
    }

    const today = weekday[date.day()];
    const day = timeArray.filter(t => t.dayOfWeek.toLowerCase() === today)[0];

    if (day) {
      return day;
    }

    return {};
  } catch (e) {
    sails.log.error(e);
    return {};
  }
}
