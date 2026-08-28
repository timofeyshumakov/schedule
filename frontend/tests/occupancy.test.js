import { describe, expect, it } from 'vitest';
import moment from 'moment';
import { CRM_FIELDS } from '../src/config/constants.js';
import { isWeekend } from '../src/domain/calendar.js';
import {
  getRawOccupiedManDays,
  hasUniformOverloadInRange,
  runDynamicLoadSimulation,
  runUniformLoadSimulation,
  simulateOccupancyForRange,
} from '../src/domain/occupancy.js';

function makeDeal({ id, start, end, manDays }) {
  return {
    ID: String(id),
    [CRM_FIELDS.DEAL_START]: start,
    [CRM_FIELDS.DEAL_END]: end,
    [CRM_FIELDS.DEAL_MAN_DAYS]: manDays,
  };
}

const weekendFn = (d) => isWeekend(d, {}, moment);

describe('occupancy', () => {
  it('uniform simulation spreads load across calendar days', () => {
    const deals = [makeDeal({ id: 1, start: '2026-07-13', end: '2026-07-15', manDays: 9 })];
    const caches = runUniformLoadSimulation(deals, '2026-07-13', '2026-07-15', () => 5, moment);
    expect(caches.dynamicRawDemandCache['2026-07-13']).toBe(3);
    expect(caches.occupancyCache['2026-07-13']).toBe(3);
    expect(caches.cacheValid).toBe(true);
  });

  it('detects uniform overload when demand exceeds capacity', () => {
    const deals = [makeDeal({ id: 1, start: '2026-07-13', end: '2026-07-15', manDays: 30 })];
    const overloaded = hasUniformOverloadInRange(
      deals,
      '2026-07-13',
      '2026-07-15',
      () => 2,
      weekendFn,
      moment
    );
    expect(overloaded).toBe(true);
  });

  it('dynamic simulation prioritizes shorter deals', () => {
    const short = makeDeal({ id: 's', start: '2026-07-13', end: '2026-07-13', manDays: 2 });
    const long = makeDeal({ id: 'l', start: '2026-07-13', end: '2026-07-17', manDays: 5 });
    const caches = runDynamicLoadSimulation(
      [short, long],
      '2026-07-13',
      '2026-07-13',
      () => 3,
      weekendFn,
      moment
    );
    expect(caches.occupancyCache['2026-07-13']).toBe(3);
    expect(caches.dynamicRawDemandCache['2026-07-13']).toBeGreaterThan(0);
  });

  it('getRawOccupiedManDays sums uniform daily loads', () => {
    const deals = [makeDeal({ id: 1, start: '2026-07-13', end: '2026-07-14', manDays: 4 })];
    expect(getRawOccupiedManDays(deals, '2026-07-13', null, moment)).toBe(2);
  });

  it('simulateOccupancyForRange picks dynamic when overloaded', () => {
    const deals = [makeDeal({ id: 1, start: '2026-07-13', end: '2026-07-15', manDays: 30 })];
    const caches = simulateOccupancyForRange(
      deals,
      '2026-07-13',
      '2026-07-15',
      () => 2,
      weekendFn,
      moment
    );
    expect(caches.cacheValid).toBe(true);
    expect(caches.occupancyCache['2026-07-13']).toBeLessThanOrEqual(2);
  });
});
