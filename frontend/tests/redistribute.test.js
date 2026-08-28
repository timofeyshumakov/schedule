import { describe, expect, it } from 'vitest';
import moment from 'moment';
import { CRM_FIELDS } from '../src/config/constants.js';
import { isWeekend } from '../src/domain/calendar.js';
import {
  buildDealEndUpdates,
  filterOverloadedDaysForDeal,
  getDealOverloadShare,
  proposeExtendedEndDate,
} from '../src/domain/redistribute.js';

function makeDeal({ id, start, end, manDays }) {
  return {
    ID: String(id),
    [CRM_FIELDS.DEAL_START]: start,
    [CRM_FIELDS.DEAL_END]: end,
    [CRM_FIELDS.DEAL_MAN_DAYS]: manDays,
  };
}

const weekendFn = (d) => isWeekend(d, {}, moment);

describe('redistribute', () => {
  it('filterOverloadedDaysForDeal keeps only days of target deal', () => {
    const current = makeDeal({ id: '10', start: '2026-07-13', end: '2026-07-15', manDays: 9 });
    const other = makeDeal({ id: '20', start: '2026-07-20', end: '2026-07-22', manDays: 3 });
    const filtered = filterOverloadedDaysForDeal(
      [
        { date: '2026-07-14', overload: 2 },
        { date: '2026-07-21', overload: 1 },
      ],
      [current, other],
      '10',
      moment
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].date).toBe('2026-07-14');
  });

  it('getDealOverloadShare caps by daily load of current deal', () => {
    const deal = makeDeal({ id: '1', start: '2026-07-13', end: '2026-07-15', manDays: 9 });
    expect(getDealOverloadShare({ overload: 10 }, deal, moment)).toBe(3);
    expect(getDealOverloadShare({ overload: 1 }, deal, moment)).toBe(1);
  });

  it('proposeExtendedEndDate extends when free space is only after current end', () => {
    const freeMap = { '2026-07-16': 0, '2026-07-17': 2 };
    const result = proposeExtendedEndDate({
      overloadDate: '2026-07-13',
      overloadAmount: 2,
      currentDealEnd: '2026-07-15',
      getFreeSpace: (d) => freeMap[d] ?? 0,
      isWeekendFn: weekendFn,
      moment,
    });
    expect(result.proposedEnd).toBe('2026-07-17');
    expect(result.remaining).toBe(0);
    expect(result.daysUsed).toBeGreaterThan(0);
  });

  it('proposeExtendedEndDate returns null when overload fits inside current end', () => {
    const result = proposeExtendedEndDate({
      overloadDate: '2026-07-13',
      overloadAmount: 1,
      currentDealEnd: '2026-07-20',
      getFreeSpace: (d) => (weekendFn(d) ? 0 : 5),
      isWeekendFn: weekendFn,
      moment,
    });
    expect(result.remaining).toBe(0);
    expect(result.proposedEnd).toBeNull();
  });

  it('buildDealEndUpdates only updates deals that need later end', () => {
    const deal = makeDeal({ id: '5', start: '2026-07-01', end: '2026-07-10', manDays: 5 });
    expect(buildDealEndUpdates([deal], '2026-07-20', moment)).toEqual([
      { dealId: '5', oldEnd: '2026-07-10', newEnd: '2026-07-20' },
    ]);
    expect(buildDealEndUpdates([deal], '2026-07-05', moment)).toEqual([]);
  });
});
