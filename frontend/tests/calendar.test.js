import { describe, expect, it } from 'vitest';
import moment from 'moment';
import {
  countWorkDaysInPeriod,
  createDefaultCalendar,
  isWeekend,
  parseIsDayOffCsv,
} from '../src/domain/calendar.js';

describe('calendar', () => {
  it('marks Saturday and Sunday as weekend without production calendar', () => {
    expect(isWeekend('2026-07-11', {}, moment)).toBe(true);
    expect(isWeekend('2026-07-12', {}, moment)).toBe(true);
    expect(isWeekend('2026-07-13', {}, moment)).toBe(false);
  });

  it('uses production calendar holiday override', () => {
    const productionCalendars = {
      2026: [
        { date: '2026-01-01', type: 'weekend', description: 'Новый год' },
        { date: '2026-01-02', type: 'working', description: 'Рабочий' },
      ],
    };
    expect(isWeekend('2026-01-01', productionCalendars, moment)).toBe(true);
    expect(isWeekend('2026-01-02', productionCalendars, moment)).toBe(false);
  });

  it('counts work days in period excluding weekends', () => {
    const weekendFn = (d) => isWeekend(d, {}, moment);
    expect(countWorkDaysInPeriod(moment('2026-07-13'), moment('2026-07-17'), weekendFn)).toBe(5);
    expect(countWorkDaysInPeriod(moment('2026-07-13'), moment('2026-07-19'), weekendFn)).toBe(5);
  });

  it('createDefaultCalendar marks weekends correctly', () => {
    const cal = createDefaultCalendar(2026, moment);
    expect(cal.find((d) => d.date === '2026-07-11').type).toBe('weekend');
    expect(cal.find((d) => d.date === '2026-07-13').type).toBe('working');
  });

  it('parseIsDayOffCsv falls back when all zeros', () => {
    const zeros = Array(366).fill('0').join(',');
    const cal = parseIsDayOffCsv(2026, zeros, moment);
    expect(cal.find((d) => d.date === '2026-07-11').type).toBe('weekend');
  });
});
