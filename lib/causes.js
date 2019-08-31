const moment = require('moment');
const MapAdapter = require('../adapter/index').Map;
const Point = require('../adapter/map/core/Point').default;

/**
 * Check some condition from some cart
 * @param {string} condition - condition for check
 * @param {object} cart - cart for check
 * @returns {Promise<boolean>}
 */
function causes(condition, cart) {
  return new Promise(async (resolve, reject) => {
    if (!condition.enable)
      return resolve(false);

    if (!condition.causes)
      return resolve(true);

    if (!checkTime(condition.causes.workTime))
      return resolve(false);

    if (!await checkDistance(cart, condition.causes.directDistance))
      return resolve(false);

    if (cart) {
      cart.count(cart, async err => {
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
          const groups1 = new Set();

          const dishGroups = cart.dishes.map(d => d.dish.parentGroup.id);
          for (let i in dishGroups) {
            if (dishGroups.hasOwnProperty(i)) {
              let groupId = dishGroups[i];
              let group = await Group.find(groupId);
              for (let j in group) {
                if (group.hasOwnProperty(j)) {
                  groups1.add(group[j].id);
                  while (group[j].parentGroup) {
                    group = await Group.find(group[j].parentGroup);
                    for (let j in group) {
                      if (group.hasOwnProperty(j)) {
                        groups1.add(group[j].id);
                      }
                    }
                  }
                }
              }
            }
          }

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

/**
 * Check that current time is in time of paras
 * @param {array} timeArray
 * @example
 * timeArray: [
 *  {
 *    dayOfWeek: 'monday',
 *    start: '8:00',
 *    end: '18:00'
 *  },
 *  {...}
 * ]
 * @returns {boolean}
 */
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

      const startTime = sh * 60 + sm;
      const endTime = eh * 60 + em;

      return startTime < endTime ? between(startTime, endTime, date.hours() * 60 + date.minutes())
        : startTime > endTime ? !between(endTime, startTime, date.hours() * 60 + date.minutes()) :
          true;
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

/**
 * Check that in (a,b,c) c is between a and b
 * @param {number} [from] is a
 * @param {number} [to] is b
 * @param {number} [a] is c
 * @returns {boolean}
 */
function between(from, to, a) {
  return ((!from && !to) || (!from && to >= a) || (!to && from < a) || (from < a && to >= a));
}

async function checkDistance(cart, data) {
  if (!cart)
    return true;
  if (!cart.address)
    return false;

  sails.log.info(cart.address);

  const config = sails.config.restocore.map;
  const adapterGeo = new (MapAdapter.getAdapter(config.geocode.toLowerCase()))(config);

  const geo = await adapterGeo.getGeocode(cart.address.street.name, cart.address.home);
  sails.log.info(geo);

  const adapterDistance = new (MapAdapter.getAdapter(config.distance.toLowerCase()))(config);

  const distance = adapterDistance.getDistance(geo, new Point(data.center[0], data.center[1]));
  sails.log.info(distance, data.to, data.from, distance < data.to && distance > data.from);
  return distance < data.to && distance > data.from;
}

module.exports = causes;
module.exports.checkTime = checkTime;
module.exports.between = between;
module.exports.checkDistance = checkDistance;
