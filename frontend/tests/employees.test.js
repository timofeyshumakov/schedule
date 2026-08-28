import { describe, expect, it } from 'vitest';
import moment from 'moment';
import { isWeekend } from '../src/domain/calendar.js';
import {
  getAvailableManDays,
  isEmployeeAvailableForWork,
  isEmployeeHired,
  isEmployeeTerminated,
} from '../src/domain/employees.js';

const weekendFn = (d) => isWeekend(d, {}, moment);

describe('employees', () => {
  it('detects not hired and terminated', () => {
    const emp = {
      created_at: '2026-06-01',
      termination_date: '2026-07-10',
      schedule: {},
    };
    expect(isEmployeeHired(emp, '2026-05-31', moment)).toBe(false);
    expect(isEmployeeHired(emp, '2026-06-01', moment)).toBe(true);
    expect(isEmployeeTerminated(emp, '2026-07-10', moment)).toBe(false);
    expect(isEmployeeTerminated(emp, '2026-07-11', moment)).toBe(true);
  });

  it('vacation makes employee unavailable', () => {
    const emp = {
      created_at: '2026-01-01',
      termination_date: null,
      schedule: { '2026-07-13': 'vacation' },
    };
    expect(isEmployeeAvailableForWork(emp, '2026-07-13', weekendFn, moment)).toBe(false);
  });

  it('explicit working on weekend counts as available', () => {
    const emp = {
      created_at: '2026-01-01',
      termination_date: null,
      schedule: { '2026-07-11': 'working' },
    };
    expect(isWeekend('2026-07-11', {}, moment)).toBe(true);
    expect(isEmployeeAvailableForWork(emp, '2026-07-11', weekendFn, moment)).toBe(true);
  });

  it('getAvailableManDays matches available employees', () => {
    const employees = [
      { created_at: '2026-01-01', termination_date: null, schedule: { '2026-07-13': 'vacation' } },
      { created_at: '2026-01-01', termination_date: null, schedule: {} },
      { created_at: '2026-06-01', termination_date: null, schedule: { '2026-07-13': 'working' } },
    ];
    expect(getAvailableManDays(employees, '2026-07-13', weekendFn, moment)).toBe(2);
  });
});
