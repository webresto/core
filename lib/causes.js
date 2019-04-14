const moment = require('moment');

function causes(condition, cart) {
  return new Promise(async (resolve, reject) => {
    if (!condition.enable)
      return resolve(false);

    if (!condition.causes)
      return resolve(true);

    if (!checkTime(condition.causes.workTime))
      return resolve(false);

    if (cart) {
      cart.count(cart, err => {
        if (err) return reject(err);

        if (condition.causes.cartAmount)
          if (!between(condition.causes.cartAmount.valueFrom, condition.causes.cartAmount.valueTo, cart.cartTotal))
            return resolve(false);

        if (condition.causes.dishes) {
          const dishes = cart.dishes.filter(d => condition.causes.dishes.includes(d.id));
          if (dishes.length === 0)
            return resolve(false);
        }
        if (condition.causes.groups) {
          const dishGroups = cart.dishes.map(d => d.dish.parentGroup);
          const groups = dishGroups.filter(g => condition.causes.groups.includes(g));
          if (groups.length === 0)
            return resolve(false);
        }

        return resolve(true);
      });
    } else {
      return resolve(true);
    }
  });
}

function checkTime(timeArray) {
  if (!timeArray || !timeArray.length)
    return true;

  const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const date = moment();

  // sails.log.info(date);

  function checkHours(start, stop) {
    try {
      start = start.split(':');
    } catch (e) {
    }
    try {
      stop = stop.split(':');
    } catch (e) {
    }
    try {
      const sh = start ? parseInt(start[0]) : start;
      const sm = start ? parseInt(start[1]) : start;
      const eh = stop ? parseInt(stop[0]) : stop;
      const em = stop ? parseInt(stop[1]) : stop;
      return between(sh * 60 + sm, eh * 60 + em, date.hours() * 60 + date.minutes());
    } catch (e) {
      return true;
    }
  }

  try {
    const all = timeArray.filter(t => t.dayOfWeek === 'all')[0];
    if (all) {
      return checkHours(all.start, all.stop)
    }

    const today = weekday[date.day()];
    const day = timeArray.filter(t => t.dayOfWeek.toLowerCase() === today)[0];

    if (day) {
      return checkHours(day.start, day.stop);
    }

    return timeArray.length === 0;
  } catch (e) {
    sails.log.error(e);
    return false;
  }
}

function between(from, to, a) {
  return ((!from && !to) || (!from && to > a) || (!to && from < a) || (from < a && to > a));
}

module.exports = causes;
module.exports.checkTime = checkTime;
module.exports.between = between;
