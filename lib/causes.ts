import Cart from "../models/Cart";
import {DirectDistance, Time} from "../modelsHelp/Cause";
import Group from "../models/Group";
import * as moment from "moment";
import {Map} from "../adapter";
import Point from "../adapter/map/Point";
import Condition from "../../checkout/models/Condition";

type customCause = {
  name: string;
  needCart: boolean;
  fn: causeFunc;
};

type causeFunc = (condition: Condition, cart?: Cart) => boolean | Promise<boolean>;

const customCauses: customCause[] = [];

/**
 * Check some condition from some cart
 * @param {string} condition - condition for check
 * @param {object} cart - cart for check
 * @returns {Promise<boolean>}
 */
export default async function causes(condition: Condition, cart: Cart): Promise<boolean> {
  sails.log.debug("##########################################");
  sails.log.debug("start check causes for:", condition.name, cart.id);
  sails.log.info("causes INFO:", JSON.stringify(condition));
  if (!condition.enable){
    sails.log.debug("Condition "+ condition.name+" has not enabled");
    return false;
  }
    

  if (!condition.causes){
    sails.log.debug("Condition "+ condition.name+" not have causes");
    return false;
  }
    

  if (!checkTime(condition.causes.workTime)){
    sails.log.debug("Condition "+ condition.name+" do not work now");
    return false;
  }


  if (condition.causes.directDistance) {
    if (!await checkDistance(cart, condition.causes.directDistance)){
      sails.log.debug("Condition "+ condition.name+" not in distance");
      return false;
    }
  }

  const customCausesWithoutCart = customCauses.filter(c => !c.needCart);
  for (let cause of customCausesWithoutCart) {
    if (condition.causes[cause.name]) {
      if (!await cause.fn(condition))
        return false;
    }
  }

  if (cart) {
    await Cart.count(cart);
    sails.log.debug("Condition "+ condition.name+" check for cart");
    if (condition.causes.cartAmount) {
      if (!between(condition.causes.cartAmount.valueFrom, condition.causes.cartAmount.valueTo, cart.cartTotal)){
        sails.log.debug("Condition "+ condition.name+" not in betwen from:" + condition.causes.cartAmount.valueFrom+" to:"+ condition.causes.cartAmount.valueTo+ " cart:" + cart.cartTotal);
        return false;
      }
      sails.log.debug("Condition "+ condition.name+" not in between",condition.causes.cartAmount)
    }

    if (condition.causes.dishes) {
      const dishes = cart.dishes.filter(d => condition.causes.dishes.includes(d.id));
      if (dishes.length === 0){
        sails.log.debug("Condition "+ condition.name+" empty cart check. Count:"+ dishes.length);
        return false;
      }
    }

    if (condition.causes.groups) {
      const groups1 = new Set<string>();

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
      if (groups.length === 0){
        sails.log.debug("Condition "+ condition.name+" not have dishes from groups", dishGroups);
        return false;
      }

    }

    const customCausesWithCart = customCauses.filter(c => c.needCart);
    for (let cause of customCausesWithCart) {
      if (condition.causes[cause.name]) {
        if (!await cause.fn(condition, cart))
          return false;
      }
    }

    sails.log.debug("finish check causes for:", condition.name, JSON.stringify(cart));
    sails.log.debug("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^");
    return true;
  } else {
    return true;
  }
}

/**
 * Add new cause in custom causes
 * @param name - cause name
 * @param needCart - if true in fn will be cart as second param
 * @param fn - call back to check cause in condition and cart
 */
export function addCauseByFields(name: string, needCart: boolean, fn: causeFunc): void {
  customCauses.push({name, needCart, fn});
}

/**
 * Add new cause in custom causes
 * @param cause - new cause object
 */
export function addCause(cause: customCause): void {
  customCauses.push(cause);
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
export function checkTime(timeArray: Time[]): boolean {
  if (!timeArray || !timeArray.length)
    return true;

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
      return checkHours(all.start, all.end)
    }

    const today = Weekdays[date.day()];
    const day = timeArray.filter(t => t.dayOfWeek.toLowerCase() === today || t.daysOfWeek.map(d => d.toLowerCase()).includes(today))[0];

    if (day) {
      return checkHours(day.start, day.end);
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
export function between(from: number, to: number, a: number): boolean {
  return ((!from && !to) || (!from && to >= a) || (!to && from < a) || (from < a && to >= a));
}

/**
 * Check distance between cart address and data DirectDistance info
 * @param cart
 * @param data
 */
export async function checkDistance(cart: Cart, data: DirectDistance): Promise<boolean> {
  if (!cart)
    return true;
  if (!cart.address)
    return false;

  const config = await SystemInfo.use('map');
  const adapterGeo = new (Map.getAdapter(config.geocode.toLowerCase()))(config);
  const geo = await adapterGeo.getGeocode(cart.address.street, cart.address.home);

  const adapterDistance = new (Map.getAdapter(config.distance.toLowerCase()))(config);
  const distance = adapterDistance.getDistance(geo, new Point(data.center[0], data.center[1]));

  return distance < data.to && distance > data.from;
}

export enum Weekdays {
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
}