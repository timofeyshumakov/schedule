/**
 * Employee availability and day capacity.
 */

export function isEmployeeTerminated(employee, date, moment) {
  if (!employee.termination_date) return false;
  return moment(date).isAfter(moment(employee.termination_date), 'day');
}

export function isEmployeeHired(employee, date, moment) {
  if (!employee.created_at) return true;
  return moment(date).isSameOrAfter(moment(employee.created_at), 'day');
}

export function isEmployeeAvailableForWork(employee, date, isWeekendFn, moment) {
  const dateStr = moment(date).format('YYYY-MM-DD');
  const dateMoment = moment(dateStr);

  if (employee.created_at && moment(employee.created_at).isAfter(dateMoment, 'day')) {
    return false;
  }
  if (employee.termination_date && moment(employee.termination_date).isBefore(dateMoment, 'day')) {
    return false;
  }

  const status = employee.schedule && employee.schedule[dateStr];
  if (status === 'working') return true;
  if (
    status === 'vacation' ||
    status === 'sick' ||
    status === 'weekend' ||
    status === 'terminated' ||
    status === 'not_hired'
  ) {
    return false;
  }
  return !isWeekendFn(dateStr);
}

export function getAvailableManDays(employees, date, isWeekendFn, moment) {
  const dateStr = moment(date).format('YYYY-MM-DD');
  const availableCount = employees.filter((emp) =>
    isEmployeeAvailableForWork(emp, dateStr, isWeekendFn, moment)
  ).length;
  return Math.max(0, availableCount);
}
