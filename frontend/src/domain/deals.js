/**
 * Периоды сделок и равномерная дневная нагрузка ЧД.
 */
import { APP_CONFIG, CRM_FIELDS } from '../config/constants';
import { countWorkDaysInPeriod } from './calendar.js';

function isFilledDealField(value) {
  return value != null && value !== '' && value !== false;
}

export function getDealStartRaw(deal, fields = CRM_FIELDS) {
  const planned = deal[fields.DEAL_START];
  if (isFilledDealField(planned)) return planned;
  return deal[fields.DEAL_CONFIRMED_START];
}

export function getDealEndRaw(deal, fields = CRM_FIELDS) {
  const planned = deal[fields.DEAL_END];
  if (isFilledDealField(planned)) return planned;
  return deal[fields.DEAL_CONFIRMED_END];
}

export function dealPeriodBounds(deal, moment, fields = CRM_FIELDS) {
  return {
    start: moment(getDealStartRaw(deal, fields)).startOf('day'),
    end: moment(getDealEndRaw(deal, fields)).startOf('day'),
  };
}

export function isDealActiveOnDate(deal, dateStr, moment, fields = CRM_FIELDS) {
  const d = moment(dateStr).startOf('day');
  const { start, end } = dealPeriodBounds(deal, moment, fields);
  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return false;
  return !d.isBefore(start) && !d.isAfter(end);
}

export function getDealCalendarDaysCount(deal, moment, fields = CRM_FIELDS) {
  const { start, end } = dealPeriodBounds(deal, moment, fields);
  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return 0;
  return end.diff(start, 'days') + 1;
}

export function getDealWorkDaysCount(deal, isWeekendFn, moment, fields = CRM_FIELDS) {
  const { start, end } = dealPeriodBounds(deal, moment, fields);
  if (!start.isValid() || !end.isValid() || end.isBefore(start)) return 0;
  return countWorkDaysInPeriod(start, end, isWeekendFn);
}

export function roundManDays(value, decimals = APP_CONFIG.MAN_DAYS_DECIMALS ?? 1) {
  const factor = Math.pow(10, decimals);
  return Math.round(Number(value) * factor) / factor;
}

/** Равномерная дневная нагрузка: ЧД / число дней делителя, округление до 0.1 */
export function getUniformDailyManDayLoad(manDays, daysCount, decimals = APP_CONFIG.MAN_DAYS_DECIMALS ?? 1) {
  if (daysCount <= 0) return 0;
  return roundManDays(manDays / daysCount, decimals);
}

/** Дневная нагрузка сделки: ЧД / календарные дни периода */
export function getDealDailyManDayLoad(deal, moment, fields = CRM_FIELDS) {
  return getUniformDailyManDayLoad(
    deal[fields.DEAL_MAN_DAYS],
    getDealCalendarDaysCount(deal, moment, fields)
  );
}
