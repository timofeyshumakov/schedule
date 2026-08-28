/**
 * Чистая логика перераспределения перегрузки (без Bitrix I/O).
 */
import { APP_CONFIG, CRM_FIELDS } from '../config/constants';
import { getDealDailyManDayLoad, isDealActiveOnDate } from './deals.js';

/**
 * Дни с перегрузкой, в которых участвует указанная сделка.
 */
export function filterOverloadedDaysForDeal(overloadedDays, deals, placementDealId, moment, fields = CRM_FIELDS) {
  return overloadedDays.filter((od) =>
    deals.some((deal) => {
      if (String(deal.ID || deal.id) !== String(placementDealId)) return false;
      return isDealActiveOnDate(deal, od.date, moment, fields);
    })
  );
}

/**
 * Доля перегрузки, которую можно перенести по текущей сделке.
 */
export function getDealOverloadShare(overloadedDay, targetDeal, moment, fields = CRM_FIELDS) {
  const targetDaily = getDealDailyManDayLoad(targetDeal, moment, fields);
  return Math.min(overloadedDay.overload, targetDaily);
}

/**
 * Поглощает перегрузку в свободные дни вперёд; возвращает предлагаемую дату окончания.
 *
 * @param {object} opts
 * @param {string} opts.overloadDate — день перегрузки YYYY-MM-DD
 * @param {number} opts.overloadAmount
 * @param {string} opts.currentDealEnd — текущая дата окончания сделки
 * @param {(dateStr: string) => number} opts.getFreeSpace — свободные ЧД на дату
 * @param {(dateStr: string) => boolean} opts.isWeekendFn
 * @param {number} [opts.maxExtensionDays]
 * @param {typeof import('moment')} opts.moment
 * @returns {{ proposedEnd: string|null, absorbed: number, remaining: number, daysUsed: number }}
 */
export function proposeExtendedEndDate({
  overloadDate,
  overloadAmount,
  currentDealEnd,
  getFreeSpace,
  isWeekendFn,
  maxExtensionDays = APP_CONFIG.REDISTRIBUTE_MAX_EXTENSION_DAYS,
  moment,
}) {
  let searchDate = moment(overloadDate).startOf('day').add(1, 'day');
  let remaining = overloadAmount;
  let daysUsed = 0;
  const minDealEnd = moment(currentDealEnd).startOf('day');

  const absorbOneDay = () => {
    const searchDateStr = searchDate.format('YYYY-MM-DD');
    if (!isWeekendFn(searchDateStr)) {
      const freeSpace = Math.max(0, getFreeSpace(searchDateStr));
      if (freeSpace > 0) {
        const canFit = Math.min(remaining, freeSpace);
        remaining -= canFit;
        daysUsed++;
      }
    }
    searchDate.add(1, 'day');
  };

  let phase1Steps = 0;
  while (
    remaining > 0 &&
    searchDate.isSameOrBefore(minDealEnd, 'day') &&
    phase1Steps < maxExtensionDays
  ) {
    absorbOneDay();
    phase1Steps++;
  }

  let phase2Steps = 0;
  while (remaining > 0 && phase2Steps < maxExtensionDays) {
    absorbOneDay();
    phase2Steps++;
  }

  if (daysUsed <= 0) {
    return {
      proposedEnd: null,
      absorbed: overloadAmount - remaining,
      remaining,
      daysUsed: 0,
    };
  }

  const proposedEnd = searchDate.clone().subtract(1, 'day').startOf('day');
  const dealEnd = moment(currentDealEnd).startOf('day');
  const newEndMoment = moment.max(dealEnd, proposedEnd);

  return {
    proposedEnd: newEndMoment.isAfter(dealEnd, 'day')
      ? newEndMoment.format('YYYY-MM-DD')
      : null,
    absorbed: overloadAmount - remaining,
    remaining,
    daysUsed,
  };
}

/**
 * Собирает обновления дат только для указанной сделки (чужие не трогаем).
 *
 * @returns {Array<{ dealId: string, oldEnd: string, newEnd: string }>}
 */
export function buildDealEndUpdates(dealsToExtend, proposedEndStr, moment, fields = CRM_FIELDS) {
  if (!proposedEndStr) return [];
  const proposedEnd = moment(proposedEndStr).startOf('day');
  const updates = [];

  for (const deal of dealsToExtend) {
    const dealId = String(deal.ID || deal.id);
    const dealEnd = moment(deal[fields.DEAL_END]).startOf('day');
    const newEndMoment = moment.max(dealEnd, proposedEnd);
    if (!newEndMoment.isAfter(dealEnd, 'day')) continue;
    updates.push({
      dealId,
      oldEnd: dealEnd.format('YYYY-MM-DD'),
      newEnd: newEndMoment.format('YYYY-MM-DD'),
    });
  }

  return updates;
}
