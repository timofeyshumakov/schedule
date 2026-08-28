import { describe, expect, it } from 'vitest';
import moment from 'moment';
import { CRM_FIELDS, buildDealCalcFields } from '../src/config/constants.js';
import {
  dealPeriodBounds,
  getDealCalendarDaysCount,
  getDealDailyManDayLoad,
  getDealEndRaw,
  getDealStartRaw,
  getUniformDailyManDayLoad,
  isDealActiveOnDate,
  roundManDays,
} from '../src/domain/deals.js';

function makeDeal({ id = '1', start, end, manDays, confirmedStart, confirmedEnd }) {
  return {
    ID: id,
    [CRM_FIELDS.DEAL_START]: start,
    [CRM_FIELDS.DEAL_END]: end,
    [CRM_FIELDS.DEAL_MAN_DAYS]: manDays,
    [CRM_FIELDS.DEAL_CONFIRMED_START]: confirmedStart,
    [CRM_FIELDS.DEAL_CONFIRMED_END]: confirmedEnd,
  };
}

describe('deals', () => {
  it('dealPeriodBounds and isDealActiveOnDate', () => {
    const deal = makeDeal({ start: '2026-07-01', end: '2026-07-10', manDays: 10 });
    const { start, end } = dealPeriodBounds(deal, moment);
    expect(start.format('YYYY-MM-DD')).toBe('2026-07-01');
    expect(end.format('YYYY-MM-DD')).toBe('2026-07-10');
    expect(isDealActiveOnDate(deal, '2026-07-01', moment)).toBe(true);
    expect(isDealActiveOnDate(deal, '2026-07-10', moment)).toBe(true);
    expect(isDealActiveOnDate(deal, '2026-07-11', moment)).toBe(false);
  });

  it('falls back to confirmed dates when planned are empty', () => {
    const deal = makeDeal({
      start: '',
      end: null,
      manDays: 5,
      confirmedStart: '2026-08-01',
      confirmedEnd: '2026-08-05',
    });
    expect(getDealStartRaw(deal)).toBe('2026-08-01');
    expect(getDealEndRaw(deal)).toBe('2026-08-05');
    expect(dealPeriodBounds(deal, moment).start.format('YYYY-MM-DD')).toBe('2026-08-01');
  });

  it('rounds man-days to 0.1', () => {
    expect(roundManDays(3.333)).toBe(3.3);
    expect(roundManDays(3.35)).toBe(3.4);
  });

  it('uniform daily load 10 MD / 3 days => 3.3', () => {
    expect(getUniformDailyManDayLoad(10, 3)).toBe(3.3);
  });

  it('getDealDailyManDayLoad uses calendar days of period', () => {
    const deal = makeDeal({ start: '2026-07-01', end: '2026-07-03', manDays: 10 });
    expect(getDealCalendarDaysCount(deal, moment)).toBe(3);
    expect(getDealDailyManDayLoad(deal, moment)).toBe(3.3);
  });

  it('buildDealCalcFields maps CRM calc keys', () => {
    const fields = buildDealCalcFields('2026-01-01', '2026-01-10', 5);
    expect(fields[CRM_FIELDS.DEAL_CALC_START]).toBe('2026-01-01');
    expect(fields[CRM_FIELDS.DEAL_CALC_END]).toBe('2026-01-10');
    expect(fields[CRM_FIELDS.DEAL_CALC_MAN_DAYS]).toBe(5);
  });
});
