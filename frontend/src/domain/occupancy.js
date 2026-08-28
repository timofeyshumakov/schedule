/**
 * Симуляция загрузки: равномерная и динамическая.
 */
import { CRM_FIELDS } from '../config/constants';
import {
  dealPeriodBounds,
  getDealCalendarDaysCount,
  getDealDailyManDayLoad,
  getDealWorkDaysCount,
  isDealActiveOnDate,
} from './deals.js';
import { countWorkDaysInPeriod } from './calendar.js';

/**
 * @typedef {object} OccupancyCaches
 * @property {Record<string, number>} occupancyCache
 * @property {Record<string, number>} dynamicRawDemandCache
 * @property {Record<string, number>} availableManDaysCache
 * @property {boolean} cacheValid
 */

export function createEmptyOccupancyCaches() {
  return {
    occupancyCache: {},
    dynamicRawDemandCache: {},
    availableManDaysCache: {},
    cacheValid: false,
  };
}

export function hasUniformOverloadInRange(
  deals,
  rangeStartStr,
  rangeEndStr,
  getAvailableFn,
  isWeekendFn,
  moment,
  fields = CRM_FIELDS
) {
  let cur = moment(rangeStartStr).startOf('day');
  const re = moment(rangeEndStr).startOf('day');
  while (cur.isSameOrBefore(re, 'day')) {
    const dateStr = cur.format('YYYY-MM-DD');
    if (isWeekendFn(dateStr)) {
      cur.add(1, 'day');
      continue;
    }
    const avail = getAvailableFn(dateStr);
    let raw = 0;
    for (const deal of deals) {
      if (!isDealActiveOnDate(deal, dateStr, moment, fields)) continue;
      const W = getDealCalendarDaysCount(deal, moment, fields);
      if (W <= 0) continue;
      raw += getDealDailyManDayLoad(deal, moment, fields);
    }
    if (raw > avail + 1e-6) return true;
    cur.add(1, 'day');
  }
  return false;
}

export function runUniformLoadSimulation(
  deals,
  rangeStartStr,
  rangeEndStr,
  getAvailableFn,
  moment,
  fields = CRM_FIELDS
) {
  const caches = createEmptyOccupancyCaches();
  const rs = moment(rangeStartStr).startOf('day');
  const re = moment(rangeEndStr).startOf('day');
  let cur = rs.clone();

  while (cur.isSameOrBefore(re, 'day')) {
    const dateStr = cur.format('YYYY-MM-DD');
    const available = getAvailableFn(dateStr);
    caches.availableManDaysCache[dateStr] = available;

    let raw = 0;
    for (const deal of deals) {
      if (!isDealActiveOnDate(deal, dateStr, moment, fields)) continue;
      const W = getDealCalendarDaysCount(deal, moment, fields);
      if (W <= 0) continue;
      raw += getDealDailyManDayLoad(deal, moment, fields);
    }
    caches.dynamicRawDemandCache[dateStr] = raw;
    caches.occupancyCache[dateStr] = Math.min(raw, available);
    cur.add(1, 'day');
  }

  caches.cacheValid = true;
  return caches;
}

export function runDynamicLoadSimulation(
  deals,
  rangeStartStr,
  rangeEndStr,
  getAvailableFn,
  isWeekendFn,
  moment,
  fields = CRM_FIELDS
) {
  const caches = createEmptyOccupancyCaches();
  const rs = moment(rangeStartStr).startOf('day');
  const re = moment(rangeEndStr).startOf('day');
  const remainingMD = {};

  for (const deal of deals) {
    const id = String(deal.ID || deal.id);
    const { start, end } = dealPeriodBounds(deal, moment, fields);
    if (!start.isValid() || !end.isValid() || end.isBefore(start, 'day')) continue;
    if (end.isBefore(rs, 'day') || start.isAfter(re, 'day')) continue;
    const W = getDealWorkDaysCount(deal, isWeekendFn, moment, fields);
    if (W <= 0) continue;
    const effStart = moment.max(start, rs);
    const remW = countWorkDaysInPeriod(effStart, end, isWeekendFn);
    remainingMD[id] = deal[fields.DEAL_MAN_DAYS] * (remW / W);
  }

  let cur = rs.clone();
  while (cur.isSameOrBefore(re, 'day')) {
    const dateStr = cur.format('YYYY-MM-DD');
    const available = getAvailableFn(dateStr);
    caches.availableManDaysCache[dateStr] = available;

    if (isWeekendFn(dateStr)) {
      caches.occupancyCache[dateStr] = 0;
      caches.dynamicRawDemandCache[dateStr] = 0;
      cur.add(1, 'day');
      continue;
    }

    const activeDeals = deals
      .filter((d) => isDealActiveOnDate(d, dateStr, moment, fields))
      .sort((a, b) => {
        const wa = getDealWorkDaysCount(a, isWeekendFn, moment, fields);
        const wb = getDealWorkDaysCount(b, isWeekendFn, moment, fields);
        if (wa !== wb) return wa - wb;
        return String(a.ID || a.id).localeCompare(String(b.ID || b.id));
      });

    let remCap = available;
    let rawDemandSum = 0;
    let occupiedSum = 0;

    for (const deal of activeDeals) {
      const id = String(deal.ID || deal.id);
      let rem = remainingMD[id];
      if (rem === undefined || rem <= 0) continue;
      const { end: endDeal } = dealPeriodBounds(deal, moment, fields);
      const remWork = countWorkDaysInPeriod(moment(dateStr).startOf('day'), endDeal, isWeekendFn);
      if (remWork <= 0) continue;
      const ideal = rem / remWork;
      rawDemandSum += ideal;
      const take = Math.min(ideal, remCap);
      occupiedSum += take;
      remainingMD[id] = Math.max(0, rem - take);
      remCap -= take;
    }

    if (remCap > 1e-6) {
      for (let i = activeDeals.length - 1; i >= 0; i--) {
        if (remCap <= 1e-6) break;
        const deal = activeDeals[i];
        const id = String(deal.ID || deal.id);
        const rem = remainingMD[id];
        if (rem === undefined || rem <= 0) continue;
        const extra = Math.min(rem, remCap);
        occupiedSum += extra;
        remainingMD[id] = Math.max(0, rem - extra);
        remCap -= extra;
      }
    }

    caches.dynamicRawDemandCache[dateStr] = rawDemandSum;
    caches.occupancyCache[dateStr] = occupiedSum;
    cur.add(1, 'day');
  }

  caches.cacheValid = true;
  return caches;
}

export function getRawOccupiedManDays(
  deals,
  date,
  caches,
  moment,
  fields = CRM_FIELDS
) {
  const dateStr = moment(date).format('YYYY-MM-DD');
  if (caches && caches.cacheValid && caches.dynamicRawDemandCache[dateStr] !== undefined) {
    return caches.dynamicRawDemandCache[dateStr];
  }
  let totalLoad = 0;
  for (const deal of deals) {
    if (!isDealActiveOnDate(deal, dateStr, moment, fields)) continue;
    const days = getDealCalendarDaysCount(deal, moment, fields);
    if (days <= 0) continue;
    totalLoad += getDealDailyManDayLoad(deal, moment, fields);
  }
  return totalLoad;
}

/**
 * Выбирает равномерную или динамическую симуляцию и возвращает кэши.
 */
export function simulateOccupancyForRange(
  deals,
  rangeStartStr,
  rangeEndStr,
  getAvailableFn,
  isWeekendFn,
  moment,
  fields = CRM_FIELDS
) {
  if (
    hasUniformOverloadInRange(
      deals,
      rangeStartStr,
      rangeEndStr,
      getAvailableFn,
      isWeekendFn,
      moment,
      fields
    )
  ) {
    return runDynamicLoadSimulation(
      deals,
      rangeStartStr,
      rangeEndStr,
      getAvailableFn,
      isWeekendFn,
      moment,
      fields
    );
  }
  return runUniformLoadSimulation(
    deals,
    rangeStartStr,
    rangeEndStr,
    getAvailableFn,
    moment,
    fields
  );
}
